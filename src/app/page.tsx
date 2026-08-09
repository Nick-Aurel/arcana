import { Workspace } from "@/components/workspace";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { toPage } from "@/lib/pages";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rows = await db.select().from(pages).orderBy(desc(pages.updatedAt));
  return <Workspace initialPages={rows.map(toPage)} activePage={null} />;
}
