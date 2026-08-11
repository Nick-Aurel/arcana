# Arcana Architecture

Local-first, Notion-like notes with free AI via [Ollama](https://ollama.com). All data and inference stay on your machine.

| Companion | Where |
| --- | --- |
| Interactive canvas | [arcana-architecture.canvas.tsx](./canvases/arcana-architecture.canvas.tsx) · also in Cursor canvases |
| Notion study | [notion-architecture.md](./notion-architecture.md) |
| Build checklist | [MVP_ROADMAP.md](./MVP_ROADMAP.md) |

---

## At a glance

| | | | |
|:---:|:---:|:---:|:---:|
| **1 machine** | **SQLite** | **Ollama** | **5 AI actions** |
| No cloud required | System of record | Local LLM | Summarize → checklist |
| | | | |

> **Thesis:** Arcana is a thin Next.js shell around a block editor and a local model. Boring persistence first; CRDT / multiplayer later.

```mermaid
pie showData
  title MVP surface area (by product weight)
  "Page CRUD + sidebar" : 30
  "BlockNote editor" : 30
  "Ollama AI panel" : 25
  "Polish / docs" : 15
```

---

## Goals vs non-goals

```mermaid
quadrantChart
  title Scope board — build vs defer
  x-axis Low leverage --> High leverage
  y-axis Out of MVP --> In MVP
  quadrant-1 Ship now
  quadrant-2 Stretch later
  quadrant-3 Ignore
  quadrant-4 Nice-to-have
  Page CRUD: [0.85, 0.9]
  Block editor: [0.9, 0.88]
  Local AI actions: [0.8, 0.85]
  Nested pages: [0.55, 0.7]
  Embeddings RAG: [0.75, 0.25]
  Notion databases: [0.7, 0.15]
  Multiplayer: [0.6, 0.1]
  Auth / teams: [0.4, 0.1]
  Drag-drop tree: [0.45, 0.35]
```

| In MVP | Explicitly out |
| --- | --- |
| Own notes + AI stack (no Notion AI bill) | Databases, kanban, calendars, formulas |
| Pages, nesting, block editor | Multiplayer / realtime / cloud host |
| Summarize, rewrite, ask, bullets, checklist | Auth, teams, permissions, sharing |
| Next.js + SQLite + Ollama on localhost | Mobile apps, plugin marketplace |
| | Cross-page RAG (see [Future](#future-extensions)) |

---

## System map

Hot path = typing and save. AI path is assistive and never blocks the editor.

```mermaid
flowchart TB
  subgraph client ["Browser · localhost"]
    UI["Pages sidebar + BlockNote"]
    AiPanel["AI actions panel"]
  end

  subgraph next ["Next.js App Router"]
    PagesAPI["/api/pages"]
    AiAPI["/api/ai"]
    Drizzle["Drizzle ORM"]
  end

  subgraph local ["Same machine"]
    SQLite[("data/arcana.db")]
    Ollama["Ollama :11434"]
    LLM["Configured LLM"]
  end

  UI -->|CRUD| PagesAPI
  AiPanel -->|stream| AiAPI
  PagesAPI --> Drizzle --> SQLite
  AiAPI --> Ollama --> LLM
```

### Spatial UX (designer lens)

```mermaid
flowchart LR
  SB["Sidebar<br/>navigate"] --> CANVAS["Center canvas<br/>write"]
  CANVAS --> AI["Right panel<br/>AI assist"]
```

| Region | Job | Rule |
| --- | --- | --- |
| Left sidebar | Orient & open pages | Never run inference here |
| Center | Create & read | Typing never waits on Ollama |
| Right AI panel | Assistive transforms | Explicit insert only — no silent overwrite |

---

## Request flows

### A — Edit a page

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant API as /api/pages
  participant DB as SQLite

  U->>C: Open / or /p/[id]
  C->>API: GET list + page
  API->>DB: SELECT
  DB-->>C: title + BlockNote JSON
  U->>C: Type in editor
  C->>C: Debounce local state
  C->>API: PATCH title + content
  API->>DB: UPDATE
  API-->>C: Saved page
```

### B — AI action

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant AI as /api/ai
  participant O as Ollama

  U->>C: Choose action (+ question)
  C->>AI: POST action, text, question?
  AI->>AI: Build system + user prompts
  AI->>O: /api/chat stream=true
  O-->>C: Token stream → AI panel
  U->>C: Insert or copy into editor
```

```mermaid
flowchart LR
  subgraph hot ["Hot · must stay snappy"]
    T[Type] --> S[Debounced save] --> DB[(SQLite)]
  end
  subgraph assist ["Assist · may be slow"]
    A[AI action] --> O[Ollama] --> I[Insert on confirm]
  end
```

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js App Router + TypeScript | One local codebase: UI + API |
| Styling | Tailwind CSS | Fast layout, no design-system tax |
| Editor | BlockNote | Notion-like blocks out of the box |
| DB | SQLite + Drizzle | Zero ops, file on disk, typed schema |
| AI | Ollama HTTP API | Free, local, model-swappable |
| Default model | `qwen2.5:7b` | Strong writing / instruction following |
| Fallback | `llama3.2:3b` | Lighter machines / faster replies |

### Model menu

```mermaid
flowchart TB
  DEF["qwen2.5:7b · default writing"]
  FAST["llama3.2:3b · low RAM"]
  ALT["mistral / gemma2 · alternatives"]
  REASON["deepseek-r1 distill · harder reasoning"]
  EMB["nomic-embed-text · future RAG"]

  DEF --- FAST
  DEF --- ALT
  ALT --- REASON
  REASON -.-> EMB
```

| Model | Pull | Best for |
| --- | --- | --- |
| Qwen 2.5 7B | `ollama pull qwen2.5:7b` | Default writing, summarize, rewrite |
| Llama 3.2 3B | `ollama pull llama3.2:3b` | Low RAM / faster |
| Mistral | `ollama pull mistral` | General chat / rewrite |
| Gemma 2 9B | `ollama pull gemma2:9b` | Quality / speed tradeoff |
| Phi-3 / Phi-4 | `ollama pull phi3` | Small / fast on laptops |
| DeepSeek-R1 distill | `ollama pull deepseek-r1:8b` | Harder reasoning (slower) |
| nomic-embed-text | `ollama pull nomic-embed-text` | Future embeddings (not MVP) |

Arcana reads `OLLAMA_BASE_URL` and `OLLAMA_MODEL`. Switching models is an Ollama concern.

---

## Data model

```mermaid
erDiagram
  PAGES ||--o{ PAGES : "parent_id"
  PAGES {
    text id PK
    text title
    text parent_id FK
    text content
    int created_at
    int updated_at
  }
```

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | UUID |
| `title` | text | Default `"Untitled"` |
| `parent_id` | text nullable | Self-FK for nesting |
| `content` | text | BlockNote JSON (stringified) |
| `created_at` | integer | Unix ms |
| `updated_at` | integer | Unix ms |

**Nesting (MVP):** `parent_id` powers a simple sidebar tree. Drag-and-drop reparenting can come later.

```mermaid
flowchart TB
  ROOT["Untitled (root)"]
  A["Project notes"]
  B["Meeting"]
  C["Nested under Project"]

  ROOT --> A
  ROOT --> B
  A --> C
```

---

## API contracts

### Pages

| Method | Path | Body / params | Response |
| --- | --- | --- | --- |
| `GET` | `/api/pages` | — | `{ pages: Page[] }` |
| `POST` | `/api/pages` | `{ title?, parentId? }` | `{ page: Page }` |
| `GET` | `/api/pages/[id]` | — | `{ page: Page }` |
| `PATCH` | `/api/pages/[id]` | `{ title?, content?, parentId? }` | `{ page: Page }` |
| `DELETE` | `/api/pages/[id]` | — | `{ ok: true }` |

```ts
type Page = {
  id: string;
  title: string;
  parentId: string | null;
  content: string; // BlockNote JSON
  createdAt: number;
  updatedAt: number;
};
```

Delete with children: reparent children to root (`parent_id = null`).

### AI

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/api/ai` | `{ action, text, question? }` | text / NDJSON stream |

```ts
type AiAction =
  | "summarize"
  | "rewrite"
  | "ask"
  | "bullets"
  | "checklist";

type AiRequest = {
  action: AiAction;
  text: string;
  question?: string; // required when action === "ask"
};
```

```mermaid
flowchart LR
  S[summarize] --> OUT[Plain text / markdown]
  R[rewrite] --> OUT
  A[ask] --> OUT
  B[bullets] --> OUT
  C[checklist] --> OUT
  OUT --> INSERT[User inserts into BlockNote]
```

| Status | When |
| --- | --- |
| `400` | Missing text / missing question / unknown action |
| `502` / `503` | Ollama down or model missing — tell user to `ollama serve` / `pull` |

---

## AI prompt contracts

| Action | Instruction |
| --- | --- |
| `summarize` | Concise summary; preserve key facts |
| `rewrite` | Clearer, tighter prose; same meaning; no new facts |
| `ask` | Answer using **only** page text; say if unknown |
| `bullets` | Markdown bullet list |
| `checklist` | Markdown `- [ ]` items |

Models never see secrets beyond page text. Output is paste-ready for BlockNote.

---

## Ollama integration

```mermaid
flowchart LR
  APP["Arcana /api/ai"] -->|"POST /api/chat"| OLLAMA["127.0.0.1:11434"]
  APP -.->|"GET /api/tags"| HEALTH["Health / model list"]
```

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
DATABASE_URL=file:./data/arcana.db
```

---

## App structure

```
arcana/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md      ← you are here
│   ├── MVP_ROADMAP.md
│   ├── notion-architecture.md
│   └── canvases/            ← Cursor canvas sources (versioned)
├── data/                    # SQLite (gitignored)
├── drizzle/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # workspace
│   │   ├── p/[id]/page.tsx         # editor
│   │   └── api/{pages,ai}/…
│   ├── components/{sidebar,editor,ai-panel}.tsx
│   ├── db/{index,schema}.ts
│   └── lib/{ollama,prompts}.ts
└── …
```

---

## Security & privacy

```mermaid
flowchart TB
  USER[You] --> LOCAL["localhost only"]
  LOCAL --> NEXT[Next.js]
  LOCAL --> OLL[Ollama]
  NEXT --> DB[(data/arcana.db)]
  OLL --> MODEL[Local weights]
```

- Bind to localhost; do not expose Next.js or Ollama publicly without hardening.
- No cloud AI keys in MVP.
- Back up notes by copying `data/arcana.db` (browser/dev) or `~/Library/Application Support/com.arcana.desktop/arcana.db` (desktop).

---

## Desktop shell (macOS)

Tauri wraps the same Next.js app. Release builds embed a Node binary + `output: "standalone"` server as resources; the Rust side spawns that sidecar on `127.0.0.1:47821`, waits for the port, then navigates the webview. Dev mode uses `beforeDevCommand` → `npm run dev` and loads `http://127.0.0.1:3000` (no sidecar).

```mermaid
flowchart LR
  subgraph app ["Arcana.app"]
    Shell["Tauri"]
    Node["Bundled Node + Next"]
    WV["WebView"]
  end
  DB[("Application Support DB")]
  Oll["Ollama"]
  Shell -->|spawn| Node
  Shell -->|navigate| WV
  WV --> Node
  Node --> DB
  Node --> Oll
```

See README **Desktop (macOS)** for build commands.

---

## Future extensions

```mermaid
timeline
  title After MVP
  section Near
    Embeddings + RAG : nomic-embed-text + chunk pages
    Slash AI : /summarize inside BlockNote
  section Mid
    Local sync : Git / WebDAV export
    Simple databases : tables after writing loop is solid
  section Later
    Desktop polish : signing, Windows/Linux, auto-update
```

1. **Embeddings + RAG** — ask across the workspace  
2. **Slash-command AI** — `/summarize` in-editor  
3. **Sync** — Git-backed or WebDAV; still local-first  
4. **Databases** — simple tables  
5. **Desktop polish** — notarization, other OS targets (macOS shell shipped)  

---

## Design principles

| Principle | Meaning |
| --- | --- |
| One job per surface | Sidebar = navigate · Center = write · Panel = AI |
| Boring persistence | SQLite JSON before CRDT |
| AI is assistive | Never auto-overwrite without explicit insert |
| Fail loudly | Clear error when Ollama is down — never silent |

---

## One-liner

> **Browser holds BlockNote → Next.js persists to SQLite → Ollama streams assistive text → user chooses what lands in the page.**
