import { pgTable, text, integer, doublePrecision, timestamp, varchar } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  itemCode: varchar("item_code", { length: 255 }).primaryKey(),
  description: text("description").notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  mrp: doublePrecision("mrp").notNull(),
  wholesaleRate: doublePrecision("wholesale_rate").notNull(),
  stockCount: integer("stock_count").notNull(),
  stockStatus: varchar("stock_status", { length: 50 }).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  imageUrl: text("image_url"), // Optional image URL for Cloudflare R2
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }).notNull(),
});
