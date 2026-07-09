"use client";

import { Info } from "lucide-react";

interface EmptyStateProps {
  title: string;
  message: string;
}

export default function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-300 bg-gray-50/50 rounded-none">
      <Info className="h-6 w-6 text-gray-400 mb-2" />
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 max-w-md">{message}</p>
    </div>
  );
}
