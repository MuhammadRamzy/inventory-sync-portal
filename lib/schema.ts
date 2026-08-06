import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const products = sqliteTable("products", {
  itemCode: text("item_code").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  mrp: real("mrp").notNull(),
  stockCount: integer("stock_count").notNull(),
  stockStatus: text("stock_status").notNull(),
  lastUpdated: integer("last_updated", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  // Path clients can fetch directly, e.g. `/api/images/{r2-object-key}`.
  imageUrl: text("image_url"),
  // Second, optional image — a feature/spec "poster" for the product, shown
  // as a second swipeable slide in the sales catalog's product detail card.
  posterImageUrl: text("poster_image_url"),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  whatsappNumber: text("whatsapp_number").notNull(),
  // Counts from 1 up to this number show "Low Stock"; 0 always shows "Out of
  // Stock". Configurable from the admin Config Settings tab.
  lowStockThreshold: integer("low_stock_threshold").notNull().default(50),
  // Counts at or above this show "In Stock". Must be greater than
  // lowStockThreshold — anything in between (if the admin leaves a gap) is
  // treated as "Low Stock" too, the conservative default.
  inStockMinQty: integer("in_stock_min_qty").notNull().default(51),
  // SHA-256 hash of the shared catalog password (bcrypt-less to stay
  // consistent with the existing admin login scheme). Null/empty means the
  // catalog is open with no password gate.
  catalogPasswordHash: text("catalog_password_hash"),
  // Server-verified admin console credentials (see lib/server/auth.ts) — this
  // used to live entirely client-side in localStorage, which meant every
  // mutating API route was reachable by anyone who knew the URL. Defaults
  // match the app's long-standing factory-default admin login.
  adminUsername: text("admin_username").notNull().default("admin"),
  adminPasswordHash: text("admin_password_hash")
    .notNull()
    .default("8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"),
  // Per-category overrides for the low/in-stock cutoffs above, JSON-encoded
  // as Record<category, {lowStockThreshold, inStockMinQty}>. A category with
  // no entry here falls back to the global lowStockThreshold/inStockMinQty.
  // Null/empty means no category has a custom override.
  categoryThresholds: text("category_thresholds"),
});
