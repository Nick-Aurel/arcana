# Arcana

**Arcana** is a local-first, Notion-like notes app with free AI. It runs on your machine, stores notes in SQLite, and talks to [Ollama](https://ollama.com) so you get summarize / rewrite / ask / bullets / checklist **without a paid AI subscription**.

> Own your notes. Own your models. No cloud AI bill.

---

## Features (MVP)

- **Pages** — create, rename, delete, nest under a parent
- **Block editor** — headings, paragraphs, bullets, numbered lists, checklists, code (BlockNote)
- **Local AI** (via Ollama):
  - Summarize a page
  - Rewrite clearer / tighter
  - Ask a question about the page
  - Turn content into bullets
  - Turn content into a checklist
- **Private by default** — data in `data/arcana.db`; inference on localhost

**Not in MVP:** databases, multiplayer, cloud sync, auth, mobile, ask-across-all-notes (RAG).

---

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System map, stack, data model, APIs, AI contracts (+ charts) |
| [docs/MVP_ROADMAP.md](./docs/MVP_ROADMAP.md) | Phased checklist + Gantt / progress charts |
| [docs/notion-architecture.md](./docs/notion-architecture.md) | Notion architecture study (+ charts) |
| [docs/canvases/](./docs/canvases/) | Interactive Cursor canvas sources (versioned) |

Open the canvases beside chat in Cursor (Recent → canvas), or copy from `docs/canvases/` if missing — see [docs/canvases/README.md](./docs/canvases/README.md).

---

## Prerequisites

- **Node.js** 20+ (18+ may work; 20+ recommended)
- **npm** (or pnpm/yarn)
- **[Ollama](https://ollama.com)** installed and running locally
- **Desktop (macOS):** Rust (`rustup`), Xcode Command Line Tools

### Install Ollama and a model

```bash
# macOS (Homebrew) or see https://ollama.com/download
brew install ollama
ollama serve          # if not already running as a service

# Recommended default
ollama pull qwen2.5:7b

# Lighter fallback for smaller machines
ollama pull llama3.2:3b
```

Other good options: `mistral`, `gemma2:9b`, `phi3`, `deepseek-r1:8b`. See [ARCHITECTURE.md](./docs/ARCHITECTURE.md#recommended-open-models).

---

## Quick start

```bash
git clone https://github.com/Nick-Aurel/arcana.git
cd arcana
cp .env.example .env
npm install
npm run db:push      # create SQLite schema
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Ensure Ollama is up (`ollama list` should show your model).

---

## Desktop (macOS)

Arcana can run as a native window via **Tauri**. The shell starts the existing Next.js server as a local sidecar (notes + AI stay on your machine). Ollama is still a separate install.

### One-time setup

```bash
# Rust toolchain (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Xcode CLT (if needed)
xcode-select --install
```

### Dev (Tauri window + `next dev`)

```bash
npm run desktop:dev
```

### Production `.app`

```bash
npm run desktop:build
```

The app lands under `src-tauri/target/release/bundle/macos/Arcana.app`.

| | Path |
|---|---|
| Notes DB (desktop) | `~/Library/Application Support/com.arcana.desktop/arcana.db` |
| Notes DB (`npm run dev`) | `data/arcana.db` in the repo |
| Sidecar port | `127.0.0.1:47821` |

Code signing / notarization is not configured yet — fine for local use; required if you distribute the `.app`.

---

## Environment

Copy `.env.example` → `.env`:

```bash
DATABASE_URL=file:./data/arcana.db
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
```

| Variable | Default | Meaning |
|----------|---------|---------|
| `DATABASE_URL` | `file:./data/arcana.db` | SQLite path (Drizzle) |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama HTTP API |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Model name as in `ollama list` |

---

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run db:push` | Push Drizzle schema to SQLite |
| `npm run db:studio` | Open Drizzle Studio (optional) |
| `npm run build:desktop` | Next standalone + stage Tauri resources |
| `npm run desktop:dev` | Tauri window against `next dev` |
| `npm run desktop:build` | Build `Arcana.app` |

---

## Project structure

```
arcana/
├── docs/                 # Architecture, roadmap, Notion study
├── data/                 # SQLite DB (gitignored)
├── drizzle/              # SQL migrations (if generated)
├── sidecar-ui/           # Loading page while the desktop server starts
├── src-tauri/            # Tauri shell (Rust) + staged resources
├── scripts/              # prepare-standalone.mjs (desktop packaging)
├── src/
│   ├── app/              # Routes + API
│   ├── components/       # Sidebar, editor, AI panel
│   ├── db/               # Drizzle client + schema
│   └── lib/              # Ollama client, prompts
├── .env.example
└── package.json
```

---

## How AI works

1. You write in the BlockNote editor.
2. Open the AI panel and pick an action (for **Ask**, type a question).
3. Arcana sends page text to `POST /api/ai`.
4. The server prompts Ollama on your machine and **streams** the answer back.
5. Insert the result into the page when you like it — Arcana never overwrites silently.

If Ollama is stopped or the model is missing, the UI shows an error with what to run (`ollama serve`, `ollama pull …`).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| AI panel: connection failed | Start Ollama (`ollama serve` or open the Ollama app) |
| Model not found | `ollama pull qwen2.5:7b` (or set `OLLAMA_MODEL` to a model you have) |
| Slow responses | Use a smaller model (`llama3.2:3b`) or close other heavy apps |
| DB errors on first run | `npm run db:push`; ensure `data/` is writable |
| Port 3000 in use | `npx next dev -p 3001` |
| `desktop:dev` / Rust errors | Install Rust (`rustup`) + Xcode CLT; reopen the terminal |
| Desktop AI / notes missing | Confirm Ollama is running; desktop DB is under Application Support, not `data/` |

---

## Tech stack (summary)

Next.js · TypeScript · Tailwind · BlockNote · Drizzle · SQLite · Ollama · Tauri (macOS shell)

Full rationale: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## License

Personal / student project. Add a license file if you redistribute.
