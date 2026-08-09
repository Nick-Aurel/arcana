import {
  OllamaError,
  ollamaToTextStream,
  streamOllamaChat,
} from "@/lib/ollama";
import { type AiAction, buildMessages } from "@/lib/prompts";

export const runtime = "nodejs";

const ACTIONS = new Set<AiAction>([
  "summarize",
  "rewrite",
  "ask",
  "bullets",
  "checklist",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    action?: AiAction;
    text?: string;
    question?: string;
  } | null;

  if (!body?.action || !ACTIONS.has(body.action)) {
    return Response.json(
      { error: "Unknown or missing action." },
      { status: 400 },
    );
  }

  const text = body.text?.trim() ?? "";
  if (!text) {
    return Response.json(
      { error: "Page text is empty. Write something first." },
      { status: 400 },
    );
  }

  if (body.action === "ask" && !body.question?.trim()) {
    return Response.json(
      { error: "A question is required for the ask action." },
      { status: 400 },
    );
  }

  try {
    const messages = buildMessages(body.action, text, body.question);
    const ollamaBody = await streamOllamaChat(messages);
    const textStream = ollamaToTextStream(ollamaBody);

    return new Response(textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    if (err instanceof OllamaError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    const message =
      err instanceof Error ? err.message : "Unexpected AI error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
