import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  Divider,
  Grid,
  H1,
  H2,
  PieChart,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  computeDAGLayout,
  useHostTheme,
} from "cursor/canvas";

function PhaseDag() {
  const theme = useHostTheme();
  const nodeWidth = 150;
  const nodeHeight = 36;
  const labels: Record<string, string> = {
    p0: "P0 · Docs",
    p1: "P1 · Scaffold + CRUD",
    p2: "P2 · BlockNote",
    p3: "P3 · Ollama AI",
    p4: "P4 · Polish",
    done: "MVP shipped",
  };

  const layout = computeDAGLayout({
    nodes: Object.keys(labels).map((id) => ({ id })),
    edges: [
      { from: "p0", to: "p1" },
      { from: "p1", to: "p2" },
      { from: "p2", to: "p3" },
      { from: "p3", to: "p4" },
      { from: "p4", to: "done" },
    ],
    direction: "horizontal",
    nodeWidth,
    nodeHeight,
    rankGap: 40,
    nodeGap: 20,
    padding: 12,
  });

  return (
    <svg width="100%" viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ display: "block" }}>
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
        const isDone = node.id === "done";
        return (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={nodeWidth}
              height={nodeHeight}
              rx={6}
              fill={isDone ? theme.fill.secondary : theme.bg.elevated}
              stroke={isDone ? theme.accent.primary : theme.stroke.primary}
              strokeWidth={isDone ? 1.5 : 1}
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

export default function MvpRoadmapCanvas() {
  return (
    <Stack gap={28} style={{ padding: 20, maxWidth: 1100 }}>
      <Stack gap={8}>
        <Row gap={8} align="center">
          <H1 style={{ margin: 0 }}>Arcana MVP roadmap</H1>
          <Pill size="sm" active>
            Complete
          </Pill>
        </Row>
        <Text tone="secondary">
          Phased build for the first usable Arcana. Companion to <Code>docs/MVP_ROADMAP.md</Code>.
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="5" label="Phases (0→4)" />
        <Stat value="24" label="Checklist items done" tone="success" />
        <Stat value="0" label="Paid API keys" />
        <Stat value="100%" label="Definition of done" tone="success" />
      </Grid>

      <Callout tone="success" title="MVP shipped">
        Pages persist, BlockNote edits save, five Ollama actions insert, and README alone is enough
        to run locally.
      </Callout>

      <Divider />

      <Stack gap={10}>
        <H2>Phase pipeline</H2>
        <Card>
          <CardHeader>Docs → CRUD → Editor → AI → Polish</CardHeader>
          <CardBody>
            <PhaseDag />
          </CardBody>
        </Card>
      </Stack>

      <Stack gap={10}>
        <H2>Effort & completion</H2>
        <Text size="small" tone="tertiary">
          Illustrative phase weight · checklist counts from MVP_ROADMAP.md
        </Text>
        <Grid columns={2} gap={16}>
          <Card>
            <CardHeader>Phase effort share</CardHeader>
            <CardBody>
              <PieChart
                data={[
                  { label: "P0 Docs", value: 10 },
                  { label: "P1 Scaffold + CRUD", value: 25 },
                  { label: "P2 BlockNote", value: 25 },
                  { label: "P3 Ollama AI", value: 25 },
                  { label: "P4 Polish", value: 15 },
                ]}
                size={200}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Checklist items by phase</CardHeader>
            <CardBody>
              <BarChart
                categories={["P0", "P1", "P2", "P3", "P4"]}
                series={[{ name: "Items done", data: [3, 6, 4, 6, 5], tone: "success" }]}
                height={220}
                showValues
              />
              <Text size="small" tone="tertiary" style={{ marginTop: 8 }}>
                Y-axis: checklist items · Source: docs/MVP_ROADMAP.md
              </Text>
            </CardBody>
          </Card>
        </Grid>
      </Stack>

      <Stack gap={10}>
        <H2>Definition of done</H2>
        <Table
          headers={["Criterion", "Status"]}
          rowTone={["success", "success", "success", "success", "success", "success"]}
          rows={[
            ["Pages survive refresh", "Done"],
            ["Block editor (text → code)", "Done"],
            ["Five AI actions insertable", "Done"],
            ["Clear error if Ollama down", "Done"],
            ["README enough to run", "Done"],
            ["Zero paid API keys", "Done"],
          ]}
          striped
        />
      </Stack>

      <Stack gap={10}>
        <H2>Phase cards</H2>
        <Grid columns={2} gap={12}>
          {[
            ["Phase 0 · Docs", "ARCHITECTURE, roadmap, README"],
            ["Phase 1 · CRUD", "Next.js, Drizzle, SQLite, sidebar"],
            ["Phase 2 · Editor", "BlockNote, debounce save, /p/[id]"],
            ["Phase 3 · AI", "ollama.ts, prompts, streaming panel"],
            ["Phase 4 · Polish", "Errors, empty states, gitignore, verify"],
          ].map(([title, body]) => (
            <div key={title}>
              <Card>
                <CardHeader>{title}</CardHeader>
                <CardBody>
                  <Text size="small" tone="secondary">
                    {body}
                  </Text>
                </CardBody>
              </Card>
            </div>
          ))}
        </Grid>
      </Stack>

      <Stack gap={10}>
        <H2>Deferred</H2>
        <Table
          headers={["Item", "Why later"]}
          rows={[
            ["Cross-page RAG", "Needs embeddings + chunking"],
            ["Notion databases", "Writing loop first"],
            ["Auth / multi-user", "Personal local tool"],
            ["Cloud sync", "Local-first MVP"],
            ["Drag-drop page tree", "Nice-to-have after CRUD"],
          ]}
          striped
        />
      </Stack>

      <Card>
        <CardHeader>One-liner</CardHeader>
        <CardBody>
          <Text>
            Docs → CRUD → Editor → Local AI → Polish. Everything else waits until the writing loop
            feels boringly reliable.
          </Text>
        </CardBody>
      </Card>

      <Text size="small" tone="quaternary">
        Full checklist with Mermaid: docs/MVP_ROADMAP.md
      </Text>
    </Stack>
  );
}
