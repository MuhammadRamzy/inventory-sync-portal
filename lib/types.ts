export interface Product {
  itemCode: string;
  description: string;
  category: string;
  mrp: number;
  stockCount: number;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
  lastUpdated: string;
  image?: string; // base64 compressed data url
  posterImage?: string; // feature/spec poster — second image, shown as a swipeable second slide
}

export interface AppSettings {
  whatsappNumber: string;
  lowStockThreshold: number;
  inStockMinQty: number;
  hasCatalogPassword: boolean;
}

// Per-category override of the low/in-stock cutoffs above. A category with
// no entry in the map uses the global lowStockThreshold/inStockMinQty.
export type CategoryThresholdMap = Record<string, { lowStockThreshold: number; inStockMinQty: number }>;

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalItems: number;
  totalAmount: number;
  createdAt: string;
}
