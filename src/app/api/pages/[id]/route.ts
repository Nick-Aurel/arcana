import { db } from "@/db";
import { pages } from "@/db/schema";
import { toPage } from "@/lib/pages";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const [row] = await db.select().from(pages).where(eq(pages.id, id));
  if (!row) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
  return NextResponse.json({ page: toPage(row) });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const [existing] = await db.select().from(pages).where(eq(pages.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    content?: string;
    parentId?: string | null;
  };

  const updates: Partial<typeof pages.$inferInsert> = {
    updatedAt: Date.now(),
  };

  if (typeof body.title === "string") {
    updates.title = body.title.trim() || "Untitled";
  }
  if (typeof body.content === "string") {
    updates.content = body.content;
  }
  if (body.parentId !== undefined) {
    updates.parentId = body.parentId;
  }

  await db.update(pages).set(updates).where(eq(pages.id, id));
  const [row] = await db.select().from(pages).where(eq(pages.id, id));
  return NextResponse.json({ page: toPage(row) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const [existing] = await db.select().from(pages).where(eq(pages.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Reparent children to root, then delete
  await db
    .update(pages)
    .set({ parentId: null, updatedAt: Date.now() })
    .where(eq(pages.parentId, id));
  await db.delete(pages).where(eq(pages.id, id));

  return NextResponse.json({ ok: true });
}
