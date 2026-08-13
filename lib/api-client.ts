import { AppSettings, CategoryThresholdMap, Product } from "./types";
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
  stockCount: number;
  image?: string;
  posterImage?: string;
  details?: string;
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
    stockCount: number;
    image: string;
    posterImage: string;
    details: string;
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

export async function verifyCatalogPassword(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/catalog-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    await parseJsonOrThrow(res);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Incorrect password." };
  }
}

export async function checkAdminSession(): Promise<{ authenticated: boolean; username?: string }> {
  const res = await fetch("/api/admin-auth");
  return parseJsonOrThrow(res);
}

export async function adminLogin(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    await parseJsonOrThrow(res);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Invalid Operator ID or Password credentials." };
  }
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin-auth", { method: "DELETE" });
}

export async function updateAdminCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin-auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newUsername, newPassword }),
    });
    await parseJsonOrThrow(res);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update credentials." };
  }
}

export async function fetchCategoryThresholds(): Promise<CategoryThresholdMap> {
  const res = await fetch("/api/settings/category-thresholds");
  const data = await parseJsonOrThrow(res);
  return data.categoryThresholds || {};
}

// Replaces the full category-threshold map; pass {} to clear every override
// and fall every category back to the global thresholds.
export async function saveCategoryThresholds(
  categoryThresholds: CategoryThresholdMap
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/settings/category-thresholds", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryThresholds }),
    });
    await parseJsonOrThrow(res);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save category thresholds." };
  }
}

// Pass an empty/blank password to disable the catalog gate entirely.
export async function setCatalogPassword(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/settings/catalog-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    await parseJsonOrThrow(res);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update catalog password." };
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
