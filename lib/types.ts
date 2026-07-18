export interface Product {
  itemCode: string;
  description: string;
  category: string;
  mrp: number;
  wholesaleRate: number;
  stockCount: number;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
  lastUpdated: string;
  image?: string; // base64 compressed data url
}

export interface AppSettings {
  whatsappNumber: string;
}

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
