import { db } from "@/db";
import { pages } from "@/db/schema";
import { EMPTY_DOCUMENT, toPage } from "@/lib/pages";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function GET() {
  const rows = await db.select().from(pages).orderBy(desc(pages.updatedAt));
  return NextResponse.json({ pages: rows.map(toPage) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    parentId?: string | null;
  };

  const now = Date.now();
  const id = randomUUID();
  const title = body.title?.trim() || "Untitled";
  const parentId = body.parentId ?? null;

  await db.insert(pages).values({
    id,
    title,
    parentId,
    content: EMPTY_DOCUMENT,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db.select().from(pages).where(eq(pages.id, id));
  return NextResponse.json({ page: toPage(row) }, { status: 201 });
}
