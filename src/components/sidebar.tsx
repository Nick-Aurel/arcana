"use client";

import type { Page } from "@/lib/pages";
import Link from "next/link";
import { useMemo, useState } from "react";

type SidebarProps = {
  pages: Page[];
  activeId?: string;
  onCreate: (parentId?: string | null) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  creating?: boolean;
};

type TreeNode = Page & { children: TreeNode[] };

function buildTree(pages: Page[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const page of pages) {
    map.set(page.id, { ...page, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => b.updatedAt - a.updatedAt);
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

function PageItem({
  node,
  depth,
  activeId,
  onCreate,
  onRename,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  activeId?: string;
  onCreate: (parentId?: string | null) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);
  const active = activeId === node.id;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
          active
            ? "bg-[var(--arc-sidebar-active)] text-[var(--arc-ink)]"
            : "text-[var(--arc-ink-muted)] hover:bg-[var(--arc-sidebar-hover)] hover:text-[var(--arc-ink)]"
        }`}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
      >
        <Link
          href={`/p/${node.id}`}
          className="min-w-0 flex-1 truncate font-medium"
          onClick={(e) => {
            if (editing) e.preventDefault();
          }}
        >
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={async () => {
                setEditing(false);
                if (draft.trim() && draft !== node.title) {
                  await onRename(node.id, draft.trim());
                } else {
                  setDraft(node.title);
                }
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === "Escape") {
                  setDraft(node.title);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-[var(--arc-border)] bg-[var(--arc-surface)] px-1 py-0.5 text-[var(--arc-ink)] outline-none"
              onClick={(e) => e.preventDefault()}
            />
          ) : (
            node.title || "Untitled"
          )}
        </Link>
        <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
          <button
            type="button"
            title="Rename"
            className="rounded px-1 text-xs opacity-70 hover:opacity-100"
            onClick={() => {
              setDraft(node.title);
              setEditing(true);
            }}
          >
            ✎
          </button>
          <button
            type="button"
            title="Add sub-page"
            className="rounded px-1 text-xs opacity-70 hover:opacity-100"
            onClick={() => onCreate(node.id)}
          >
            +
          </button>
          <button
            type="button"
            title="Delete"
            className="rounded px-1 text-xs opacity-70 hover:text-red-600 hover:opacity-100"
            onClick={() => {
              if (confirm(`Delete “${node.title}”?`)) onDelete(node.id);
            }}
          >
            ×
          </button>
        </div>
      </div>
      {node.children.map((child) => (
        <PageItem
          key={child.id}
          node={child}
          depth={depth + 1}
          activeId={activeId}
          onCreate={onCreate}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export function Sidebar({
  pages,
  activeId,
  onCreate,
  onRename,
  onDelete,
  creating,
}: SidebarProps) {
  const tree = useMemo(() => buildTree(pages), [pages]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--arc-border)] bg-[var(--arc-sidebar)]">
      <div className="flex items-center justify-between px-4 pb-2 pt-5">
        <Link href="/" className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--arc-ink)]">
          Arcana
        </Link>
        <button
          type="button"
          onClick={() => onCreate(null)}
          disabled={creating}
          className="rounded-md bg-[var(--arc-accent)] px-2 py-1 text-xs font-medium text-[var(--arc-accent-fg)] transition hover:opacity-90 disabled:opacity-50"
        >
          New
        </button>
      </div>
      <p className="px-4 pb-3 text-xs text-[var(--arc-ink-faint)]">
        Local notes · Ollama AI
      </p>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {tree.length === 0 ? (
          <div className="mx-2 rounded-lg border border-dashed border-[var(--arc-border)] px-3 py-6 text-center text-xs text-[var(--arc-ink-faint)]">
            No pages yet.
            <button
              type="button"
              className="mt-2 block w-full text-[var(--arc-accent)] underline-offset-2 hover:underline"
              onClick={() => onCreate(null)}
            >
              Create your first page
            </button>
          </div>
        ) : (
          tree.map((node) => (
            <PageItem
              key={node.id}
              node={node}
              depth={0}
              activeId={activeId}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        )}
      </nav>
    </aside>
  );
}
