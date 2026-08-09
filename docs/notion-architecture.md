# Notion — System Architecture

> A designer + senior-engineer walkthrough of how Notion is structured: product model, client, sync, services, data, and UX. Based on public engineering talks, blogs, and observed product behavior — not internal Notion source.

| Companion | Where |
| --- | --- |
| Interactive canvas (open beside chat) | Cursor: `canvases/notion-architecture.canvas.tsx` |
| Versioned copy in this repo | [canvases/notion-architecture.canvas.tsx](./canvases/notion-architecture.canvas.tsx) |
| Arcana (what we build) | [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## At a glance

| | | | |
|:---:|:---:|:---:|:---:|
| **1 tree** | **~16ms** | **space_id** | **ACL** |
| Universal block model | Typing budget (local) | Primary shard key | Wraps every fetch |

> **Thesis:** Notion is not docs-with-databases. It is a recursive block canvas where pages, rows, views, and AI are different projectors over the same permissioned tree.

```mermaid
pie showData
  title Eng investment by domain (illustrative)
  "Editor + block model" : 28
  "Sync / multiplayer" : 22
  "Databases / views" : 18
  "Permissions / sharing" : 12
  "Search + AI" : 12
  "Infra / platform" : 8
```

```mermaid
xychart-beta
  title "Latency budget by hop — editor path (ms)"
  x-axis ["Local apply", "WS send", "Persist", "Peer fanout"]
  y-axis "Milliseconds" 0 --> 50
  bar [2, 25, 40, 35]
```

---

## 1. Product thesis (why the architecture looks like this)

Notion is not a doc editor with databases bolted on. It is a **universal block canvas** where pages, databases, embeds, and AI are the same substrate with different renderers and permissions.

Three non-negotiables drive every layer:

| Principle | Product consequence | Engineering consequence |
| --- | --- | --- |
| Everything is a block | One mental model for users | One recursive tree + typed properties |
| Instant & multiplayer | Optimistic UI, presence, live cursors | CRDT/OT-style sync + WebSockets |
| Nested workspaces | Share a page, not a file | Permission inheritance down the page tree |

```mermaid
mindmap
  root((Notion))
    Blocks
      Text / headings
      Media / embeds
      Databases
      Synced blocks
    Surfaces
      Page editor
      Database views
      Sidebar / home
      Search / AI
    Collaboration
      Presence
      Comments
      Permissions
      Sharing links
```

---

## 2. Mental model: the block tree

Every page is a tree of **blocks**. A database row is a page. A page can contain databases. Views are filtered projections over the same rows.

```mermaid
flowchart TB
  WS[Workspace]
  SPACE[Teamspace / Private]
  PAGE[Page block]
  CHILD[Child blocks]
  DB[Database / collection]
  ROW[Row = page]
  VIEW[View: table / board / calendar]

  WS --> SPACE
  SPACE --> PAGE
  PAGE --> CHILD
  PAGE --> DB
  DB --> ROW
  DB --> VIEW
  ROW --> CHILD
```

### Canonical block shape (conceptual)

```ts
type Block = {
  id: string;
  type: "paragraph" | "heading" | "database" | "image" | /* … */;
  parent_id: string | null;
  space_id: string;          // workspace shard key
  properties: Record<string, unknown>;
  content: string[];         // ordered child ids
  permissions?: Permission[];
  version: number;           // for sync / conflict resolution
};
```

**Design note:** The editor never “opens a file.” It mounts a root block and recursively hydrates children. That is why Notion feels like one continuous surface instead of Word-vs-Excel modes.

---

## 3. Client architecture

Clients are thin shells around a shared web application:

| Client | Shell | App core |
| --- | --- | --- |
| Web | Browser | React SPA |
| Desktop | Electron | Same React SPA |
| Mobile | Native wrappers / hybrid | Shared concepts, platform UI |

```mermaid
flowchart LR
  subgraph Shells
    WEB[Browser]
    ELE[Electron]
    MOB[Mobile shell]
  end

  subgraph App["Shared app core"]
    UI[React UI / design system]
    STORE[Client store + block cache]
    SYNC[Sync engine]
    OFF[Offline / optimistic queue]
  end

  WEB --> UI
  ELE --> UI
  MOB --> UI
  UI --> STORE
  STORE --> SYNC
  SYNC --> OFF
```

### Client layers (top → bottom)

1. **Presentation** — sidebar, topbar, editor canvas, database views, modals  
2. **Interaction** — selection, slash menu, drag-and-drop, keyboard maps  
3. **Document model** — block tree, transactions, undo/redo  
4. **Sync** — outbound mutations, inbound remote ops, presence  
5. **Platform** — IndexedDB/local cache, file uploads, notifications  

**Design note:** Latency budget for typing is ~16ms perceived. Remote round-trips must never sit on the keystroke path — hence optimistic local apply, then reconcile.

---

## 4. Collaboration & sync

Notion’s multiplayer story is “local-first feel, server-authoritative truth.”

```mermaid
sequenceDiagram
  participant A as Client A
  participant S as Sync service
  participant B as Client B

  A->>A: Apply mutation locally (optimistic)
  A->>S: Send transaction / ops
  S->>S: Validate + persist + order
  S->>A: Ack / version
  S->>B: Push ops (WebSocket)
  B->>B: Merge into local tree + re-render
```

### Sync responsibilities

| Concern | Approach (conceptual) |
| --- | --- |
| Concurrent edits | Operational transforms / CRDT-like merge on structured ops |
| Ordering | Server-assigned versions per space/page |
| Presence | Ephemeral channel (cursors, “viewing”) — not durable |
| Offline | Queue mutations; replay on reconnect with conflict policy |
| Large pages | Partial load + lazy children; virtualized rendering |

---

## 5. Backend service map

At company scale, Notion decomposes into a **gateway + domain services + async workers**, sharded primarily by workspace (`space_id`).

```mermaid
flowchart TB
  CF[CDN / edge cache]
  GW[API gateway / BFF]

  subgraph Core
    AUTH[Auth / identity]
    API[Block & page API]
    SYNC[Realtime sync]
    PERM[Permissions]
    SEARCH[Search indexer]
  end

  subgraph Data
    PG[(Postgres shards)]
    REDIS[(Redis)]
    S3[(Object storage)]
    ES[(Search index)]
  end

  subgraph Async
    WORK[Workers: export, import, notifications]
    AI[AI / embedding jobs]
  end

  CF --> GW
  GW --> AUTH
  GW --> API
  GW --> SYNC
  GW --> PERM
  API --> PG
  API --> REDIS
  SYNC --> REDIS
  SYNC --> PG
  PERM --> PG
  API --> S3
  SEARCH --> ES
  WORK --> PG
  WORK --> S3
  AI --> ES
  AI --> PG
```

### Service catalog

| Service | Owns | Hot path? |
| --- | --- | --- |
| Auth / identity | Sessions, SSO, SCIM | Yes (edge-cached tokens) |
| Block API | CRUD, tree moves, properties | Yes |
| Sync / realtime | WebSocket fanout, presence | Yes |
| Permissions | ACL evaluation, share links | Yes (must be fast & correct) |
| Search | Full-text + semantic | Near-real-time async |
| File / media | Upload, CDN URLs, previews | Upload async |
| Notifications | Mentions, digests | Async |
| AI | Q&A, autofill, summaries | Async + streaming |
| Billing | Plans, seats, entitlements | Rare on editor path |

---

## 6. Data & storage model

```mermaid
flowchart LR
  subgraph Hot
    BLOCKS[(blocks)]
    SPACES[(spaces / members)]
    PERMS[(permissions)]
  end

  subgraph Warm
    CACHE[Redis page snapshots]
    IDX[Search / embeddings]
  end

  subgraph Cold
    FILES[S3 blobs]
    EXPORTS[Export archives]
    AUDIT[Audit logs]
  end

  BLOCKS --> CACHE
  BLOCKS --> IDX
  BLOCKS --> FILES
```

### Sharding intuition

- **Primary key for scale:** `space_id` (workspace).  
- Pages and blocks for a workspace stay co-located for locality.  
- Cross-workspace moves / public templates are special-case migrations.  
- File binaries live off-DB (object storage + CDN).

### Why not “one document blob”?

A single JSON blob per page fails at:

1. Concurrent multiplayer (whole-doc replace)  
2. Partial load of huge pages  
3. Database views that need property indexes  
4. Permission at subtree granularity  

Blocks + indexed properties are the cost of those features.

---

## 7. Permissions & sharing

Permissions flow **down the tree**, with explicit overrides and share links.

```mermaid
flowchart TD
  WS[Workspace role: owner / member / guest]
  TS[Teamspace role]
  PAGE[Page ACL]
  CHILD[Inherited by children]
  LINK[Public / restricted share link]
  GUEST[Guest override]

  WS --> TS --> PAGE --> CHILD
  LINK --> PAGE
  GUEST --> PAGE
```

**Engineering rule:** Every read/write path evaluates effective permission for `(user, block)`. Cache aggressively; invalidate on ACL or parent moves.

**Design rule:** Sharing UI must answer one question: “Who can see this, and why?” Inheritance makes that hard — surface the source of access, not just the boolean.

---

## 8. Databases as a product surface (not a separate app)

Notion databases are **collections of pages** with typed properties + named views.

```mermaid
flowchart LR
  COL[Collection schema]
  ROWS[Rows = pages]
  PROPS[Properties: title, select, relation…]
  VIEWS[Views: filter / sort / group / layout]

  COL --> ROWS
  COL --> PROPS
  ROWS --> VIEWS
  PROPS --> VIEWS
```

| View | Layout job | Data need |
| --- | --- | --- |
| Table | Dense scanning | Columnar property fetch |
| Board | Status workflow | Group-by + card preview |
| Calendar | Time planning | Date index |
| Timeline | Ranges | Start/end properties |
| Gallery | Visual browse | Cover images |

Same rows, different projectors — that is the architecture win designers feel as “one database, many views.”

---

## 9. Search & AI placement

Search and AI sit **beside** the editor, not inside the block transaction path.

```mermaid
flowchart TB
  EDIT[Editor mutations]
  BUS[Change stream]
  IDX[Indexers]
  FT[Full-text]
  EMB[Embeddings]
  Q[Query API]
  UI[Search / AI UI]

  EDIT --> BUS --> IDX
  IDX --> FT
  IDX --> EMB
  FT --> Q
  EMB --> Q
  Q --> UI
```

- **Indexing lag** is acceptable (seconds); **permission filtering** is not optional.  
- AI answers must be grounded in ACL-visible blocks only.  
- Streaming responses reuse the same auth context as the page.

---

## 10. UX architecture (designer lens)

### Spatial model

| Region | Job | Frequency |
| --- | --- | --- |
| Left sidebar | Navigate & orient | Constant |
| Top bar | Page chrome, share, favorite | Frequent |
| Center canvas | Create & read | Primary |
| Right panel | Comments / details / AI | Contextual |
| Slash / selection menus | Transform blocks | Burst |

### Interaction hierarchy

1. **Type** — zero chrome, caret is the UI  
2. **Slash** — intentional structure (`/table`, `/ai`)  
3. **Block handle** — rearrange, turn into, delete  
4. **Selection toolbar** — format & ask AI  
5. **Page menu** — rare: export, lock, connections  

```mermaid
xychart-beta
  title "Relative interaction frequency (indexed)"
  x-axis ["Type", "Slash", "Block handle", "Selection bar", "Page menu"]
  y-axis "Frequency" 0 --> 100
  bar [100, 45, 35, 30, 10]
```

### Motion & feedback

- Optimistic insert/delete with soft layout animation  
- Presence cursors as ephemeral layers (never compete with content)  
- Loading: skeleton for distant pages; never blank the active page  

---

## 11. Cross-cutting quality bars

| Domain | Target behavior |
| --- | --- |
| Performance | First paint for a warm page under ~1s; typing never janks |
| Reliability | Sync reconnects without data loss; queue is durable client-side |
| Security | ACL on every fetch; public links are first-class threat model |
| Privacy | Workspace isolation; guest least-privilege |
| Observability | Trace `space_id` + `block_id` across API → DB → WS |
| Internationalization | RTL, CJK IME, locale-aware dates in databases |

---

## 12. End-to-end request paths

### A. Keystroke in a shared page

```mermaid
sequenceDiagram
  participant U as User
  participant C as Client
  participant WS as Sync WS
  participant DB as Postgres

  U->>C: Type character
  C->>C: Mutate local block + render
  C->>WS: Op / transaction
  WS->>DB: Persist versioned change
  WS-->>C: Ack
  WS-->>C: Fanout to peers
```

### B. Open a database board view

```mermaid
sequenceDiagram
  participant C as Client
  participant API as Block API
  participant DB as Postgres
  participant CDN as CDN

  C->>API: Fetch collection + view config
  API->>DB: Query rows by filter/sort
  API-->>C: Row stubs + properties
  C->>CDN: Cover images (lazy)
  C->>C: Group into board columns
```

### C. Ask AI about a page

```mermaid
sequenceDiagram
  participant C as Client
  participant AI as AI service
  participant IDX as ACL-aware retrieval
  participant LLM as Model

  C->>AI: Prompt + page context
  AI->>IDX: Retrieve visible chunks
  IDX-->>AI: Grounding set
  AI->>LLM: Stream completion
  LLM-->>C: Token stream
```

---

## 13. Suggested mental diagram for onboarding engineers

If you remember only one picture:

> **Clients hold a live block tree → mutations go through a sync plane → durable truth lives in sharded Postgres → search/AI/files are derived systems → permissions wrap every read.**

```mermaid
flowchart LR
  CLIENT[Clients]
  SYNC[Sync plane]
  TRUTH[(System of record)]
  DERIVED[Search / AI / CDN]
  ACL[Permissions]

  CLIENT <--> SYNC
  SYNC <--> TRUTH
  TRUTH --> DERIVED
  ACL -.-> CLIENT
  ACL -.-> SYNC
  ACL -.-> DERIVED
```

---

## 14. What this architecture enables (and costs)

**Enables**

- One product that is docs + wiki + project tracker  
- Deep linking and embeddable subtrees  
- Fine-grained sharing  
- Real-time collaboration without “checkout”  

**Costs**

- Complex client (editor + DB views + sync)  
- Permission evaluation on hot paths  
- Hard multiplayer edge cases (moves, merges, offline)  
- Operational burden of workspace sharding and migrations  

That tradeoff is intentional: Notion chose a **unified substrate** over a suite of simpler apps.

---

## References (public)

- Notion engineering blog posts on data model, scaling, and infrastructure  
- Conference talks on Notion’s block model and realtime collaboration  
- Observed product behavior across web / desktop / mobile  

*This document is an architectural reading suitable for product and engineering onboarding — not a claim of Notion’s private implementation details.*
