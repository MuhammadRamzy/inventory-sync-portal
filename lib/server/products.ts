import { eq } from "drizzle-orm";
import { getDb, getImagesBucket } from "@/lib/cloudflare";
import { products as productsTable, settings as settingsTable } from "@/lib/schema";
import { getStockStatus } from "@/lib/utils";
import type { Product } from "@/lib/types";

type ProductRow = typeof productsTable.$inferSelect;
type ProductInsert = typeof productsTable.$inferInsert;

type StockThresholds = { lowStockThreshold: number; inStockMinQty: number };
type ThresholdConfig = { global: StockThresholds; byCategory: Record<string, StockThresholds> };

// Stock status is always re-derived from stockCount + the current thresholds
// (rather than trusting the stored stockStatus column), so changing them in
// admin settings applies retroactively to every product immediately, without
// needing to re-save each one. A category with no override in
// `categoryThresholds` falls back to the global low/in-stock cutoffs.
async function getThresholdConfig(db: Awaited<ReturnType<typeof getDb>>): Promise<ThresholdConfig> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  const global: StockThresholds = {
    lowStockThreshold: row?.lowStockThreshold ?? 50,
    inStockMinQty: row?.inStockMinQty ?? 51,
  };
  let byCategory: Record<string, StockThresholds> = {};
  if (row?.categoryThresholds) {
    try {
      const parsed = JSON.parse(row.categoryThresholds);
      if (parsed && typeof parsed === "object") byCategory = parsed;
    } catch (err) {
      console.error("Failed to parse categoryThresholds JSON:", err);
    }
  }
  return { global, byCategory };
}

function resolveThresholds(category: string, config: ThresholdConfig): StockThresholds {
  return config.byCategory[category] ?? config.global;
}

function toApiProduct(row: ProductRow, config: ThresholdConfig): Product {
  const thresholds = resolveThresholds(row.category, config);
  return {
    itemCode: row.itemCode,
    description: row.description,
    category: row.category,
    mrp: row.mrp,
    stockCount: row.stockCount,
    stockStatus: getStockStatus(row.stockCount, thresholds.lowStockThreshold, thresholds.inStockMinQty),
    lastUpdated: row.lastUpdated.toISOString(),
    image: row.imageUrl ?? undefined,
    posterImage: row.posterImageUrl ?? undefined,
  };
}

function imageUrlToR2Key(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const match = imageUrl.match(/^\/api\/images\/(.+)$/);
  return match ? match[1] : null;
}

async function deleteR2ObjectSafe(imageUrl: string | null | undefined) {
  const key = imageUrlToR2Key(imageUrl);
  if (!key) return;
  const bucket = await getImagesBucket();
  await bucket.delete(key).catch((err) => console.error("Failed to delete stale R2 object:", err));
}

export async function listProducts(): Promise<Product[]> {
  const db = await getDb();
  const [rows, config] = await Promise.all([db.select().from(productsTable), getThresholdConfig(db)]);
  return rows.map((row) => toApiProduct(row, config));
}

export async function createProduct(input: {
  itemCode: string;
  description: string;
  category: string;
  mrp: number;
  stockCount: number;
  image?: string;
  posterImage?: string;
}): Promise<{ success: true; product: Product } | { success: false; error: string }> {
  const db = await getDb();
  const itemCode = input.itemCode.trim().toUpperCase();

  const existing = await db.select().from(productsTable).where(eq(productsTable.itemCode, itemCode));
  if (existing.length > 0) {
    return { success: false, error: `Product with Item Code '${itemCode}' already exists.` };
  }

  const config = await getThresholdConfig(db);
  const thresholds = resolveThresholds(input.category, config);
  const row: ProductInsert = {
    itemCode,
    description: input.description.trim(),
    category: input.category,
    mrp: input.mrp,
    stockCount: input.stockCount,
    stockStatus: getStockStatus(input.stockCount, thresholds.lowStockThreshold, thresholds.inStockMinQty),
    lastUpdated: new Date(),
    imageUrl: input.image || null,
    posterImageUrl: input.posterImage || null,
  };
  await db.insert(productsTable).values(row);
  return { success: true, product: toApiProduct(row as ProductRow, config) };
}

