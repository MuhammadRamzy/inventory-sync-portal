import { AppSettings, Product } from "./types";
import { getStockStatus } from "./utils";

const SEED_PRODUCTS: Product[] = [
  {
    itemCode: "HF103",
    description: "Conti HF GUN Wetta",
    category: "Health Faucets",
    mrp: 130.0,
    wholesaleRate: 88.0,
    stockCount: 120,
    stockStatus: "In Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "HF102",
    description: "Sparrow SS HF Gun Wetta",
    category: "Health Faucets",
    mrp: 290.0,
    wholesaleRate: 198.0,
    stockCount: 12,
    stockStatus: "Low Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "HF110",
    description: "Laser Cut HF GUN Wetta",
    category: "Health Faucets",
    mrp: 200.0,
    wholesaleRate: 134.0,
    stockCount: 0,
    stockStatus: "Out of Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "HF109",
    description: "HYGROW HF GUN",
    category: "Health Faucets",
    mrp: 160.0,
    wholesaleRate: 106.0,
    stockCount: 65,
    stockStatus: "In Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "SH115",
    description: "Shower Arm 15\" Brass Nut Wetta",
    category: "Showers",
    mrp: 310.0,
    wholesaleRate: 208.0,
    stockCount: 92,
    stockStatus: "In Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "SH111",
    description: "Soft Round Shower Head 8\" Wetta",
    category: "Showers",
    mrp: 1190.0,
    wholesaleRate: 798.0,
    stockCount: 4,
    stockStatus: "Low Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "SH119",
    description: "Qearl Shower Head 6x6 Wetta",
    category: "Showers",
    mrp: 890.0,
    wholesaleRate: 599.0,
    stockCount: 0,
    stockStatus: "Out of Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "SH109",
    description: "Speed Shower Head 6x6 Wetta",
    category: "Showers",
    mrp: 890.0,
    wholesaleRate: 596.0,
    stockCount: 88,
    stockStatus: "In Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "PV-2103",
    description: "PARV SINGLE SOAP DISH SS 304",
    category: "Accessories",
    mrp: 400.0,
    wholesaleRate: 268.0,
    stockCount: 15,
    stockStatus: "Low Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "RSD01",
    description: "Royal Soap Dish CP Wetta",
    category: "Accessories",
    mrp: 240.0,
    wholesaleRate: 158.0,
    stockCount: 110,
    stockStatus: "In Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "RSD02",
    description: "Royal Tumbler Holder CP Wetta",
    category: "Accessories",
    mrp: 330.0,
    wholesaleRate: 218.0,
    stockCount: 0,
    stockStatus: "Out of Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "RSD07",
    description: "Royal Double Soap Dish CP Wetta",
    category: "Accessories",
    mrp: 520.0,
    wholesaleRate: 348.0,
    stockCount: 55,
    stockStatus: "In Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "RSD08",
    description: "Royal Soap Dish with Tumbler CP Wetta",
    category: "Accessories",
    mrp: 590.0,
    wholesaleRate: 398.0,
    stockCount: 30,
    stockStatus: "Low Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "KD708",
    description: "TOWEL RING OVEL WETTA",
    category: "Accessories",
    mrp: 230.0,
    wholesaleRate: 156.0,
    stockCount: 72,
    stockStatus: "In Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "KD709",
    description: "TOWEL RING SQUARE WETTA",
    category: "Accessories",
    mrp: 230.0,
    wholesaleRate: 156.0,
    stockCount: 8,
    stockStatus: "Low Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "KD710",
    description: "TOWEL RING J TYPE WETTA",
    category: "Accessories",
    mrp: 230.0,
    wholesaleRate: 156.0,
    stockCount: 0,
    stockStatus: "Out of Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "KD711",
    description: "TOWEL RING ROUND WETTA",
    category: "Accessories",
    mrp: 250.0,
    wholesaleRate: 166.0,
    stockCount: 95,
    stockStatus: "In Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "CT103",
    description: "Colten Pillar Cock 7\" Wetta",
    category: "Health Faucets",
    mrp: 1400.0,
    wholesaleRate: 948.0,
    stockCount: 42,
    stockStatus: "Low Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "IR101",
    description: "Iris Pillar Cock Z Wetta",
    category: "Showers",
    mrp: 820.0,
    wholesaleRate: 549.0,
    stockCount: 18,
    stockStatus: "Low Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
  {
    itemCode: "SL108",
    description: "Sleek Sink Cock 13\" Wetta",
    category: "Accessories",
    mrp: 1180.0,
    wholesaleRate: 789.0,
    stockCount: 60,
    stockStatus: "In Stock",
    lastUpdated: "2026-07-09T12:00:00.000Z",
  },
];

const LOCAL_STORAGE_KEY = "wetta_inventory_products";

// Client-safe retrieval helper
export function getStoredProducts(): Product[] {
  if (typeof window === "undefined") {
    return SEED_PRODUCTS;
  }
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_PRODUCTS));
    return SEED_PRODUCTS;
  }
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to parse local storage inventory data", error);
    return SEED_PRODUCTS;
  }
}

