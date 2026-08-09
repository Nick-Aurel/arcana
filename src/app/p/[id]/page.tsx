import { Workspace } from "@/components/workspace";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { toPage } from "@/lib/pages";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PageRoute({ params }: Props) {
  const { id } = await params;
  const [row] = await db.select().from(pages).where(eq(pages.id, id));
  if (!row) notFound();

  const all = await db.select().from(pages).orderBy(desc(pages.updatedAt));

  return (
    <Workspace initialPages={all.map(toPage)} activePage={toPage(row)} />
  );
}
