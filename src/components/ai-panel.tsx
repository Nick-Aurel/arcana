"use client";

import type { AiAction } from "@/lib/prompts";
import { useState } from "react";

const ACTIONS: { id: AiAction; label: string; needsQuestion?: boolean }[] = [
  { id: "summarize", label: "Summarize" },
  { id: "rewrite", label: "Rewrite" },
  { id: "ask", label: "Ask about page", needsQuestion: true },
  { id: "bullets", label: "Make bullets" },
  { id: "checklist", label: "Make checklist" },
];

type AiPanelProps = {
  getText: () => string;
  onInsert: (markdown: string) => void;
};

export function AiPanel({ getText, onInsert }: AiPanelProps) {
  const [question, setQuestion] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<AiAction | null>(null);

  async function run(action: AiAction) {
    setError(null);
    setOutput("");
    setLoading(true);
    setActive(action);

    const text = getText().trim();
    if (!text) {
      setError("Page text is empty. Write something first.");
      setLoading(false);
      setActive(null);
      return;
    }

    if (action === "ask" && !question.trim()) {
      setError("Enter a question first.");
      setLoading(false);
      setActive(null);
      return;
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text,
          question: action === "ask" ? question.trim() : undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream from server.");

      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setOutput(acc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setLoading(false);
      setActive(null);
    }
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-[var(--arc-border)] bg-[var(--arc-panel)]">
      <div className="border-b border-[var(--arc-border)] px-4 py-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--arc-ink)]">
          AI
        </h2>
        <p className="mt-1 text-xs text-[var(--arc-ink-faint)]">
          Local models via Ollama. Results never overwrite your page unless you
          insert them.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-3">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={loading}
            onClick={() => run(a.id)}
            className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
              active === a.id
                ? "border-[var(--arc-accent)] bg-[var(--arc-accent)] text-[var(--arc-accent-fg)]"
                : "border-[var(--arc-border)] bg-[var(--arc-surface)] text-[var(--arc-ink)] hover:border-[var(--arc-accent)]"
            }`}
          >
            {loading && active === a.id ? "…" : a.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-3">
        <label className="text-xs text-[var(--arc-ink-faint)]">
          Question (for Ask)
        </label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What is this page about?"
          className="mt-1 w-full rounded-md border border-[var(--arc-border)] bg-[var(--arc-surface)] px-3 py-2 text-sm text-[var(--arc-ink)] outline-none focus:border-[var(--arc-accent)]"
        />
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-[var(--arc-ink-faint)]">Result</span>
          <button
            type="button"
            disabled={!output.trim() || loading}
            onClick={() => onInsert(output)}
            className="rounded-md bg-[var(--arc-accent)] px-2.5 py-1 text-xs font-medium text-[var(--arc-accent-fg)] disabled:opacity-40"
          >
            Insert into page
          </button>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--arc-border)] bg-[var(--arc-surface)] p-3 text-sm leading-relaxed text-[var(--arc-ink)]">
          {output ||
            (loading
              ? "Thinking…"
              : "Run an action to see a streamed response here.")}
        </pre>
      </div>
    </aside>
  );
}
