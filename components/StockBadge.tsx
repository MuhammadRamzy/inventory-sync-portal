"use client";

import { getStockStatus } from "@/lib/utils";

type Status = "In Stock" | "Low Stock" | "Out of Stock";

interface StockBadgeProps {
  // Optional when `hideCount` is set and/or `status` is precomputed.
  count?: number;
  // Precomputed status (e.g. from the API, which already applies the admin's
  // configured threshold) takes priority over deriving it from count+threshold.
  status?: Status;
  // Only used to derive status when `status` isn't supplied — e.g. admin's
  // live preview of an in-progress stock count edit.
  threshold?: number;
  inStockMinQty?: number;
  // Sales catalog hides the exact number, showing only the status label.
  hideCount?: boolean;
}

export default function StockBadge({ count, status, threshold = 50, inStockMinQty = 51, hideCount }: StockBadgeProps) {
  const resolvedStatus = status ?? getStockStatus(count ?? 0, threshold, inStockMinQty);

  let styles = "";
  switch (resolvedStatus) {
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
      {!hideCount && <span className="num-mono mr-1 font-medium">{count}</span>}
      <span>{resolvedStatus}</span>
    </span>
  );
}
