import type { PageRow } from "@/db/schema";

export type Page = {
  id: string;
  title: string;
  parentId: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export function toPage(row: PageRow): Page {
  return {
    id: row.id,
    title: row.title,
    parentId: row.parentId ?? null,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const EMPTY_DOCUMENT = "[]";
