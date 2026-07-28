import { AppSettings, Product } from "./types";
import { dataUrlToBlob } from "./utils";

async function parseJsonOrThrow(res: Response): Promise<any> {
  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed with status ${res.status}`);
  }
  return data;
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  return parseJsonOrThrow(res);
}

export async function createProduct(input: {
  itemCode: string;
  description: string;
  category: string;
  mrp: number;
  wholesaleRate: number;
  stockCount: number;
  image?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await parseJsonOrThrow(res);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create product." };
  }
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemCode, ...updates }),
    });
    await parseJsonOrThrow(res);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update product." };
  }
}

export async function deleteProduct(itemCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/products?itemCode=${encodeURIComponent(itemCode)}`, { method: "DELETE" });
    await parseJsonOrThrow(res);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete product." };
  }
}

export async function bulkSyncProducts(
  updates: { itemCode: string; description: string; stockCount: number; mrp: number; category: string }[]
): Promise<{ successCount: number; createdCount: number }> {
  const res = await fetch("/api/products/bulk-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });
  return parseJsonOrThrow(res);
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch("/api/settings");
  return parseJsonOrThrow(res);
}

export async function saveSettings(settings: AppSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    await parseJsonOrThrow(res);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save settings." };
  }
}

// Uploads a (already client-side compressed, see compressImage in lib/utils.ts)
// image data URL to R2 and returns the path to fetch it back from.
export async function uploadImage(dataUrl: string, filename: string): Promise<{ url: string } | { error: string }> {
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const formData = new FormData();
    formData.append("file", blob, filename);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await parseJsonOrThrow(res);
    return { url: data.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to upload image." };
  }
}