export function saveStoredProducts(products: Product[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
  // Dispatch custom event to notify other components of changes
  window.dispatchEvent(new Event("wetta_db_update"));
}

export function addProduct(product: Omit<Product, "stockStatus" | "lastUpdated">): { success: boolean; error?: string } {
  const products = getStoredProducts();
  
  // Normalize code and check duplicate
  const cleanCode = product.itemCode.trim().toUpperCase();
  const exists = products.some((p) => p.itemCode.toUpperCase() === cleanCode);
  
  if (exists) {
    return { success: false, error: `Product with Item Code '${cleanCode}' already exists.` };
  }

  const newProduct: Product = {
    ...product,
    itemCode: cleanCode,
    stockStatus: getStockStatus(product.stockCount),
    lastUpdated: new Date().toISOString(),
  };

  products.push(newProduct);
  saveStoredProducts(products);
  return { success: true };
}

export function updateProductInline(
  itemCode: string,
  updates: Partial<Omit<Product, "itemCode">>
): boolean {
  const products = getStoredProducts();
  const index = products.findIndex((p) => p.itemCode === itemCode);
  if (index === -1) return false;

  const current = products[index];
  const updatedProduct = {
    ...current,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  // Re-derive stock status if stock count was updated
  if (updates.stockCount !== undefined) {
    updatedProduct.stockStatus = getStockStatus(updates.stockCount);
  }

  products[index] = updatedProduct;
  saveStoredProducts(products);
  return true;
}

export function bulkUpdateProducts(
  updates: { itemCode: string; newStockCount: number }[]
): { successCount: number; unrecognized: string[] } {
  const products = getStoredProducts();
  let successCount = 0;
  const unrecognized: string[] = [];

  const updatedProducts = products.map((product) => {
    // Find update case-insensitive matching
    const update = updates.find(
      (u) => u.itemCode.trim().toUpperCase() === product.itemCode.trim().toUpperCase()
    );

    if (update) {
      successCount++;
      return {
        ...product,
        stockCount: update.newStockCount,
        stockStatus: getStockStatus(update.newStockCount),
        lastUpdated: new Date().toISOString(),
      };
    }
    return product;
  });

  // Identify unrecognized item codes
  updates.forEach((u) => {
    const found = products.some(
      (p) => p.itemCode.trim().toUpperCase() === u.itemCode.trim().toUpperCase()
    );
    if (!found) {
      unrecognized.push(u.itemCode);
    }
  });

  saveStoredProducts(updatedProducts);
  return { successCount, unrecognized };
}

export function resetDatabase(): void {
  saveStoredProducts(SEED_PRODUCTS);
}

const SETTINGS_KEY = "wetta_settings";
const DEFAULT_SETTINGS: AppSettings = {
  whatsappNumber: "9562147862",
};

export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return DEFAULT_SETTINGS;
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function differentialStockSync(
  updates: { itemCode: string; description: string; stockCount: number; mrp: number; category: string }[]
): { successCount: number; createdCount: number } {
  const products = getStoredProducts();
  let successCount = 0;
  let createdCount = 0;

  // Copy products array to perform modifications safely
  const updatedProducts = [...products];

  updates.forEach((update) => {
    const cleanCode = update.itemCode.trim().toUpperCase();
    const cleanDesc = update.description.trim().toUpperCase();

    // Check if the product matches itemCode or description case-insensitive
    const existingIndex = updatedProducts.findIndex(
      (p) => p.itemCode.trim().toUpperCase() === cleanCode || p.description.trim().toUpperCase() === cleanDesc
    );

    if (existingIndex !== -1) {
      const current = updatedProducts[existingIndex];
      updatedProducts[existingIndex] = {
        ...current,
        stockCount: update.stockCount,
        stockStatus: getStockStatus(update.stockCount),
        mrp: update.mrp,
        lastUpdated: new Date().toISOString(),
      };
      successCount++;
    } else {
      // Create new product
      const newProduct: Product = {
        itemCode: cleanCode,
        description: update.description.trim(),
        category: update.category,
        mrp: update.mrp,
        wholesaleRate: Math.round(update.mrp * 0.7), // Default wholesale to 70% of MRP
        stockCount: update.stockCount,
        stockStatus: getStockStatus(update.stockCount),
        lastUpdated: new Date().toISOString(),
      };
      updatedProducts.push(newProduct);
      createdCount++;
    }
  });

  saveStoredProducts(updatedProducts);
  return { successCount, createdCount };
}
