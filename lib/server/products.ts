import { eq } from "drizzle-orm";
import { getDb, getImagesBucket } from "@/lib/cloudflare";
import { products as productsTable } from "@/lib/schema";
import { getStockStatus } from "@/lib/utils";
import type { Product } from "@/lib/types";

type ProductRow = typeof productsTable.$inferSelect;
type ProductInsert = typeof productsTable.$inferInsert;

function toApiProduct(row: ProductRow): Product {
  return {
    itemCode: row.itemCode,
    description: row.description,
    category: row.category,
    mrp: row.mrp,
    wholesaleRate: row.wholesaleRate,
    stockCount: row.stockCount,
    stockStatus: row.stockStatus as Product["stockStatus"],
    lastUpdated: row.lastUpdated.toISOString(),
    image: row.imageUrl ?? undefined,
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
  const rows = await db.select().from(productsTable);
  return rows.map(toApiProduct);
}

export async function createProduct(input: {
  itemCode: string;
  description: string;
  category: string;
  mrp: number;
  wholesaleRate: number;
  stockCount: number;
  image?: string;
}): Promise<{ success: true; product: Product } | { success: false; error: string }> {
  const db = await getDb();
  const itemCode = input.itemCode.trim().toUpperCase();

  const existing = await db.select().from(productsTable).where(eq(productsTable.itemCode, itemCode));
  if (existing.length > 0) {
    return { success: false, error: `Product with Item Code '${itemCode}' already exists.` };
  }

  const row: ProductInsert = {
    itemCode,
    description: input.description.trim(),
    category: input.category,
    mrp: input.mrp,
    wholesaleRate: input.wholesaleRate,
    stockCount: input.stockCount,
    stockStatus: getStockStatus(input.stockCount),
    lastUpdated: new Date(),
    imageUrl: input.image || null,
  };
  await db.insert(productsTable).values(row);
  return { success: true, product: toApiProduct(row as ProductRow) };
}

export async function updateProduct(
  itemCode: string,
  updates: Partial<{
    description: string;
    category: string;
    mrp: number;
    wholesaleRate: number;
    stockCount: number;
    image: string;
  }>
): Promise<{ success: true; product: Product } | { success: false; error: string }> {
  const db = await getDb();
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.itemCode, itemCode));
  if (!existing) {
    return { success: false, error: `Product '${itemCode}' not found.` };
  }

  const setValues: Partial<ProductRow> = { lastUpdated: new Date() };
  if (updates.description !== undefined) setValues.description = updates.description;
  if (updates.category !== undefined) setValues.category = updates.category;
  if (updates.mrp !== undefined) setValues.mrp = updates.mrp;
  if (updates.wholesaleRate !== undefined) setValues.wholesaleRate = updates.wholesaleRate;
  if (updates.image !== undefined) setValues.imageUrl = updates.image || null;
  if (updates.stockCount !== undefined) {
    setValues.stockCount = updates.stockCount;
    setValues.stockStatus = getStockStatus(updates.stockCount);
  }

  // Clean up the old R2 object when an image is replaced or cleared.
  if (updates.image !== undefined && existing.imageUrl && existing.imageUrl !== updates.image) {
    await deleteR2ObjectSafe(existing.imageUrl);
  }

  await db.update(productsTable).set(setValues).where(eq(productsTable.itemCode, itemCode));
  return { success: true, product: toApiProduct({ ...existing, ...setValues } as ProductRow) };
}

export async function deleteProduct(itemCode: string): Promise<{ success: true } | { success: false; error: string }> {
  const db = await getDb();
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.itemCode, itemCode));
  if (!existing) {
    return { success: false, error: `Product '${itemCode}' not found.` };
  }

  await db.delete(productsTable).where(eq(productsTable.itemCode, itemCode));
  await deleteR2ObjectSafe(existing.imageUrl);

  return { success: true };
}

export async function bulkSyncProducts(
  updates: { itemCode: string; description: string; stockCount: number; mrp: number; category: string }[]
): Promise<{ successCount: number; createdCount: number }> {
  const db = await getDb();
  const existingRows = await db.select().from(productsTable);

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
      updateOps.push({
        itemCode: matched.itemCode,
        values: {
          stockCount: update.stockCount,
          stockStatus: getStockStatus(update.stockCount),
          mrp: update.mrp,
          lastUpdated: now,
        },
      });
      successCount++;
    } else {
      inserts.push({
        itemCode: cleanCode,
        description: update.description.trim(),
        category: update.category,
        mrp: update.mrp,
        wholesaleRate: Math.round(update.mrp * 0.7),
        stockCount: update.stockCount,
        stockStatus: getStockStatus(update.stockCount),
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
