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
  Stack,
  Stat,
  Swatch,
  Table,
  Text,
  computeDAGLayout,
  useHostTheme,
} from "cursor/canvas";

function SystemDag() {
  const theme = useHostTheme();
  const nodeWidth = 132;
  const nodeHeight = 36;
  const labels: Record<string, string> = {
    ui: "Sidebar + Editor",
    aiui: "AI Panel",
    pages: "/api/pages",
    ai: "/api/ai",
    drizzle: "Drizzle",
    sqlite: "SQLite",
    ollama: "Ollama",
    llm: "Local LLM",
  };

  const layout = computeDAGLayout({
    nodes: Object.keys(labels).map((id) => ({ id })),
    edges: [
      { from: "ui", to: "pages" },
      { from: "aiui", to: "ai" },
      { from: "pages", to: "drizzle" },
      { from: "drizzle", to: "sqlite" },
      { from: "ai", to: "ollama" },
      { from: "ollama", to: "llm" },
    ],
    direction: "vertical",
    nodeWidth,
    nodeHeight,
    rankGap: 48,
    nodeGap: 36,
    padding: 16,
  });

  const hot = new Set(["ui", "pages", "drizzle", "sqlite"]);

  return (
    <svg width="100%" viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ display: "block" }}>
      {layout.ranks.map((rank) => (
        <rect
          key={`r-${rank.rank}`}
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
        />
      ))}
      {layout.nodes.map((node) => {
        const isHot = hot.has(node.id);
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
              {labels[node.id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ArcanaArchitectureCanvas() {
  return (
    <Stack gap={28} style={{ padding: 20, maxWidth: 1100 }}>
      <Stack gap={8}>
        <Row gap={8} align="center">
          <H1 style={{ margin: 0 }}>Arcana architecture</H1>
          <Pill size="sm" active>
            Local-first MVP
          </Pill>
        </Row>
        <Text tone="secondary">
          Notion-like notes on one machine: BlockNote + SQLite + Ollama. Companion to{" "}
          <Code>docs/ARCHITECTURE.md</Code>.
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="1 machine" label="No cloud required" />
        <Stat value="SQLite" label="System of record" />
        <Stat value="Ollama" label="Local LLM" tone="success" />
        <Stat value="5 actions" label="AI assist surface" tone="info" />
      </Grid>

      <Callout tone="info" title="Thesis">
        Arcana is a thin Next.js shell around a block editor and a local model. Boring
        persistence first; CRDT / multiplayer later.
      </Callout>

      <Divider />

      <Stack gap={10}>
        <H2>System map</H2>
        <Text size="small" tone="secondary">
          Accent stroke = hot path (type + save). AI path is assistive and never blocks typing.
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
                    Assist path
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
        <H2>MVP surface area</H2>
        <Text size="small" tone="tertiary">
          Illustrative product weight · Source: MVP scope reading
        </Text>
        <Grid columns={2} gap={16}>
          <Card>
            <CardHeader>By product weight</CardHeader>
            <CardBody>
              <PieChart
                data={[
                  { label: "Page CRUD + sidebar", value: 30 },
                  { label: "BlockNote editor", value: 30 },
                  { label: "Ollama AI panel", value: 25 },
                  { label: "Polish / docs", value: 15 },
                ]}
                size={200}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>In vs out of MVP</CardHeader>
            <CardBody>
              <Table
                headers={["Ship now", "Deferred"]}
                rows={[
                  ["Page CRUD + nesting", "Databases / kanban"],
                  ["BlockNote editor", "Multiplayer / sync"],
                  ["5 local AI actions", "Auth / teams"],
                  ["SQLite + Ollama", "Cross-page RAG"],
                ]}
                striped
              />
            </CardBody>
          </Card>
        </Grid>
      </Stack>

      <Stack gap={10}>
        <H2>UX regions</H2>
        <Grid columns={3} gap={12}>
          <Card>
            <CardHeader>Sidebar</CardHeader>
            <CardBody>
              <Text size="small" tone="secondary">
                Navigate & orient. Never run inference here.
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Center canvas</CardHeader>
            <CardBody>
              <Text size="small" tone="secondary">
                Write. Typing never waits on Ollama.
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>AI panel</CardHeader>
            <CardBody>
              <Text size="small" tone="secondary">
                Assist. Explicit insert only — no silent overwrite.
              </Text>
            </CardBody>
          </Card>
        </Grid>
      </Stack>

      <Stack gap={10}>
        <H2>Stack</H2>
        <Table
          headers={["Layer", "Choice", "Why"]}
          rows={[
            ["App", "Next.js + TypeScript", "UI + API in one local codebase"],
            ["Editor", "BlockNote", "Notion-like blocks quickly"],
            ["DB", "SQLite + Drizzle", "Zero ops, file on disk"],
            ["AI", "Ollama HTTP", "Free, local, swappable models"],
            ["Default model", "qwen2.5:7b", "Strong writing instructions"],
          ]}
          striped
        />
      </Stack>

      <Stack gap={10}>
        <H2>Data model</H2>
        <Table
          headers={["Column", "Type", "Notes"]}
          rows={[
            ["id", "text PK", "UUID"],
            ["title", "text", 'Default "Untitled"'],
            ["parent_id", "text?", "Self-FK nesting"],
            ["content", "text", "BlockNote JSON"],
            ["created_at / updated_at", "int", "Unix ms"],
          ]}
          striped
        />
      </Stack>

      <Stack gap={8}>
        <H2>Deep dives</H2>
        <CollapsibleSection title="API surface" defaultOpen count={2}>
          <Stack gap={8} style={{ paddingTop: 8 }}>
            <H3>Pages</H3>
            <Text size="small">GET/POST /api/pages · GET/PATCH/DELETE /api/pages/[id]</Text>
            <H3>AI</H3>
            <Text size="small">
              POST /api/ai with action ∈ summarize | rewrite | ask | bullets | checklist
            </Text>
          </Stack>
        </CollapsibleSection>
        <CollapsibleSection title="Design principles" count={4}>
          <Table
            headers={["Principle", "Meaning"]}
            rows={[
              ["One job per surface", "Navigate · write · AI"],
              ["Boring persistence", "SQLite before CRDT"],
              ["AI is assistive", "Insert only on confirm"],
              ["Fail loudly", "Clear error if Ollama is down"],
            ]}
            framed={false}
          />
        </CollapsibleSection>
        <CollapsibleSection title="Future" count={5}>
          <Text size="small">RAG · slash AI · Git/WebDAV sync · simple databases · desktop shell</Text>
        </CollapsibleSection>
      </Stack>

      <Card>
        <CardHeader>One-liner</CardHeader>
        <CardBody>
          <Text>
            Browser holds BlockNote → Next.js persists to SQLite → Ollama streams assistive text →
            user chooses what lands in the page.
          </Text>
        </CardBody>
      </Card>

      <Text size="small" tone="quaternary">
        Full write-up with Mermaid: docs/ARCHITECTURE.md
      </Text>
    </Stack>
  );
}
