"use client";

import React, { useState } from "react";
import { X, Trash2, Copy, Check, Share2 } from "lucide-react";
import { OrderItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  onUpdateQuantity: (itemCode: string, quantity: number) => void;
  onRemoveItem: (itemCode: string) => void;
  onClearOrder: () => void;
}

export default function OrderSummaryModal({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
}: OrderSummaryModalProps) {
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);

  if (!isOpen) return null;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.product.wholesaleRate, 0);

  // Generate WhatsApp-friendly formatted text
  const generateExportText = () => {
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let text = `*WETTA B2B ORDER* \n`;
    text += `Date: ${dateStr}\n`;
    text += `----------------------------------------\n`;
    
    items.forEach((item, index) => {
      const subtotal = item.quantity * item.product.wholesaleRate;
      text += `${index + 1}. [${item.product.itemCode}] ${item.product.description}\n`;
      text += `   Qty: ${item.quantity} pcs @ ₹${item.product.wholesaleRate.toFixed(2)} = ₹${subtotal.toFixed(2)}\n`;
    });
    
    text += `----------------------------------------\n`;
    text += `*Total Items:* ${totalItems}\n`;
    text += `*Grand Total:* ₹${totalAmount.toFixed(2)}\n`;
    text += `----------------------------------------\n`;
    text += `Generated via Sales Team Portal`;
    return text;
  };

  const handleCopyToClipboard = () => {
    const text = generateExportText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4">
      {/* Container */}
      <div className="w-full max-w-lg bg-white border border-gray-300 flex flex-col h-[85vh] sm:h-auto sm:max-h-[80vh] shadow-2xl rounded-none animate-in slide-in-from-bottom duration-250">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider">
              {showExport ? "Order Export Preview" : "Review Order Cart"}
            </span>
            <span className="bg-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded-none num-mono">
              {items.length} Lines
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-gray-400 text-sm font-bold uppercase tracking-wider">Your cart is empty</span>
              <p className="text-xs text-gray-500 mt-1">Add items from the catalog to build an order.</p>
            </div>
          ) : showExport ? (
            /* Export Preview Panel */
            <div className="space-y-4">
              <div className="border border-gray-300 p-3 bg-gray-50 font-mono text-[11px] leading-relaxed text-gray-800 whitespace-pre-wrap rounded-none max-h-[45vh] overflow-y-auto">
                {generateExportText()}
              </div>
              <div className="text-xs text-gray-500 bg-indigo-50 border border-indigo-200 p-2 text-center rounded-none font-sans">
                This formatting is optimized for sharing directly to client WhatsApp numbers.
              </div>
            </div>
          ) : (
            /* Cart Review Panel */
            <div className="space-y-2 divide-y divide-gray-200">
              {items.map((item) => (
                <div key={item.product.itemCode} className="pt-2.5 pb-2 flex items-start justify-between gap-3 font-sans">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="num-mono font-bold text-xs bg-gray-100 text-gray-800 px-1 border border-gray-300 rounded-none">
                        {item.product.itemCode}
                      </span>
                      <span className="text-[11px] text-gray-500 uppercase font-semibold">
                        {item.product.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 line-clamp-1">{item.product.description}</p>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <span>Rate:</span>
                      <span className="num-mono text-gray-700 font-semibold">{formatCurrency(item.product.wholesaleRate)}</span>
                      <span className="mx-1">•</span>
                      <span>Sub:</span>
                      <span className="num-mono text-indigo-700 font-bold">
                        {formatCurrency(item.quantity * item.product.wholesaleRate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    {/* Stepper */}
                    <div className="flex items-center border border-gray-300 bg-white rounded-none">
                      <button
                        onClick={() => onUpdateQuantity(item.product.itemCode, item.quantity - 1)}
                        className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 font-mono text-xs"
                      >
                        -
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-bold num-mono bg-gray-50 border-x border-gray-300">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.itemCode, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stockCount}
                        className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 font-mono text-xs disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        +
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => onRemoveItem(item.product.itemCode)}
                      className="p-1 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors rounded-none"
                      title="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0 space-y-3 rounded-none">
          {/* Totals Summary */}
          <div className="flex items-center justify-between text-xs font-bold text-gray-800 uppercase tracking-wider">
            <span>Totals ({totalItems} Items):</span>
            <span className="text-sm text-indigo-700 num-mono">{formatCurrency(totalAmount)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {showExport ? (
              <>
                <button
                  onClick={() => setShowExport(false)}
                  className="flex-1 erp-btn erp-btn-secondary"
                >
                  Back to Cart
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className="flex-1 erp-btn erp-btn-primary bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white font-bold"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy for WhatsApp
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClearOrder}
                  disabled={items.length === 0}
                  className="erp-btn erp-btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowExport(true)}
                  disabled={items.length === 0}
                  className="flex-1 erp-btn erp-btn-primary bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white font-bold"
                >
                  <Share2 className="h-4 w-4" /> Export Order
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
