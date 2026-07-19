"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Layers,
  RefreshCw,
  ShoppingCart,
  Plus,
  Minus,
  Send,
  Trash2,
  X,
  MessageSquare,
  Share2,
  Search,
  ShoppingBag,
  User,
  Phone,
  FileText,
  Copy,
  Check,
  ChevronRight
} from "lucide-react";
import { Product } from "@/lib/types";
import { getStoredProducts, getAppSettings } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import StockBadge from "@/components/StockBadge";
import EmptyState from "@/components/EmptyState";

export default function SalesBrochure() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cart Local States
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [copied, setCopied] = useState(false);

  // Swipe to Send States (Mobile only)
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);
  const [startX, setStartX] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Load products initially
  const loadProducts = () => {
    setLoading(true);
    const data = getStoredProducts();
    setProducts(data);

    const settings = getAppSettings();
    setAdminWhatsapp(settings.whatsappNumber);

    setLoading(false);
  };

  useEffect(() => {
    loadProducts();

    // Listen for database updates
    window.addEventListener("wetta_db_update", loadProducts);
    return () => {
      window.removeEventListener("wetta_db_update", loadProducts);
    };
  }, []);

  // Filtered categories derived from products list
  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Filtered products list
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === null || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.itemCode === product.itemCode);
      if (existing) {
        return prev.map((item) =>
          item.product.itemCode === product.itemCode
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (itemCode: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(itemCode);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.itemCode === itemCode ? { ...item, quantity: qty } : item
      )
    );
  };

  const handleRemoveFromCart = (itemCode: string) => {
    setCart((prev) => prev.filter((item) => item.product.itemCode !== itemCode));
  };

  const generateQuotationText = () => {
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const totalVal = cart.reduce((acc, item) => acc + item.product.mrp * item.quantity, 0);
    const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);

    let msg = `*WETTA BATH FITTINGS — SALES QUOTATION*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `👤 *CUSTOMER DETAILS*\n`;
    msg += `• *Name:* ${clientName.trim() || "Valued Customer"}\n`;
    if (clientPhone.trim()) {
      msg += `• *Phone:* ${clientPhone.trim()}\n`;
    }
    msg += `• *Date:* ${dateStr}\n`;
    if (clientNote.trim()) {
      msg += `• *Notes/Remarks:* ${clientNote.trim()}\n`;
    }
    msg += `\n🛒 *ITEMS IN QUOTATION*\n`;
    msg += `----------------------------------------------------------\n`;

    cart.forEach((item, idx) => {
      const numEmoji = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"][idx] || `*${idx + 1}.*`;
      msg += `${numEmoji} *${item.product.itemCode}* - ${item.product.description}\n`;
      msg += `   • *Qty:* ${item.quantity} pcs\n`;
      msg += `   • *MRP:* ${formatCurrency(item.product.mrp)}\n`;
      msg += `   • *Subtotal:* ${formatCurrency(item.product.mrp * item.quantity)}\n\n`;
    });

    msg += `----------------------------------------------------------\n\n`;
    msg += `💰 *ESTIMATED SUMMARY*\n`;
    msg += `• *Total Items:* ${cart.length} SKUs\n`;
    msg += `• *Total Quantity:* ${totalQty} pcs\n`;
    msg += `• *Grand Total:* *${formatCurrency(totalVal)}*\n\n`;
    msg += `💡 _Generated digitally via Wetta Showroom Portal_`;
    return msg;
  };

  const handleCopyQuoteToClipboard = () => {
    const text = generateQuotationText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendQuotation = (target: "admin" | "client" | "custom") => {
    let phone = "";
    if (target === "admin") {
      phone = adminWhatsapp || "919388833888";
    } else if (target === "client") {
      phone = clientPhone.replace(/[^0-9]/g, "");
    } else if (target === "custom") {
      const customNum = prompt("Enter custom WhatsApp number (with country code, e.g. 919388833888):");
      if (!customNum) return;
      phone = customNum.replace(/[^0-9]/g, "");
    }

    if (!phone) {
      alert("Please configure or enter a valid WhatsApp phone number.");
      return;
    }

    const msg = generateQuotationText();
    const encodedMsg = encodeURIComponent(msg);
    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMsg}`;
    window.open(waUrl, "_blank");
  };

  const getProductInitials = (itemCode: string, description: string) => {
    if (itemCode) {
      return itemCode.substring(0, 3).toUpperCase();
    }
    return description.substring(0, 2).toUpperCase();
  };

  // Mobile Touch Swiper Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSwiped) return;
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isSwiped || !trackRef.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    const maxSlide = trackRef.current.clientWidth - 56; // w-11 handle + margins
    const offset = Math.max(0, Math.min(diff, maxSlide));
    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    if (isSwiped || !trackRef.current) return;
    const maxSlide = trackRef.current.clientWidth - 56;
    if (swipeOffset >= maxSlide * 0.85) {
      // Success swipe state
      setSwipeOffset(maxSlide);
      setIsSwiped(true);
      handleSendQuotation("admin");
      setTimeout(() => {
        setSwipeOffset(0);
        setIsSwiped(false);
      }, 1500);
    } else {
      setSwipeOffset(0);
    }
  };

  // High-fidelity inline SVG illustrations of product categories
  const renderCategoryIllustration = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("faucet") || cat.includes("tap")) {
      return (
        <svg viewBox="0 0 100 100" className="w-14 h-14 text-slate-400 opacity-90 transition-transform duration-300 group-hover:scale-105" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 80 L35 80 A 15 15 0 0 0 50 65 L50 40 A 15 15 0 0 1 65 25 L80 25" strokeWidth="3" />
          <path d="M80 25 L80 32" strokeWidth="3" />
          <path d="M50 45 L40 45" />
          <circle cx="36" cy="45" r="3" fill="currentColor" fillOpacity="0.2" />
          <path d="M15 80 H55" strokeWidth="3.5" />
          <path d="M80 43 A 3 5 0 0 1 80 51 A 3 5 0 0 1 80 43 Z" fill="currentColor" />
        </svg>
      );
    }
    if (cat.includes("shower")) {
      return (
        <svg viewBox="0 0 100 100" className="w-14 h-14 text-slate-400 opacity-90 transition-transform duration-300 group-hover:scale-105" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M25 20 H50 A 10 10 0 0 1 60 30 V50" strokeWidth="3" />
          <path d="M40 50 H80 L75 56 H45 Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M51 62 V80" strokeDasharray="3 3" />
          <path d="M60 62 V80" strokeDasharray="3 3" />
          <path d="M69 62 V80" strokeDasharray="3 3" />
        </svg>
      );
    }
    if (cat.includes("accessory") || cat.includes("fittings")) {
      return (
        <svg viewBox="0 0 100 100" className="w-14 h-14 text-slate-400 opacity-90 transition-transform duration-300 group-hover:scale-105" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M25 35 H35 M65 35 H75" strokeWidth="3.5" />
          <rect x="30" y="30" width="40" height="10" rx="1" fill="currentColor" fillOpacity="0.2" />
          <path d="M20 40 V50 H80 V40" strokeWidth="2" />
          <path d="M35 50 V72 A 3 3 0 0 0 38 75 H62 A 3 3 0 0 0 65 72 V50" fill="currentColor" fillOpacity="0.08" />
          <path d="M35 50 H65" strokeWidth="1" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 100 100" className="w-14 h-14 text-slate-400 opacity-90 transition-transform duration-300 group-hover:scale-105" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 80 H85" strokeWidth="3.5" />
        <path d="M25 55 H75 L70 79 H30 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M50 30 H60 V40" strokeWidth="3" />
        <path d="M50 30 V55" strokeWidth="2" />
        <path d="M44 35 H50" />
      </svg>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-900 selection:text-white">
      
      {/* Sidebar - Branding, Search, Categories */}
      <aside className="w-full md:w-80 md:h-screen md:sticky md:top-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between p-5 md:p-6 shrink-0 shadow-[2px_0_8px_rgba(15,23,42,0.02)] z-30 overflow-y-auto">
        <div className="space-y-6">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-sm shrink-0 flex items-center justify-center h-10 w-10 border border-slate-200 shadow-inner">
              <Image src="/logo.png" alt="Wetta Logo" width={32} height={32} className="h-8 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                WETTA
              </h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                B2B Distribution
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed hidden md:block">
            Explore Wetta bath fittings collection, check real-time stock levels, and build custom quotations for WhatsApp sharing.
          </p>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog code or description..."
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-md py-2.5 pl-9 pr-8 text-xs text-slate-900 outline-none transition-all focus:ring-1 focus:ring-slate-800"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Collections List - Vertical on Desktop, Horizontal Scroll on Mobile */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Categories
            </span>
            <div className="flex flex-row md:flex-col gap-1.5 md:gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none snap-x snap-mandatory">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-2 text-xs font-semibold rounded-md border text-left whitespace-nowrap snap-start transition-all ${
                  selectedCategory === null
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                All Products
              </button>
              {categories.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-2 text-xs font-semibold rounded-md border text-left whitespace-nowrap snap-start transition-all ${
                      isSelected
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm font-bold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sync Status Button in Sidebar (desktop only) */}
        <div className="hidden md:flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
          <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">
            Kerala Showroom
          </span>
          <button 
            onClick={loadProducts}
            className="p-1.5 text-slate-400 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded transition-colors"
            title="Refresh database"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-slate-500" : ""}`} />
          </button>
        </div>
      </aside>

      {/* Main product area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-4 max-w-5xl w-full mx-auto">
        
        {/* Mobile Header Info */}
        <div className="flex md:hidden justify-between items-center bg-white border border-slate-200 p-3 rounded-md shadow-sm shrink-0">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            {selectedCategory || "All Collections"} ({filteredProducts.length} items)
          </span>
          <button 
            onClick={loadProducts}
            className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* High-density horizontal product listings (2-column in laptop/desktop view) */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No Products Found"
            message="We couldn't find any products matching your current search or category filters. Try checking the item code or reset the search query."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((item) => item.product.itemCode === product.itemCode);
              return (
                <div
                  key={product.itemCode}
                  className="bg-white border border-slate-200 hover:border-slate-400 rounded-lg p-3.5 flex gap-4 transition-all duration-300 shadow-[0_1px_3px_rgba(15,23,42,0.02)] group hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]"
                >
                  {/* Left Aspect-Square Thumbnail */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-slate-50 border border-slate-200/80 rounded-md flex items-center justify-center relative overflow-hidden bg-radial bg-cover">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.description}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                        <div className="scale-90">{renderCategoryIllustration(product.category)}</div>
                      </div>
                    )}

                    <div className="absolute top-1 left-1">
                      <span className="num-mono font-bold text-[8px] bg-slate-900 text-white px-1.5 py-0.2 rounded-sm shadow-sm">
                        {product.itemCode}
                      </span>
                    </div>
                  </div>

                  {/* Right Description & Details Column */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded uppercase tracking-wider">
                          {product.category}
                        </span>
                        <StockBadge count={product.stockCount} />
                      </div>
                      
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug truncate sm:whitespace-normal sm:line-clamp-2">
                        {product.description}
                      </h3>
                    </div>

                    {/* Pricing and Actions Row */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 mt-2.5">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Suggested MRP</span>
                        <span className="num-mono text-sm sm:text-base font-black text-slate-900 mt-1 block">
                          {formatCurrency(product.mrp)}
                        </span>
                      </div>

                      {/* Add to Cart Actions */}
                      {cartItem ? (
                        <div className="flex items-center border border-slate-300 bg-white rounded-md overflow-hidden shadow-xs">
                          <button
                            onClick={() => handleUpdateCartQuantity(product.itemCode, cartItem.quantity - 1)}
                            className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-550 hover:text-slate-900 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2.5 text-xs font-bold num-mono text-slate-900">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateCartQuantity(product.itemCode, cartItem.quantity + 1)}
                            className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-550 hover:text-slate-900 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors text-xs flex items-center gap-1.5 rounded-md shadow-xs shrink-0"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Branding info */}
        <footer className="text-center py-8 text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-200 mt-10 space-y-1">
          <div>WETTA BATH FITTINGS &copy; {new Date().getFullYear()} • KERALA DISTRIBUTOR</div>
          <div className="text-[9px] text-slate-400 font-medium normal-case tracking-normal">
            Made by <span className="font-semibold text-slate-600">Mr.Solutions</span> |{" "}
            <a
              href="https://wa.me/917592887426"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors font-semibold"
            >
              for digital solutions
            </a>
          </div>
        </footer>

      </main>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white p-4 shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-2 border-2 border-white rounded-full animate-fade-in hover:scale-103 group"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Quotation Cart</span>
          <span className="bg-white text-slate-900 font-black text-xs px-2.5 py-0.5 rounded-full num-mono shadow-sm group-hover:scale-105 transition-transform">
            {cart.reduce((acc, item) => acc + item.quantity, 0)}
          </span>
          <span className="absolute -inset-1 rounded-full border border-slate-850 animate-ping opacity-25 pointer-events-none" />
        </button>
      )}

      {/* Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-xs flex justify-end animate-fade-in">
          {/* Main Drawer Body */}
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-l border-slate-250 animate-slide-in text-slate-900">
            
            {/* Header */}
            <div className="bg-slate-900 px-5 py-5 flex items-center justify-between shrink-0 text-white border-b border-slate-950">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5.5 w-5.5 text-slate-300" />
                <h3 className="font-bold text-base uppercase tracking-wider">Quotation Builder</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-750 rounded-md transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-4">
                  <ShoppingCart className="h-14 w-14 mx-auto text-slate-250" />
                  <p className="font-bold text-xs uppercase tracking-widest">Your quotation cart is empty</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cart Header with Clear All Button */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Selected Items ({cart.length})
                    </span>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to clear your cart?")) {
                          setCart([]);
                        }
                      }}
                      className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Clear All
                    </button>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-3.5">
                    {cart.map((item) => (
                      <div key={item.product.itemCode} className="border border-slate-200 p-3 bg-slate-50/75 rounded-lg flex items-center gap-3.5 relative hover:border-slate-350 transition-colors">
                        {/* Thumbnail */}
                        <div className="h-12 w-12 bg-white border border-slate-200 flex items-center justify-center shrink-0 rounded overflow-hidden">
                          {item.product.image ? (
                            <img src={item.product.image} alt={item.product.description} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">{getProductInitials(item.product.itemCode, item.product.description)}</span>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="num-mono font-bold text-[9px] bg-slate-900 text-white px-2 py-0.2 rounded-sm">{item.product.itemCode}</span>
                            <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-2 py-0.2 rounded-sm uppercase tracking-wide truncate border border-slate-200">{item.product.category}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 truncate mt-1">{item.product.description}</h4>
                          
                          {/* Quantity Controls inside Cart Drawer */}
                          <div className="flex justify-between items-center mt-3">
                            <div className="flex items-center border border-slate-300 bg-white rounded overflow-hidden">
                              <button
                                onClick={() => handleUpdateCartQuantity(item.product.itemCode, item.quantity - 1)}
                                className="px-2 py-1 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors"
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                              <span className="px-2 text-xs font-bold num-mono text-slate-850">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateCartQuantity(item.product.itemCode, item.quantity + 1)}
                                className="px-2 py-1 hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors"
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <span className="num-mono text-xs font-bold text-slate-905">
                              {formatCurrency(item.product.mrp * item.quantity)}
                            </span>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleRemoveFromCart(item.product.itemCode)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-650 border border-transparent hover:border-slate-200 rounded transition-all shrink-0 self-start"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Total:</span>
                    <span className="num-mono text-lg font-black text-slate-900">
                      {formatCurrency(cart.reduce((acc, item) => acc + item.product.mrp * item.quantity, 0))}
                    </span>
                  </div>

                  {/* Client Details Form */}
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-slate-550 uppercase tracking-widest flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" /> Client Details & Quotation Note
                    </h4>
                    
                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label htmlFor="clientName" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Client Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="clientName"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="E.G., Ramachandran K."
                            className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-md py-3 pl-9 pr-3 text-xs text-slate-800 outline-none transition-all"
                          />
                          <User className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label htmlFor="clientPhone" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Client WhatsApp Phone (Optional)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="clientPhone"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            placeholder="E.G., 9388833888"
                            className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-md py-3 pl-9 pr-3 text-xs text-slate-800 outline-none num-mono transition-all"
                          />
                          <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="clientNote" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Remarks / Special Notes
                        </label>
                        <div className="relative">
                          <textarea
                            id="clientNote"
                            value={clientNote}
                            onChange={(e) => setClientNote(e.target.value)}
                            placeholder="E.G., Requesting 10% discount on health faucets..."
                            rows={2.5}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-md py-3 pl-9 pr-3 text-xs text-slate-800 outline-none resize-none transition-all"
                          />
                          <FileText className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            {cart.length > 0 && (
              <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-3.5 shrink-0">
                {/* Desktop Send to Admin Button */}
                <button
                  onClick={() => handleSendQuotation("admin")}
                  className="hidden md:flex w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors text-xs uppercase tracking-wider items-center justify-center gap-2 rounded-md shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" /> Send to Admin WhatsApp
                </button>

                {/* Swipe to Send for Mobile Only */}
                <div className="block md:hidden w-full pt-1">
                  <div 
                    ref={trackRef}
                    className="bg-slate-100/90 border border-slate-300 rounded-full h-14 relative flex items-center justify-center overflow-hidden w-full shadow-inner select-none"
                  >
                    {/* Sliding Progress Indicator (Grows with swipe offset) */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-indigo-50 border-r border-indigo-200/50 rounded-l-full pointer-events-none transition-all duration-75"
                      style={{ width: `${swipeOffset + 44}px` }}
                    />

                    {/* Shimmering Flowing Arrow Guides */}
                    {!isSwiped && (
                      <div className="absolute right-6 flex items-center gap-1.5 text-slate-400 pointer-events-none">
                        <ChevronRight className="h-3.5 w-3.5 animate-swipe-flow [animation-delay:0ms]" />
                        <ChevronRight className="h-3.5 w-3.5 animate-swipe-flow [animation-delay:200ms]" />
                        <ChevronRight className="h-3.5 w-3.5 animate-swipe-flow [animation-delay:400ms]" />
                      </div>
                    )}

                    <span 
                      className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 pointer-events-none transition-opacity duration-150 animate-pulse relative z-10"
                      style={{ opacity: Math.max(0.1, 1 - (swipeOffset / ((trackRef.current?.clientWidth || 300) - 56)) * 1.5) }}
                    >
                      {isSwiped ? "Sending..." : "Swipe to Send to Admin"}
                    </span>
                    
                    {/* Touch Swipe Slider Handle */}
                    <div
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{ transform: `translateX(${swipeOffset}px)` }}
                      className={`absolute left-1.5 top-1.5 h-11 w-11 rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing transition-all duration-75 relative z-20 ${
                        isSwiped 
                          ? "bg-emerald-600 text-white" 
                          : "bg-slate-900 text-white ring-4 ring-slate-950/10 active:ring-slate-950/20"
                      }`}
                    >
                      {isSwiped ? (
                        <Send className="h-4.5 w-4.5 animate-bounce" />
                      ) : (
                        <MessageSquare className="h-4.5 w-4.5" />
                      )}
                    </div>
                  </div>
                </div>

                {clientPhone.trim() && (
                  <button
                    onClick={() => handleSendQuotation("client")}
                    className="w-full py-3 bg-[#15803d] hover:bg-[#166534] text-white font-bold transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2 rounded-md shadow-sm"
                  >
                    <Send className="h-4 w-4" /> Send to Client WhatsApp
                  </button>
                )}

                {/* Copy to Clipboard and Share Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyQuoteToClipboard}
                    className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold transition-all text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-md"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 animate-in zoom-in-50" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy Text
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleSendQuotation("custom")}
                    className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold transition-all text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-md"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share Custom
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
