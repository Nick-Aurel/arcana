use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{Manager, RunEvent, Url};
use tauri::path::BaseDirectory;

const SERVER_PORT: u16 = 47821;
const SERVER_HOST: &str = "127.0.0.1";

struct ServerProcess(Mutex<Option<Child>>);

fn server_url() -> String {
  format!("http://{SERVER_HOST}:{SERVER_PORT}")
}

fn wait_for_port(timeout: Duration) -> bool {
  let addr = format!("{SERVER_HOST}:{SERVER_PORT}");
  let start = Instant::now();
  while start.elapsed() < timeout {
    if TcpStream::connect_timeout(
      &addr.parse().expect("valid socket addr"),
      Duration::from_millis(200),
    )
    .is_ok()
    {
      return true;
    }
    std::thread::sleep(Duration::from_millis(150));
  }
  false
}

fn resolve_db_url(app: &tauri::AppHandle) -> Result<String, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("app data dir: {e}"))?;
  std::fs::create_dir_all(&dir).map_err(|e| format!("create app data dir: {e}"))?;
  let db_path = dir.join("arcana.db");
  Ok(format!("file:{}", db_path.display()))
}

fn resolve_resource(app: &tauri::AppHandle, rel: &str) -> Result<PathBuf, String> {
  app
    .path()
    .resolve(rel, BaseDirectory::Resource)
    .map_err(|e| format!("resolve resource {rel}: {e}"))
}

#[cfg(unix)]
fn kill_process_group(child: &mut Child) {
  let pid = child.id() as i32;
  unsafe {
    libc::killpg(pid, libc::SIGTERM);
  }
  let _ = child.wait();
}

#[cfg(not(unix))]
fn kill_process_group(child: &mut Child) {
  let _ = child.kill();
  let _ = child.wait();
}

fn spawn_next_server(app: &tauri::AppHandle) -> Result<Child, String> {
  let db_url = resolve_db_url(app)?;
  let node = resolve_resource(app, "node")?;
  let launch_js = resolve_resource(app, "arcana-server/launch.js")?;
  let app_dir = resolve_resource(app, "arcana-server")?;

  if !node.exists() {
    return Err(format!("bundled Node missing at {}", node.display()));
  }
  if !launch_js.exists() {
    return Err(format!("server launcher missing at {}", launch_js.display()));
  }

  let ollama_base =
    std::env::var("OLLAMA_BASE_URL").unwrap_or_else(|_| "http://127.0.0.1:11434".into());
  let ollama_model =
    std::env::var("OLLAMA_MODEL").unwrap_or_else(|_| "qwen2.5:7b".into());

  let mut cmd = Command::new(&node);
  cmd
    .arg(&launch_js)
    .current_dir(&app_dir)
    .env("PORT", SERVER_PORT.to_string())
    .env("HOSTNAME", SERVER_HOST)
    .env("DATABASE_URL", &db_url)
    .env("OLLAMA_BASE_URL", ollama_base)
    .env("OLLAMA_MODEL", ollama_model)
    .stdout(Stdio::null())
    .stderr(Stdio::piped());

  #[cfg(unix)]
  unsafe {
    use std::os::unix::process::CommandExt;
    cmd.pre_exec(|| {
      // Own process group so force-quit can kill the whole tree.
      if libc::setpgid(0, 0) != 0 {
        return Err(std::io::Error::last_os_error());
      }
      Ok(())
    });
  }

  cmd.spawn().map_err(|e| format!("spawn Next server: {e}"))
}

fn navigate_to_server(app: &tauri::AppHandle) -> Result<(), String> {
  let window = app
    .get_webview_window("main")
    .ok_or_else(|| "main window missing".to_string())?;
  let url = Url::parse(&server_url()).map_err(|e| format!("parse url: {e}"))?;
  window
    .navigate(url)
    .map_err(|e| format!("navigate: {e}"))?;
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(ServerProcess(Mutex::new(None)))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
        // Dev: `beforeDevCommand` already runs `next dev`; webview uses devUrl.
        return Ok(());
      }

      let handle = app.handle().clone();
      std::thread::spawn(move || {
        match spawn_next_server(&handle) {
          Ok(child) => {
            {
              let state = handle.state::<ServerProcess>();
              *state.0.lock().expect("server mutex") = Some(child);
            }
            if wait_for_port(Duration::from_secs(45)) {
              if let Err(err) = navigate_to_server(&handle) {
                log::error!("failed to navigate to Arcana server: {err}");
              }
            } else {
              log::error!(
                "Arcana server did not become ready on {SERVER_HOST}:{SERVER_PORT}"
              );
            }
          }
          Err(err) => log::error!("failed to start Arcana server: {err}"),
        }
      });

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      if let RunEvent::Exit = event {
        let mut child = {
          let state = app_handle.state::<ServerProcess>();
          let mut guard = state.0.lock().expect("server mutex");
          guard.take()
        };
        if let Some(child) = child.as_mut() {
          kill_process_group(child);
        }
      }
    });
}
