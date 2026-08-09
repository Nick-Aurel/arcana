"use client";

import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import type { Block } from "@blocknote/core";
import { useEffect, useRef } from "react";

export type EditorHandle = {
  getMarkdown: () => string;
  insertMarkdown: (markdown: string) => Promise<void>;
};

type PageEditorProps = {
  pageId: string;
  initialContent: string;
  onChange: (contentJson: string) => void;
  onReady?: (handle: EditorHandle) => void;
};

function parseContent(raw: string): Block[] | undefined {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Block[];
    }
  } catch {
    // fall through
  }
  return undefined;
}

export function PageEditor({
  pageId,
  initialContent,
  onChange,
  onReady,
}: PageEditorProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  onChangeRef.current = onChange;
  onReadyRef.current = onReady;

  const editor = useCreateBlockNote({
    initialContent: parseContent(initialContent),
  });

  useEffect(() => {
    const handle: EditorHandle = {
      getMarkdown: () => editor.blocksToMarkdownLossy(editor.document),
      insertMarkdown: async (markdown: string) => {
        const blocks = await editor.tryParseMarkdownToBlocks(markdown);
        editor.insertBlocks(blocks, editor.document[editor.document.length - 1], "after");
      },
    };
    onReadyRef.current?.(handle);
  }, [editor, pageId]);

  return (
    <div className="bn-editor-shell min-h-[60vh] w-full max-w-3xl">
      <BlockNoteView
        editor={editor}
        theme="light"
        onChange={() => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            onChangeRef.current(JSON.stringify(editor.document));
          }, 500);
        }}
      />
    </div>
  );
}