export async function updateProduct(
  itemCode: string,
  updates: Partial<{
    description: string;
    category: string;
    mrp: number;
    stockCount: number;
    image: string;
    posterImage: string;
  }>
): Promise<{ success: true; product: Product } | { success: false; error: string }> {
  const db = await getDb();
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.itemCode, itemCode));
  if (!existing) {
    return { success: false, error: `Product '${itemCode}' not found.` };
  }

  const config = await getThresholdConfig(db);
  const setValues: Partial<ProductRow> = { lastUpdated: new Date() };
  if (updates.description !== undefined) setValues.description = updates.description;
  if (updates.category !== undefined) setValues.category = updates.category;
  if (updates.mrp !== undefined) setValues.mrp = updates.mrp;
  if (updates.image !== undefined) setValues.imageUrl = updates.image || null;
  if (updates.posterImage !== undefined) setValues.posterImageUrl = updates.posterImage || null;
  if (updates.stockCount !== undefined) {
    setValues.stockCount = updates.stockCount;
    // Uses the effective category (the one being set in this same update, if
    // any, else the product's existing category) so a simultaneous
    // category + stock-count change resolves thresholds against the new
    // category rather than the stale one.
    const effectiveCategory = updates.category ?? existing.category;
    const thresholds = resolveThresholds(effectiveCategory, config);
    setValues.stockStatus = getStockStatus(updates.stockCount, thresholds.lowStockThreshold, thresholds.inStockMinQty);
  }

  // Clean up the old R2 object(s) when an image is replaced or cleared.
  if (updates.image !== undefined && existing.imageUrl && existing.imageUrl !== updates.image) {
    await deleteR2ObjectSafe(existing.imageUrl);
  }
  if (updates.posterImage !== undefined && existing.posterImageUrl && existing.posterImageUrl !== updates.posterImage) {
    await deleteR2ObjectSafe(existing.posterImageUrl);
  }

  await db.update(productsTable).set(setValues).where(eq(productsTable.itemCode, itemCode));
  return { success: true, product: toApiProduct({ ...existing, ...setValues } as ProductRow, config) };
}

export async function deleteProduct(itemCode: string): Promise<{ success: true } | { success: false; error: string }> {
  const db = await getDb();
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.itemCode, itemCode));
  if (!existing) {
    return { success: false, error: `Product '${itemCode}' not found.` };
  }

  await db.delete(productsTable).where(eq(productsTable.itemCode, itemCode));
  await deleteR2ObjectSafe(existing.imageUrl);
  await deleteR2ObjectSafe(existing.posterImageUrl);

  return { success: true };
}

export async function bulkSyncProducts(
  updates: { itemCode: string; description: string; stockCount: number; mrp: number; category: string }[]
): Promise<{ successCount: number; createdCount: number }> {
  const db = await getDb();
  const [existingRows, config] = await Promise.all([db.select().from(productsTable), getThresholdConfig(db)]);

  let successCount = 0;
  let createdCount = 0;
  const now = new Date();
  const inserts: ProductInsert[] = [];
  const updateOps: { itemCode: string; values: Partial<ProductRow> }[] = [];

  updates.forEach((update) => {
    const cleanCode = update.itemCode.trim().toUpperCase();
    const cleanDesc = update.description.trim().toUpperCase();

    const matched =
      existingRows.find((p) => p.itemCode.toUpperCase() === cleanCode) ||
      existingRows.find((p) => p.description.trim().toUpperCase() === cleanDesc);

    if (matched) {
      const thresholds = resolveThresholds(matched.category, config);
      updateOps.push({
        itemCode: matched.itemCode,
        values: {
          stockCount: update.stockCount,
          stockStatus: getStockStatus(update.stockCount, thresholds.lowStockThreshold, thresholds.inStockMinQty),
          mrp: update.mrp,
          lastUpdated: now,
        },
      });
      successCount++;
    } else {
      const thresholds = resolveThresholds(update.category, config);
      inserts.push({
        itemCode: cleanCode,
        description: update.description.trim(),
        category: update.category,
        mrp: update.mrp,
        stockCount: update.stockCount,
        stockStatus: getStockStatus(update.stockCount, thresholds.lowStockThreshold, thresholds.inStockMinQty),
        lastUpdated: now,
        imageUrl: null,
      });
      createdCount++;
    }
  });

  // Batched as a single D1 round-trip instead of N sequential read/write calls.
  const statements = [
    ...inserts.map((row) => db.insert(productsTable).values(row)),
    ...updateOps.map((op) => db.update(productsTable).set(op.values).where(eq(productsTable.itemCode, op.itemCode))),
  ];
  if (statements.length > 0) {
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  }

  return { successCount, createdCount };
}
