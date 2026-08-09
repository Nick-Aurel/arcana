export type AiAction =
  | "summarize"
  | "rewrite"
  | "ask"
  | "bullets"
  | "checklist";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const SYSTEM: Record<Exclude<AiAction, "ask">, string> = {
  summarize:
    "You are Arcana, a concise writing assistant. Summarize the user's note clearly. Preserve key facts. Use short paragraphs or bullets. Do not invent information.",
  rewrite:
    "You are Arcana, a writing assistant. Rewrite the note so it is clearer and tighter while preserving meaning. Do not add new facts. Output only the rewritten text.",
  bullets:
    "You are Arcana, a writing assistant. Transform the note into a clean markdown bullet list. Keep only substantive points. Output only the markdown list.",
  checklist:
    "You are Arcana, a writing assistant. Transform the note into a markdown checklist using '- [ ]' items. Each item should be an actionable or trackable point. Output only the checklist.",
};

export function buildMessages(
  action: AiAction,
  text: string,
  question?: string,
): ChatMessage[] {
  if (action === "ask") {
    return [
      {
        role: "system",
        content:
          "You are Arcana, a careful assistant. Answer using ONLY the provided page text. If the answer is not in the text, say you cannot find it in the page. Be concise.",
      },
      {
        role: "user",
        content: `Page text:\n\n${text}\n\nQuestion: ${question ?? ""}`,
      },
    ];
  }

  return [
    { role: "system", content: SYSTEM[action] },
    { role: "user", content: text },
  ];
}
