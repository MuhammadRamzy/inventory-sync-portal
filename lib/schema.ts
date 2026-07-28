import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const products = sqliteTable("products", {
  itemCode: text("item_code").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  mrp: real("mrp").notNull(),
  wholesaleRate: real("wholesale_rate").notNull(),
  stockCount: integer("stock_count").notNull(),
  stockStatus: text("stock_status").notNull(),
  lastUpdated: integer("last_updated", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  // Path clients can fetch directly, e.g. `/api/images/{r2-object-key}`.
  imageUrl: text("image_url"),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  whatsappNumber: text("whatsapp_number").notNull(),
});
