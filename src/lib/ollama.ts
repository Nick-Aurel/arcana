import type { ChatMessage } from "./prompts";

export function getOllamaConfig() {
  return {
    baseUrl: (
      process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"
    ).replace(/\/$/, ""),
    model: process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
  };
}

export async function streamOllamaChat(messages: ChatMessage[]) {
  const { baseUrl, model } = getOllamaConfig();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });
  } catch {
    throw new OllamaError(
      `Cannot reach Ollama at ${baseUrl}. Start it with \`ollama serve\` (or open the Ollama app).`,
      503,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 404 || body.toLowerCase().includes("not found")) {
      throw new OllamaError(
        `Model "${model}" not found. Run: ollama pull ${model}`,
        502,
      );
    }
    throw new OllamaError(
      `Ollama error (${response.status}): ${body || response.statusText}`,
      502,
    );
  }

  if (!response.body) {
    throw new OllamaError("Ollama returned an empty body.", 502);
  }

  return response.body;
}

/** Convert Ollama NDJSON stream into a plain text token stream. */
export function ollamaToTextStream(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      const encoder = new TextEncoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const json = JSON.parse(trimmed) as {
                message?: { content?: string };
                error?: string;
              };
              if (json.error) {
                controller.error(new Error(json.error));
                return;
              }
              const token = json.message?.content ?? "";
              if (token) controller.enqueue(encoder.encode(token));
            } catch {
              // skip malformed chunks
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

export class OllamaError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OllamaError";
    this.status = status;
  }
}
