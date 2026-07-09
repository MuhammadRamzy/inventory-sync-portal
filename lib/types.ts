export interface Product {
  itemCode: string;
  description: string;
  category: "Health Faucets" | "Showers" | "Accessories";
  mrp: number;
  wholesaleRate: number;
  stockCount: number;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
  lastUpdated: string;
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
