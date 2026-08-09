"use client";

import { AiPanel } from "@/components/ai-panel";
import type { EditorHandle } from "@/components/editor";
import { Sidebar } from "@/components/sidebar";
import type { Page } from "@/lib/pages";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const DynamicEditor = dynamic(
  () => import("@/components/editor").then((m) => m.PageEditor),
  {
    ssr: false,
    loading: () => (
      <div className="px-8 py-12 text-sm text-[var(--arc-ink-faint)]">
        Loading editor…
      </div>
    ),
  },
);

type WorkspaceProps = {
  initialPages: Page[];
  activePage?: Page | null;
};

export function Workspace({ initialPages, activePage }: WorkspaceProps) {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [page, setPage] = useState<Page | null | undefined>(activePage);
  const [title, setTitle] = useState(activePage?.title ?? "");
  const [creating, setCreating] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const editorRef = useRef<EditorHandle | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPages(initialPages);
  }, [initialPages]);

  useEffect(() => {
    setPage(activePage);
    setTitle(activePage?.title ?? "");
    editorRef.current = null;
  }, [activePage]);

  const refreshPages = useCallback(async () => {
    const res = await fetch("/api/pages");
    const data = (await res.json()) as { pages: Page[] };
    setPages(data.pages);
  }, []);

  const createPage = useCallback(
    async (parentId?: string | null) => {
      setCreating(true);
      try {
        const res = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: parentId ?? null }),
        });
        const data = (await res.json()) as { page: Page };
        await refreshPages();
        router.push(`/p/${data.page.id}`);
      } finally {
        setCreating(false);
      }
    },
    [refreshPages, router],
  );

  const renamePage = useCallback(
    async (id: string, nextTitle: string) => {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      const data = (await res.json()) as { page: Page };
      await refreshPages();
      if (page?.id === id) {
        setPage(data.page);
        setTitle(data.page.title);
      }
    },
    [page?.id, refreshPages],
  );

  const deletePage = useCallback(
    async (id: string) => {
      await fetch(`/api/pages/${id}`, { method: "DELETE" });
      await refreshPages();
      if (page?.id === id) {
        router.push("/");
      }
    },
    [page?.id, refreshPages, router],
  );

  const saveContent = useCallback(
    async (content: string) => {
      if (!page) return;
      setSaveState("saving");
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as { page: Page };
      setPage(data.page);
      setSaveState("saved");
      await refreshPages();
    },
    [page, refreshPages],
  );

  const saveTitle = useCallback(
    (next: string) => {
      setTitle(next);
      if (!page) return;
      if (titleTimer.current) clearTimeout(titleTimer.current);
      titleTimer.current = setTimeout(async () => {
        setSaveState("saving");
        const res = await fetch(`/api/pages/${page.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: next }),
        });
        const data = (await res.json()) as { page: Page };
        setPage(data.page);
        setSaveState("saved");
        await refreshPages();
      }, 400);
    },
    [page, refreshPages],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--arc-bg)]">
      <Sidebar
        pages={pages}
        activeId={page?.id}
        onCreate={createPage}
        onRename={renamePage}
        onDelete={deletePage}
        creating={creating}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {page ? (
          <>
            <header className="flex items-center justify-between gap-4 border-b border-[var(--arc-border)] px-8 py-4">
              <input
                value={title}
                onChange={(e) => saveTitle(e.target.value)}
                className="w-full bg-transparent font-[family-name:var(--font-display)] text-3xl text-[var(--arc-ink)] outline-none placeholder:text-[var(--arc-ink-faint)]"
                placeholder="Untitled"
              />
              <span className="shrink-0 text-xs text-[var(--arc-ink-faint)]">
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved"
                    : ""}
              </span>
            </header>
            <div className="flex min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <DynamicEditor
                  key={page.id}
                  pageId={page.id}
                  initialContent={page.content}
                  onChange={saveContent}
                  onReady={(handle) => {
                    editorRef.current = handle;
                  }}
                />
              </div>
              <AiPanel
                getText={() => editorRef.current?.getMarkdown() ?? ""}
                onInsert={(md) => {
                  void editorRef.current?.insertMarkdown(md);
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--arc-ink)]">
              Arcana
            </h1>
            <p className="mt-3 max-w-md text-sm text-[var(--arc-ink-muted)]">
              Your local Notion-like workspace. Pick a page in the sidebar or
              create one to start writing — AI runs on your machine via Ollama.
            </p>
            <button
              type="button"
              onClick={() => createPage(null)}
              className="mt-6 rounded-md bg-[var(--arc-accent)] px-4 py-2 text-sm font-medium text-[var(--arc-accent-fg)]"
            >
              New page
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
