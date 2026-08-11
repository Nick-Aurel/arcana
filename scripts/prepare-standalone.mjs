#!/usr/bin/env node
/**
 * After `next build`, stage the standalone server + bundled Node for Tauri:
 * - copy static/public into standalone
 * - ensure better-sqlite3 (and deps) native bindings are present
 * - write resources under src-tauri/resources/
 * - bundle a Node binary that matches the host ABI (copy process.execPath)
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const publicSrc = path.join(root, "public");
const resourcesDir = path.join(root, "src-tauri", "resources");
const serverResource = path.join(resourcesDir, "arcana-server");

function cpRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    // Keep relative symlinks (Next hashes externals as better-sqlite3-<hash> → ../../node_modules/...)
    verbatimSymlinks: true,
  });
}

/** Next standalone expects .next/node_modules/better-sqlite3-<hash> */
function repairSqliteSymlinks(serverRoot) {
  const hashedDir = path.join(serverRoot, ".next", "node_modules");
  if (!fs.existsSync(hashedDir)) {
    fs.mkdirSync(hashedDir, { recursive: true });
  }
  const target = path.join(serverRoot, "node_modules", "better-sqlite3");
  if (!fs.existsSync(target)) {
    console.warn("warn: better-sqlite3 missing under standalone node_modules");
    return;
  }

  const hashNames = new Set(
    fs
      .readdirSync(hashedDir)
      .filter((name) => name.startsWith("better-sqlite3-")),
  );
  const buildHashDir = path.join(root, ".next", "node_modules");
  if (fs.existsSync(buildHashDir)) {
    for (const name of fs.readdirSync(buildHashDir)) {
      if (name.startsWith("better-sqlite3-")) hashNames.add(name);
    }
  }

  for (const name of hashNames) {
    const linkPath = path.join(hashedDir, name);
    fs.rmSync(linkPath, { recursive: true, force: true });
    // Real directory copy survives Tauri resource bundling (symlinks often break).
    fs.cpSync(target, linkPath, { recursive: true, force: true });
    console.log("Staged external", name);
  }
}

function hostTripleFallback() {
  const platform = os.platform();
  const arch = os.arch();
  if (platform === "darwin" && arch === "arm64") return "aarch64-apple-darwin";
  if (platform === "darwin" && arch === "x64") return "x86_64-apple-darwin";
  return `${arch}-${platform}`;
}

if (os.platform() !== "darwin") {
  console.error("Bundled desktop resources are macOS-only for v1.");
  process.exit(1);
}

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error(
    "Missing .next/standalone/server.js — run `next build` first (with output: 'standalone').",
  );
  process.exit(1);
}

cpRecursive(staticSrc, path.join(standalone, ".next", "static"));
cpRecursive(publicSrc, path.join(standalone, "public"));

const bsqliteSrc = path.join(root, "node_modules", "better-sqlite3");
const bsqliteDest = path.join(standalone, "node_modules", "better-sqlite3");
if (fs.existsSync(bsqliteSrc)) {
  cpRecursive(bsqliteSrc, bsqliteDest);
  for (const dep of ["bindings", "file-uri-to-path"]) {
    const src = path.join(root, "node_modules", dep);
    if (fs.existsSync(src)) {
      cpRecursive(src, path.join(standalone, "node_modules", dep));
    }
  }
} else {
  console.warn("warn: better-sqlite3 not found in node_modules");
}

fs.rmSync(serverResource, { recursive: true, force: true });
cpRecursive(standalone, serverResource);
repairSqliteSymlinks(serverResource);
repairSqliteSymlinks(standalone);

const launcher = `#!/usr/bin/env node
const path = require("node:path");
const appDir = path.join(__dirname);
process.chdir(appDir);
process.env.PORT = process.env.PORT || "47821";
process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";
require(path.join(appDir, "server.js"));
`;
fs.writeFileSync(path.join(serverResource, "launch.js"), launcher);

// Copy the same Node that compiled better-sqlite3 so ABIs match.
const nodeDest = path.join(resourcesDir, "node");
fs.mkdirSync(resourcesDir, { recursive: true });
fs.copyFileSync(process.execPath, nodeDest);
fs.chmodSync(nodeDest, 0o755);
console.log("Bundled Node →", nodeDest, `(${process.version})`);

// Sanity-check native module against bundled Node
try {
  execFileSync(
    nodeDest,
    [
      "-e",
      `require(${JSON.stringify(path.join(serverResource, "node_modules", "better-sqlite3"))}); console.log("better-sqlite3 ok");`,
    ],
    { stdio: "inherit" },
  );
} catch {
  console.error(
    "better-sqlite3 failed to load with the bundled Node. Run `npm rebuild better-sqlite3` and retry.",
  );
  process.exit(1);
}

let triple = process.env.TAURI_ENV_TARGET_TRIPLE || "";
try {
  triple = execSync("rustc --print host-tuple", { encoding: "utf8" }).trim();
} catch {
  triple = hostTripleFallback();
}

fs.writeFileSync(
  path.join(resourcesDir, "meta.json"),
  JSON.stringify(
    {
      preparedAt: new Date().toISOString(),
      hostTriple: triple || null,
      port: 47821,
      nodeVersion: process.version,
      nodePath: process.execPath,
    },
    null,
    2,
  ) + "\n",
);

console.log("Standalone staged at", serverResource);
