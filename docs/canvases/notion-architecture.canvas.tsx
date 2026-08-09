import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  CollapsibleSection,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  PieChart,
  Pill,
  Row,
  Spacer,
  Stack,
  Stat,
  Swatch,
  Table,
  Text,
  computeDAGLayout,
  mergeStyle,
  useHostTheme,
} from "cursor/canvas";

type LayerId =
  | "clients"
  | "edge"
  | "gateway"
  | "sync"
  | "api"
  | "auth"
  | "perm"
  | "search"
  | "ai"
  | "workers"
  | "pg"
  | "redis"
  | "s3"
  | "index";

const LAYER_LABELS: Record<LayerId, string> = {
  clients: "Clients",
  edge: "CDN / Edge",
  gateway: "API Gateway",
  sync: "Realtime Sync",
  api: "Block API",
  auth: "Auth",
  perm: "Permissions",
  search: "Search",
  ai: "AI Service",
  workers: "Async Workers",
  pg: "Postgres Shards",
  redis: "Redis",
  s3: "Object Storage",
  index: "Search Index",
};

function SystemDag() {
  const theme = useHostTheme();
  const nodeWidth = 128;
  const nodeHeight = 36;

  const layout = computeDAGLayout({
    nodes: Object.keys(LAYER_LABELS).map((id) => ({ id })),
    edges: [
      { from: "clients", to: "edge" },
      { from: "edge", to: "gateway" },
      { from: "gateway", to: "auth" },
      { from: "gateway", to: "api" },
      { from: "gateway", to: "sync" },
      { from: "gateway", to: "perm" },
      { from: "gateway", to: "search" },
      { from: "gateway", to: "ai" },
      { from: "api", to: "pg" },
      { from: "api", to: "redis" },
      { from: "api", to: "s3" },
      { from: "sync", to: "pg" },
      { from: "sync", to: "redis" },
      { from: "perm", to: "pg" },
      { from: "search", to: "index" },
      { from: "ai", to: "index" },
      { from: "ai", to: "pg" },
      { from: "workers", to: "pg" },
      { from: "workers", to: "s3" },
      { from: "api", to: "workers" },
    ],
    direction: "vertical",
    nodeWidth,
    nodeHeight,
    rankGap: 52,
    nodeGap: 28,
    padding: 16,
  });

  const hot = new Set<LayerId>(["clients", "gateway", "sync", "api", "perm", "pg", "redis"]);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ display: "block", maxWidth: "100%" }}
    >
      {layout.ranks.map((rank) => (
        <rect
          key={`rank-${rank.rank}`}
          x={rank.x}
          y={rank.y}
          width={rank.width}
          height={rank.height}
          fill={theme.fill.tertiary}
          opacity={0.35}
          rx={6}
        />
      ))}
      {layout.edges.map((edge, i) => (
        <line
          key={`e-${i}`}
          x1={edge.sourceX}
          y1={edge.sourceY}
          x2={edge.targetX}
          y2={edge.targetY}
          stroke={theme.stroke.secondary}
          strokeWidth={1.25}
          strokeDasharray={edge.isBackEdge ? "4 3" : undefined}
        />
      ))}
      {layout.nodes.map((node) => {
        const id = node.id as LayerId;
        const isHot = hot.has(id);
        return (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={nodeWidth}
              height={nodeHeight}
              rx={6}
              fill={isHot ? theme.fill.secondary : theme.bg.elevated}
              stroke={isHot ? theme.accent.primary : theme.stroke.primary}
              strokeWidth={isHot ? 1.5 : 1}
            />
            <text
              x={node.x + nodeWidth / 2}
              y={node.y + nodeHeight / 2 + 4}
              textAnchor="middle"
              fill={theme.text.primary}
              fontSize={11}
              fontFamily="system-ui, sans-serif"
            >
              {LAYER_LABELS[id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function BlockTreeDag() {
  const theme = useHostTheme();
  const nodeWidth = 140;
  const nodeHeight = 34;

  const labels: Record<string, string> = {
    workspace: "Workspace",
    teamspace: "Teamspace",
    page: "Page (block)",
    children: "Child blocks",
    database: "Database",
    row: "Row = Page",
    view: "View projector",
  };

  const layout = computeDAGLayout({
    nodes: Object.keys(labels).map((id) => ({ id })),
    edges: [
      { from: "workspace", to: "teamspace" },
      { from: "teamspace", to: "page" },
      { from: "page", to: "children" },
      { from: "page", to: "database" },
      { from: "database", to: "row" },
      { from: "database", to: "view" },
      { from: "row", to: "children" },
    ],
    direction: "horizontal",
    nodeWidth,
    nodeHeight,
    rankGap: 56,
    nodeGap: 24,
    padding: 12,
  });

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ display: "block", maxWidth: "100%" }}
    >
      {layout.edges.map((edge, i) => (
        <line
          key={`be-${i}`}
          x1={edge.sourceX}
          y1={edge.sourceY}
          x2={edge.targetX}
          y2={edge.targetY}
          stroke={theme.stroke.secondary}
          strokeWidth={1.25}
        />
      ))}
      {layout.nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={nodeWidth}
            height={nodeHeight}
            rx={6}
            fill={theme.bg.elevated}
            stroke={
              node.id === "page" || node.id === "row"
                ? theme.accent.primary
                : theme.stroke.primary
            }
            strokeWidth={node.id === "page" || node.id === "row" ? 1.5 : 1}
          />
          <text
            x={node.x + nodeWidth / 2}
            y={node.y + nodeHeight / 2 + 4}
            textAnchor="middle"
            fill={theme.text.primary}
            fontSize={11}
            fontFamily="system-ui, sans-serif"
          >
            {labels[node.id]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function SyncFlow() {
  const theme = useHostTheme();
  const steps = [
    { title: "1. Local apply", body: "Keystroke mutates the in-memory block tree and paints immediately." },
    { title: "2. Enqueue op", body: "Transaction joins the outbound queue (survives brief offline)." },
    { title: "3. Server order", body: "Sync service validates ACL, assigns version, persists." },
    { title: "4. Fanout", body: "Peers receive ops over WebSocket and merge into their trees." },
  ];

  return (
    <Grid columns={4} gap={12}>
      {steps.map((step) => (
        <div key={step.title}>
          <Card>
            <CardHeader>{step.title}</CardHeader>
            <CardBody>
              <Text size="small" tone="secondary">
                {step.body}
              </Text>
            </CardBody>
          </Card>
        </div>
      ))}
      <div
        style={mergeStyle({
          gridColumn: "1 / -1",
          padding: "8px 10px",
          background: theme.fill.tertiary,
          borderRadius: 6,
        })}
      >
        <Text size="small" tone="secondary">
          Typing never waits on the network. Reconciliation is async; conflicts resolve via
          versioned structured ops, not whole-document replace.
        </Text>
      </div>
    </Grid>
  );
}

export default function NotionArchitectureCanvas() {
  const theme = useHostTheme();

  return (
    <Stack gap={28} style={{ padding: 20, maxWidth: 1100 }}>
      <Stack gap={8}>
        <Row gap={8} align="center">
          <H1 style={{ margin: 0 }}>Notion architecture</H1>
          <Pill size="sm" active>
            Public model
          </Pill>
        </Row>
        <Text tone="secondary">
          How a senior eng + product designer would explain Notion: one block substrate, a
          realtime sync plane, workspace-sharded storage, and ACL on every read. Companion to{" "}
          <Code>docs/notion-architecture.md</Code>.
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="1 tree" label="Universal block model" />
        <Stat value="~16ms" label="Typing budget (local)" tone="success" />
        <Stat value="space_id" label="Primary shard key" />
        <Stat value="ACL" label="Wraps every fetch" tone="warning" />
      </Grid>

      <Callout tone="info" title="Thesis">
        Notion is not docs-with-databases. It is a recursive block canvas where pages, rows,
        views, and AI are different projectors over the same permissioned tree.
      </Callout>

      <Divider />

      <Stack gap={10}>
        <H2>System map</H2>
        <Text tone="secondary" size="small">
          Hot path highlighted with accent stroke: clients → gateway → sync/API/permissions →
          Postgres/Redis. Search, AI, and workers are derived / async.
        </Text>
        <Card>
          <CardHeader
            trailing={
              <Row gap={10} align="center">
                <Row gap={6} align="center">
                  <Swatch color="blue" />
                  <Text size="small" tone="tertiary">
                    Hot path
                  </Text>
                </Row>
                <Row gap={6} align="center">
                  <Swatch color="gray" />
                  <Text size="small" tone="tertiary">
                    Supporting
                  </Text>
                </Row>
              </Row>
            }
          >
            Request graph
          </CardHeader>
          <CardBody>
            <SystemDag />
          </CardBody>
        </Card>
      </Stack>

      <Stack gap={10}>
        <H2>Product substrate — the block tree</H2>
        <Text tone="secondary" size="small">
          A database row is a page. Views are filtered projections. That single idea is why
          Notion can be wiki + tracker without mode-switching apps.
        </Text>
        <Card>
          <CardHeader>Composition hierarchy</CardHeader>
          <CardBody>
            <BlockTreeDag />
          </CardBody>
        </Card>
      </Stack>

      <Divider />

      <Stack gap={10}>
        <H2>Where engineering time goes</H2>
        <Text size="small" tone="tertiary">
          Illustrative allocation for a Notion-class product — not Notion’s internal budget.
          Source: architecture reading · normalized share of eng investment
        </Text>
        <Grid columns={2} gap={16}>
          <Card>
            <CardHeader>Eng investment by domain</CardHeader>
            <CardBody>
              <PieChart
                data={[
                  { label: "Editor + block model", value: 28 },
                  { label: "Sync / multiplayer", value: 22 },
                  { label: "Databases / views", value: 18 },
                  { label: "Permissions / sharing", value: 12 },
                  { label: "Search + AI", value: 12 },
                  { label: "Infra / platform", value: 8 },
                ]}
                size={200}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Latency budget by hop (editor path)</CardHeader>
            <CardBody>
              <BarChart
                categories={["Local apply", "WS send", "Persist", "Peer fanout"]}
                series={[
                  {
                    name: "Typical latency (ms)",
                    data: [2, 25, 40, 35],
                    tone: "info",
                  },
                ]}
                height={220}
                valueSuffix=" ms"
                showValues
              />
              <Text size="small" tone="tertiary" style={{ marginTop: 8 }}>
                Y-axis: milliseconds · Source: typical collaborative-editor budgets
              </Text>
            </CardBody>
          </Card>
        </Grid>
      </Stack>

      <Stack gap={10}>
        <H2>Client stack</H2>
        <Table
          headers={["Layer", "Owns", "Must never…"]}
          rows={[
            ["Presentation", "Sidebar, canvas, DB views, chrome", "Block on network I/O"],
            ["Interaction", "Selection, slash, DnD, shortcuts", "Bypass the document model"],
            ["Document model", "Block tree, txns, undo/redo", "Mutate without versioning"],
            ["Sync engine", "Outbound queue, inbound merge, presence", "Drop offline mutations"],
            ["Platform", "Cache, uploads, push, deep links", "Leak cross-workspace data"],
          ]}
          striped
        />
      </Stack>

      <Stack gap={10}>
        <H2>Collaboration path</H2>
        <SyncFlow />
      </Stack>

      <Divider />

      <Stack gap={10}>
        <H2>Service catalog</H2>
        <Table
          headers={["Service", "Owns", "Path", "Store"]}
          columnAlign={["left", "left", "left", "left"]}
          rowTone={["info", "info", "info", "warning", "neutral", "neutral", "neutral"]}
          rows={[
            ["Auth", "Sessions, SSO, SCIM", "Hot (cached)", "Identity DB"],
            ["Block API", "CRUD, moves, properties", "Hot", "Postgres"],
            ["Realtime sync", "Ops fanout, presence", "Hot", "Postgres + Redis"],
            ["Permissions", "ACL + share links", "Hot (correctness)", "Postgres"],
            ["Search", "Full-text + semantic", "Async index", "Search cluster"],
            ["AI", "Q&A, autofill, summaries", "Streaming", "Index + models"],
            ["Workers", "Import/export, digests", "Async", "Postgres + S3"],
          ]}
          striped
          stickyHeader
        />
      </Stack>

      <Stack gap={10}>
        <H2>UX architecture</H2>
        <Grid columns={2} gap={16}>
          <Stack gap={8}>
            <H3>Spatial regions</H3>
            <Table
              headers={["Region", "Job"]}
              rows={[
                ["Left sidebar", "Navigate & orient"],
                ["Top bar", "Share, favorite, page chrome"],
                ["Center canvas", "Create & read (primary)"],
                ["Right panel", "Comments, details, AI"],
                ["Slash / handles", "Structure & transform"],
              ]}
              framed
            />
          </Stack>
          <Stack gap={8}>
            <H3>Interaction hierarchy</H3>
            <BarChart
              horizontal
              categories={["Type", "Slash", "Block handle", "Selection bar", "Page menu"]}
              series={[
                {
                  name: "Relative frequency",
                  data: [100, 45, 35, 30, 10],
                  tone: "neutral",
                },
              ]}
              height={220}
              showValues
            />
            <Text size="small" tone="tertiary">
              X-axis: relative interaction frequency (indexed) · Designer priority: protect
              typing, progressive disclosure for structure
            </Text>
          </Stack>
        </Grid>
      </Stack>

      <Stack gap={10}>
        <H2>Databases = pages + projectors</H2>
        <Text tone="secondary" size="small">
          Same row set; views only change layout, filter, sort, and group.
        </Text>
        <Grid columns={5} gap={10}>
          {[
            ["Table", "Dense scan"],
            ["Board", "Workflow"],
            ["Calendar", "Time"],
            ["Timeline", "Ranges"],
            ["Gallery", "Visual"],
          ].map(([name, job]) => (
            <div key={name}>
              <Card>
                <CardHeader>{name}</CardHeader>
                <CardBody>
                  <Text size="small" tone="secondary">
                    {job}
                  </Text>
                </CardBody>
              </Card>
            </div>
          ))}
        </Grid>
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H2>Deep dives</H2>
        <CollapsibleSection title="Permissions model" defaultOpen count={4}>
          <Stack gap={6} style={{ paddingTop: 8 }}>
            <Text size="small">
              Effective access = workspace role ∩ teamspace role ∩ page ACL ∩ share-link
              constraints. Inheritance flows down; moves invalidate caches.
            </Text>
            <Text size="small" tone="secondary">
              Design requirement: show <Text as="span" weight="semibold">why</Text> someone
              has access, not only that they do.
            </Text>
          </Stack>
        </CollapsibleSection>
        <CollapsibleSection title="Why not one JSON blob per page?" count={4}>
          <Stack gap={4} style={{ paddingTop: 8 }}>
            <Text size="small">1. Multiplayer cannot safely whole-doc replace.</Text>
            <Text size="small">2. Huge pages need partial / lazy load.</Text>
            <Text size="small">3. Database views need property indexes.</Text>
            <Text size="small">4. Subtree sharing needs granular ACL.</Text>
          </Stack>
        </CollapsibleSection>
        <CollapsibleSection title="Search & AI placement" count={3}>
          <Stack gap={6} style={{ paddingTop: 8 }}>
            <Text size="small">
              Indexers consume the change stream. Seconds of lag are fine; leaking
              ACL-invisible chunks is not.
            </Text>
            <Text size="small" tone="secondary">
              AI streams through the same auth context as the editor session.
            </Text>
          </Stack>
        </CollapsibleSection>
        <CollapsibleSection title="Quality bars" count={5}>
          <Table
            headers={["Domain", "Bar"]}
            rows={[
              ["Performance", "Warm page ~1s; typing never janks"],
              ["Reliability", "Reconnect without losing the outbound queue"],
              ["Security", "ACL on every fetch; public links in threat model"],
              ["Observability", "Trace space_id + block_id end-to-end"],
              ["i18n", "RTL, CJK IME, locale-aware DB dates"],
            ]}
            framed={false}
          />
        </CollapsibleSection>
      </Stack>

      <Card>
        <CardHeader>One-liner for onboarding</CardHeader>
        <CardBody>
          <Text>
            Clients hold a live block tree → mutations go through a sync plane → durable
            truth lives in sharded Postgres → search/AI/files are derived → permissions wrap
            every read.
          </Text>
          <Spacer />
          <Row gap={8} wrap>
            <Pill size="sm">Unified substrate</Pill>
            <Pill size="sm">Optimistic UI</Pill>
            <Pill size="sm">Workspace sharding</Pill>
            <Pill size="sm">Derived search/AI</Pill>
          </Row>
        </CardBody>
      </Card>

      <Text size="small" tone="quaternary">
        Based on public engineering posts and observed product behavior — not Notion’s private
        implementation. Full write-up with Mermaid sequence diagrams: docs/notion-architecture.md
      </Text>
    </Stack>
  );
}
