import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const pages = sqliteTable("pages", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Untitled"),
  parentId: text("parent_id"),
  content: text("content").notNull().default("[]"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type PageRow = typeof pages.$inferSelect;
export type NewPageRow = typeof pages.$inferInsert;
