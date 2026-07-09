"use client";

import { getStockStatus } from "@/lib/utils";

interface StockBadgeProps {
  count: number;
}

export default function StockBadge({ count }: StockBadgeProps) {
  const status = getStockStatus(count);

  let styles = "";
  switch (status) {
    case "In Stock":
      styles = "border-green-600 text-green-700 bg-green-50";
      break;
    case "Low Stock":
      styles = "border-yellow-600 text-yellow-700 bg-yellow-50";
      break;
    case "Out of Stock":
      styles = "border-red-600 text-red-700 bg-red-50";
      break;
  }

  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none ${styles}`}
    >
      <span className="num-mono mr-1 font-medium">{count}</span>
      <span>{status}</span>
    </span>
  );
}
