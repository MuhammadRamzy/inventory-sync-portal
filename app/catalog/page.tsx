"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from "framer-motion";
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
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  AlertCircle,
  Lock,
  Images
} from "lucide-react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { fetchProducts, fetchSettings, verifyCatalogPassword } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { BRANDING } from "@/lib/branding";
import StockBadge from "@/components/StockBadge";
import EmptyState from "@/components/EmptyState";
import LogoImage from "@/components/LogoImage";

const CATALOG_AUTH_KEY = "catalog_auth_session";
const BRANDS = ["Wetta", "Waterlife"];

export default function SalesBrochure() {
  // --- Catalog privacy gate ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Cart Local States
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(BRANDS[0]);
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [copied, setCopied] = useState(false);

  // Swipe to Send States (Mobile only)
  const [isSwiped, setIsSwiped] = useState(false);
  const sliderConstraintsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Apple Design Default Springs
  const springCrit = { type: "spring", bounce: 0, duration: 0.4 } as const;
  const springBouncy = { type: "spring", bounce: 0.2, duration: 0.4 } as const;

  // Load products initially
  const loadProducts = async () => {
    setLoading(true);
    try {
      const [data, settings] = await Promise.all([fetchProducts(), fetchSettings()]);
      setProducts(data);
      setAdminWhatsapp(settings.whatsappNumber);
    } catch (error) {
      console.error("Failed to load catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  // Catalog privacy gate: if this browser already has a valid session flag,
  // skip straight in. Otherwise check whether the admin has a password set
  // at all before deciding whether to show the lock screen.
  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== "undefined" && localStorage.getItem(CATALOG_AUTH_KEY) === "true") {
        setIsAuthed(true);
        setCheckingAuth(false);
        return;
      }
      try {
        const settings = await fetchSettings();
        if (!settings.hasCatalogPassword) {
          setIsAuthed(true);
        }
      } catch (error) {
        console.error("Failed to check catalog access:", error);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthed) {
      loadProducts();
    }
  }, [isAuthed]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setAuthError("");
    const result = await verifyCatalogPassword(passwordInput);
    setVerifying(false);
    if (result.success) {
      localStorage.setItem(CATALOG_AUTH_KEY, "true");
      setIsAuthed(true);
    } else {
      setAuthError(result.error || "Incorrect password.");
    }
  };

  // Lock background scroll while the cart drawer or product modal is open.
  // The root scrolling element varies by browser, so lock both <html> and <body>.
  useEffect(() => {
    const shouldLock = isCartOpen || !!selectedProduct;
    document.documentElement.style.overflow = shouldLock ? "hidden" : "";
    document.body.style.overflow = shouldLock ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isCartOpen, selectedProduct]);

  // Reset the gallery to the first slide (product photo) whenever a new
  // product is opened, and close any lingering zoom from the last one.
  useEffect(() => {
    setActiveMediaIndex(0);
    setIsImageZoomed(false);
  }, [selectedProduct?.itemCode]);

  const productMedia = selectedProduct
    ? ([
        selectedProduct.image ? { src: selectedProduct.image, label: "Photo" } : null,
        selectedProduct.posterImage ? { src: selectedProduct.posterImage, label: "Poster" } : null,
      ].filter(Boolean) as { src: string; label: string }[])
    : [];

  const goToMedia = (index: number) => {
    setActiveMediaIndex(Math.max(0, Math.min(index, productMedia.length - 1)));
  };

  const handleMediaClick = () => {
    setIsImageZoomed(true);
  };

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
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const quoteRef = `WQ-${now.getTime().toString().slice(-6)}`;

    const totalVal = cart.reduce((acc, item) => acc + item.product.mrp * item.quantity, 0);
    const totalQty = cart.reduce((acc, item) => acc + item.quantity, 0);
    const sep = "─".repeat(32);

    let msg = `*${BRANDING.companyName.toUpperCase()}*\n`;
    msg += `_Sales Quotation • Ref: ${quoteRef}_\n`;
    msg += `${sep}\n\n`;
    msg += `👤 *CUSTOMER DETAILS*\n`;
    msg += `• *Name:* ${clientName.trim() || "Valued Customer"}\n`;
    if (clientPhone.trim()) {
      msg += `• *Phone:* ${clientPhone.trim()}\n`;
    }
    msg += `• *Brand:* ${selectedBrand}\n`;
    msg += `• *Date:* ${dateStr}, ${timeStr}\n`;
    if (clientNote.trim()) {
      msg += `• *Notes/Remarks:* ${clientNote.trim()}\n`;
    }
    msg += `\n🛒 *ITEMS IN QUOTATION (${cart.length})*\n`;
    msg += `${sep}\n`;

    cart.forEach((item, idx) => {
      const numEmoji = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"][idx] || `*${idx + 1}.*`;
      msg += `${numEmoji} *[${item.product.itemCode}]* ${item.product.description}\n`;
      msg += `   Qty: *${item.quantity}* pcs  ×  MRP: *${formatCurrency(item.product.mrp)}*  =  *${formatCurrency(item.product.mrp * item.quantity)}*\n\n`;
    });

    msg += `${sep}\n\n`;
    msg += `💰 *SUMMARY*\n`;
    msg += `• Total SKUs: *${cart.length}*\n`;
    msg += `• Total Quantity: *${totalQty} pcs*\n`;
    msg += `• *Grand Total: ${formatCurrency(totalVal)}*\n\n`;
    msg += `_Prices shown are suggested MRP and subject to confirmation. Generated via ${BRANDING.companyName} Portal._`;
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
      if (!adminWhatsapp) {
        alert("Admin WhatsApp number isn't configured or hasn't loaded yet. Please refresh and try again.");
        return;
      }
      phone = adminWhatsapp;
    } else if (target === "client") {
      phone = clientPhone.replace(/[^0-9]/g, "");
    } else if (target === "custom") {
      const customNum = prompt("Enter custom WhatsApp number (with country code, e.g. 910000000000):");
      if (!customNum) return;
      phone = customNum.replace(/[^0-9]/g, "");
    }

    if (!phone || phone.length < 10) {
      alert("Please enter a valid WhatsApp phone number (with country code).");
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

  // Framer-motion handles swipe-to-send via drag constraints directly.
  const handleDragEnd = (event: any, info: any) => {
    if (isSwiped) return;
    const dragOffset = info.offset.x;
    if (dragOffset >= 200) {
      setIsSwiped(true);
      handleSendQuotation("admin");
      setTimeout(() => {
        setIsSwiped(false);
      }, 1800);
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4 font-sans text-sm">
        <div className="pointer-events-none absolute -top-20 -left-16 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute bottom-0 -right-16 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl animate-float-slower" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="animate-scale-in relative w-full max-w-sm bg-white/85 backdrop-blur-3xl saturate-[1.8] shadow-2xl p-7 rounded-2xl space-y-5 border border-white/50">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-auto flex items-center justify-center">
              <LogoImage width={160} height={40} className="h-10 w-auto object-contain" />
            </div>
            <div className="h-11 w-11 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
              <Lock className="h-4.5 w-4.5 text-brand-800" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">Private Sales Catalogue</p>
              <p className="text-xs text-slate-400 mt-1.5">Sign in to view pricing &amp; stock</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-2.5 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Access Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-700 focus:bg-white focus:ring-2 focus:ring-brand-700/10 rounded-lg py-3 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition-all"
                  autoFocus
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="btn-sheen w-full inline-flex items-center justify-center gap-2 bg-brand-900 hover:bg-brand-800 text-white font-bold uppercase tracking-wider text-xs py-3.5 rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            >
              {verifying ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Verifying...
                </>
              ) : (
                "Unlock Catalogue"
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              This catalogue is for authorized sales staff only. Contact your administrator for access.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="catalog-shield flex flex-col md:flex-row min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100 via-slate-50 to-slate-100 text-slate-900 selection:bg-brand-900 selection:text-white"
      onContextMenu={(e) => e.preventDefault()}
    >

      {/* Sidebar - Branding, Search, Categories */}
      <aside className="w-full md:w-[320px] lg:w-[360px] md:h-screen md:sticky md:top-0 bg-white/70 backdrop-blur-2xl border-b md:border-b-0 md:border-r border-white/50 flex flex-col justify-between p-5 md:p-6 lg:p-8 shrink-0 shadow-[2px_0_30px_rgba(15,23,42,0.03)] z-30 overflow-y-auto">
        <div className="space-y-8">
          {/* Logo & Branding */}
          <div className="flex items-center justify-between py-1 gap-2">
            <Link href="/" className="h-11 w-auto flex items-center justify-start">
              <LogoImage width={180} height={44} className="h-11 w-auto object-contain" />
            </Link>
            <Link
              href="/"
              className="hidden md:inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-brand-900 uppercase tracking-wider transition-colors"
              title="Back to main site"
            >
              <ChevronRight className="h-3 w-3 rotate-180" />
              Home
            </Link>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed hidden md:block">
            {BRANDING.tagline}
          </p>

          {/* Search Box */}
          <div className="relative group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog code or description..."
              className="w-full bg-slate-100/50 hover:bg-white/80 focus:bg-white border border-slate-200/60 focus:border-brand-500 rounded-full py-3.5 pl-11 pr-10 text-xs sm:text-sm text-slate-900 outline-none transition-all duration-300 focus:shadow-[0_0_20px_rgba(34,32,94,0.08)]"
            />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-brand-600">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Collections List - Vertical on Desktop, Horizontal Scroll on Mobile */}
          <div className="space-y-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pl-2">
              Categories
            </span>
            <div className="flex flex-row md:flex-col gap-2 md:gap-2 overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 scrollbar-none snap-x snap-mandatory px-1 md:px-0">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-full md:rounded-2xl border text-left whitespace-nowrap snap-start transition-all duration-300 ${
                  selectedCategory === null
                    ? "bg-brand-900 border-brand-900 text-white shadow-lg shadow-brand-900/20 font-bold md:scale-[1.02]"
                    : "bg-white/50 border-white/60 text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm"
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
                    className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-full md:rounded-2xl border text-left whitespace-nowrap snap-start transition-all duration-300 ${
                      isSelected
                        ? "bg-brand-900 border-brand-900 text-white shadow-lg shadow-brand-900/20 font-bold md:scale-[1.02]"
                        : "bg-white/50 border-white/60 text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm"
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
            {BRANDING.regionLabel}
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
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-4 max-w-[1800px] w-full mx-auto">
        
        {/* Mobile Header Info */}
        <div className="md:hidden sticky top-4 z-40 mb-6 mx-2 flex justify-between items-center bg-white/80 backdrop-blur-2xl border border-white/50 p-3.5 px-5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] shrink-0 transition-all">
          <span className="text-[11px] text-slate-600 font-extrabold uppercase tracking-widest">
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredProducts.map((product, index) => {
              const cartItem = cart.find((item) => item.product.itemCode === product.itemCode);
              return (
                <div
                  key={product.itemCode}
                  onClick={() => setSelectedProduct(product)}
                  className="animate-fade-in-up bg-white/80 backdrop-blur-xl border border-white hover:border-brand-200 rounded-[24px] p-4 flex gap-5 transition-all duration-300 shadow-[0_4px_24px_rgba(15,23,42,0.04)] group hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] hover:-translate-y-1 active:scale-[0.98] cursor-pointer"
                  style={{ animationDelay: `${Math.min(index * 35, 350)}ms` }}
                >
                  {/* Left Thumbnail — sized to actually show the product, not just hint at it */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 shrink-0 bg-slate-50 shadow-inner border border-slate-200/50 rounded-[16px] flex items-center justify-center relative overflow-hidden bg-radial bg-cover group-hover:border-brand-200/50 transition-colors duration-300">
                    {(product.image || product.posterImage) ? (
                      <img
                        src={product.image || product.posterImage}
                        alt={product.description}
                        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-110"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                        {renderCategoryIllustration(product.category)}
                      </div>
                    )}

                    <div className="absolute top-1.5 left-1.5">
                      <span className="num-mono font-bold text-[9px] bg-white/90 backdrop-blur text-slate-800 border border-slate-200/50 px-2 py-1 rounded-md shadow-sm">
                        {product.itemCode}
                      </span>
                    </div>
                    {product.posterImage && (
                      <div
                        className="absolute bottom-1.5 right-1.5 bg-white/95 text-slate-600 p-1 rounded-sm shadow-sm"
                        title="More photos available"
                      >
                        <Images className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  {/* Right Description & Details Column */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-[9px] font-extrabold text-slate-500 bg-white shadow-xs px-2.5 py-1 border border-slate-100 rounded-full uppercase tracking-widest">
                          {product.category}
                        </span>
                        <StockBadge status={product.stockStatus} hideCount />
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug sm:line-clamp-2 tracking-tight group-hover:text-brand-900 transition-colors">
                        {product.description}
                      </h3>
                    </div>

                    {/* Pricing and Actions Row */}
                    <div className="flex flex-row items-end justify-between border-t border-slate-200/60 pt-3 mt-3">
                      <div>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block leading-none">Suggested MRP</span>
                        <span className="num-mono text-base sm:text-lg font-black text-slate-900 mt-1 block">
                          {formatCurrency(product.mrp)}
                        </span>
                      </div>

                      {/* Add to Cart Actions */}
                      {cartItem ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-between border border-slate-200 bg-white/50 backdrop-blur-sm rounded-full overflow-hidden shadow-sm"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateCartQuantity(product.itemCode, cartItem.quantity - 1);
                            }}
                            className="p-2.5 sm:p-3 hover:bg-white text-slate-500 hover:text-brand-900 transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                          <span className="px-2 sm:px-3 text-sm font-bold num-mono text-slate-900">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateCartQuantity(product.itemCode, cartItem.quantity + 1);
                            }}
                            className="p-2.5 sm:p-3 hover:bg-white text-slate-500 hover:text-brand-900 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                          className="py-2.5 px-4 bg-brand-900 hover:bg-brand-800 text-white font-bold transition-all text-xs flex items-center justify-center gap-2 rounded-full shadow-md hover:shadow-lg active:scale-95 shrink-0"
                        >
                          <ShoppingCart className="h-4 w-4" /> <span className="hidden sm:inline">Add</span>
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
          <div>
            {BRANDING.companyName.toUpperCase()} &copy; {new Date().getFullYear()}
            {BRANDING.regionLabel ? ` • ${BRANDING.regionLabel.toUpperCase()}` : ""}
          </div>
          {BRANDING.poweredByLabel && (
            <div className="text-[9px] text-slate-400 font-medium normal-case tracking-normal">
              Made by{" "}
              {BRANDING.poweredByUrl ? (
                <a
                  href={BRANDING.poweredByUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors font-semibold"
                >
                  {BRANDING.poweredByLabel}
                </a>
              ) : (
                <span className="font-semibold text-slate-600">{BRANDING.poweredByLabel}</span>
              )}
            </div>
          )}
        </footer>

      </main>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springBouncy}
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-brand-900 text-white p-4 shadow-2xl flex items-center gap-2 border-2 border-white rounded-full group"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Quotation Cart</span>
            <span className="bg-white text-brand-900 font-black text-xs px-2.5 py-0.5 rounded-full num-mono shadow-sm group-hover:scale-105 transition-transform">
              {cart.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
            <span className="absolute -inset-1 rounded-full border border-brand-800 animate-ping opacity-25 pointer-events-none" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springCrit}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex justify-end"
          >
            {/* Main Drawer Body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={springCrit}
              className="bg-white/95 saturate-[1.8] backdrop-blur-3xl w-full max-w-md h-full flex flex-col shadow-2xl border-l border-white/20 text-slate-900"
            >
            
            {/* Header */}
            <div className="bg-brand-900 px-5 py-5 flex items-center justify-between shrink-0 text-white border-b border-brand-950">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5.5 w-5.5 text-brand-200" />
                <h3 className="font-bold text-base uppercase tracking-wider">Quotation Builder</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 bg-brand-800 hover:bg-brand-700 text-brand-200 hover:text-white border border-brand-700 rounded-md transition-colors"
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
                          {(item.product.image || item.product.posterImage) ? (
                            <img src={item.product.image || item.product.posterImage} alt={item.product.description} className="h-full w-full object-cover select-none pointer-events-none" draggable={false} />
                          ) : (
                            <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">{getProductInitials(item.product.itemCode, item.product.description)}</span>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="num-mono font-bold text-[9px] bg-brand-900 text-white px-2 py-0.2 rounded-sm">{item.product.itemCode}</span>
                            <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-2 py-0.2 rounded-sm uppercase tracking-wide truncate border border-slate-200">{item.product.category}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 truncate mt-1">{item.product.description}</h4>

                          {/* Quantity Controls inside Cart Drawer */}
                          <div className="flex justify-between items-center mt-3">
                            <div className="flex items-center border border-slate-300 bg-white rounded overflow-hidden">
                              <button
                                onClick={() => handleUpdateCartQuantity(item.product.itemCode, item.quantity - 1)}
                                className="px-3 py-2 hover:bg-slate-50 active:bg-slate-100 text-slate-500 hover:text-brand-900 transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-2.5 text-xs font-bold num-mono text-slate-850 min-w-[1.5rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateCartQuantity(item.product.itemCode, item.quantity + 1)}
                                className="px-3 py-2 hover:bg-slate-50 active:bg-slate-100 text-slate-500 hover:text-brand-900 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
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
                          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-650 border border-transparent hover:border-slate-200 rounded transition-all shrink-0 self-start"
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
                            className="w-full bg-slate-50 border border-slate-200 focus:border-brand-700 rounded-md py-3 pl-9 pr-3 text-xs text-slate-800 outline-none transition-all"
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
                            className="w-full bg-slate-50 border border-slate-200 focus:border-brand-700 rounded-md py-3 pl-9 pr-3 text-xs text-slate-800 outline-none num-mono transition-all"
                          />
                          <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Brand
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {BRANDS.map((brand) => (
                            <button
                              key={brand}
                              type="button"
                              onClick={() => setSelectedBrand(brand)}
                              className={`py-2.5 rounded-md border text-xs font-bold uppercase tracking-wide transition-all ${
                                selectedBrand === brand
                                  ? "bg-brand-900 border-brand-900 text-white shadow-sm"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {brand}
                            </button>
                          ))}
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
                            className="w-full bg-slate-50 border border-slate-200 focus:border-brand-700 rounded-md py-3 pl-9 pr-3 text-xs text-slate-800 outline-none resize-none transition-all"
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
                  className="hidden md:flex w-full py-3.5 bg-brand-900 hover:bg-brand-800 text-white font-bold transition-colors text-xs uppercase tracking-wider items-center justify-center gap-2 rounded-md shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" /> Send to Admin WhatsApp
                </button>

                {/* Swipe to Send for Mobile Only */}
                <div className="block md:hidden w-full pt-1">
                  <div
                    ref={sliderConstraintsRef}
                    className={`relative h-14 w-full overflow-hidden rounded-full border shadow-inner select-none touch-none transition-colors duration-300 ${
                      isSwiped ? "bg-emerald-50 border-emerald-300" : "bg-slate-100 border-slate-300"
                    }`}
                  >
                    {!isSwiped && (
                      <div className="absolute inset-y-0 right-6 flex items-center gap-1.5 text-slate-400 pointer-events-none">
                        <ChevronRight className="h-3.5 w-3.5 animate-swipe-flow [animation-delay:0ms]" />
                        <ChevronRight className="h-3.5 w-3.5 animate-swipe-flow [animation-delay:200ms]" />
                        <ChevronRight className="h-3.5 w-3.5 animate-swipe-flow [animation-delay:400ms]" />
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span
                        className={`text-[11px] font-extrabold uppercase tracking-widest relative z-10 transition-opacity duration-300 ${
                          isSwiped ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {isSwiped ? "Quotation Sent!" : "Swipe to Send"}
                      </span>
                    </div>

                    <motion.div
                      drag="x"
                      dragConstraints={sliderConstraintsRef}
                      dragElastic={0.04}
                      dragSnapToOrigin={!isSwiped}
                      onDragEnd={handleDragEnd}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      className={`absolute left-1 top-1 z-20 h-12 w-12 rounded-full flex items-center justify-center shadow-lg ${
                        isSwiped
                          ? "bg-emerald-600 text-white"
                          : "bg-brand-900 text-white ring-4 ring-brand-950/10 cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      {isSwiped ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <MessageSquare className="h-4.5 w-4.5" />
                      )}
                    </motion.div>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Details Highlight Modal */}
      <AnimatePresence>
        {selectedProduct && (() => {
          const cartItem = cart.find((item) => item.product.itemCode === selectedProduct.itemCode);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={springCrit}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => { setSelectedProduct(null); setIsImageZoomed(false); }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={springCrit}
                className="bg-white border border-slate-350 max-w-lg w-full rounded-xl overflow-hidden shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Close Button */}
              <button
                onClick={() => { setSelectedProduct(null); setIsImageZoomed(false); }}
                className="absolute right-4 top-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 p-2 rounded-full transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Main Content Grid */}
              <div className="flex flex-col sm:flex-row">

                {/* Left Column: Media Gallery (product photo + optional poster, swipeable) */}
                <div className="w-full sm:w-2/5 bg-white border-b sm:border-b-0 sm:border-r border-slate-200 relative min-h-[160px] sm:min-h-[220px] overflow-hidden">
                  {productMedia.length > 0 ? (
                    <div className="relative h-full min-h-[160px] sm:min-h-[220px] w-full overflow-hidden touch-pan-y">
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset }) => {
                          if (offset.x < -40 && activeMediaIndex < productMedia.length - 1) {
                            goToMedia(activeMediaIndex + 1);
                          } else if (offset.x > 40 && activeMediaIndex > 0) {
                            goToMedia(activeMediaIndex - 1);
                          }
                        }}
                        animate={{ x: `-${activeMediaIndex * 100}%` }}
                        transition={springCrit}
                        className="flex h-full"
                        style={{ width: "100%" }}
                      >
                        {productMedia.map((media, i) => (
                          <div
                            key={media.src}
                            className="w-full h-full shrink-0 flex items-center justify-center p-6 cursor-zoom-in group/media"
                            onClick={handleMediaClick}
                          >
                            <img
                              src={media.src}
                              alt={`${selectedProduct.description} — ${media.label}`}
                              className="w-full h-full object-contain max-h-[180px] select-none pointer-events-none"
                              draggable={false}
                            />
                            {i === activeMediaIndex && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover/media:bg-slate-900/20 transition-colors pointer-events-none">
                                <div className="bg-white/90 text-slate-700 rounded-full p-2 opacity-0 group-hover/media:opacity-100 transition-opacity shadow-sm">
                                  <ZoomIn className="h-4 w-4" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </motion.div>

                      {productMedia.length > 1 && (
                        <>
                          <span className="absolute top-2 right-2 num-mono font-bold text-[9px] bg-white/90 text-slate-600 px-1.5 py-0.5 rounded-sm shadow-sm uppercase tracking-wide">
                            {productMedia[activeMediaIndex].label} &middot; {activeMediaIndex + 1}/{productMedia.length}
                          </span>
                          {activeMediaIndex > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); goToMedia(activeMediaIndex - 1); }}
                              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 rounded-full p-1.5 shadow-sm transition-colors"
                              aria-label="Previous image"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {activeMediaIndex < productMedia.length - 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); goToMedia(activeMediaIndex + 1); }}
                              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 rounded-full p-1.5 shadow-sm transition-colors"
                              aria-label="Next image"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                            {productMedia.map((media, i) => (
                              <button
                                key={media.src}
                                onClick={(e) => { e.stopPropagation(); goToMedia(i); }}
                                className={`h-1.5 rounded-full transition-all ${
                                  i === activeMediaIndex ? "w-4 bg-brand-900" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                                }`}
                                aria-label={`Show ${media.label}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="h-full min-h-[160px] sm:min-h-[220px] flex items-center justify-center p-6">
                      <div className="scale-125 select-none">
                        {renderCategoryIllustration(selectedProduct.category)}
                      </div>
                    </div>
                  )}
                  <span className="absolute bottom-3 left-3 num-mono font-bold text-xs bg-brand-900 text-white px-2 py-0.5 rounded shadow-sm pointer-events-none">
                    {selectedProduct.itemCode}
                  </span>
                </div>

                {/* Right Column: Detailed Meta info */}
                <div className="w-full sm:w-3/5 p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Badge Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded uppercase tracking-wider">
                        {selectedProduct.category}
                      </span>
                      <StockBadge status={selectedProduct.stockStatus} hideCount />
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                      {selectedProduct.description}
                    </h2>

                    {/* Pricing & Stock Details Tag */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Maximum Retail Price (MRP)</span>
                        <span className="num-mono text-2xl font-black text-slate-900 mt-1 block">
                          {formatCurrency(selectedProduct.mrp)}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Footer Actions */}
                  <div className="border-t border-slate-150 pt-4 mt-6 flex items-center justify-between gap-4">
                    <div className="text-slate-500 text-[10px] font-bold uppercase">
                      Quotation Qty
                    </div>

                    {cartItem ? (
                      <div className="flex items-center border border-slate-300 bg-white rounded-md overflow-hidden shadow-sm">
                        <button
                          onClick={() => handleUpdateCartQuantity(selectedProduct.itemCode, cartItem.quantity - 1)}
                          className="px-3 py-2 hover:bg-slate-50 text-slate-550 hover:text-brand-900 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-sm font-bold num-mono text-slate-900">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateCartQuantity(selectedProduct.itemCode, cartItem.quantity + 1)}
                          className="px-3 py-2 hover:bg-slate-50 text-slate-550 hover:text-brand-900 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(selectedProduct)}
                        className="py-2 px-4 bg-brand-900 hover:bg-brand-800 text-white font-bold transition-colors text-xs flex items-center gap-2 rounded-md shadow-sm shrink-0"
                      >
                        <ShoppingCart className="h-4 w-4" /> Add to Quote
                      </button>
                    )}
                  </div>

                </div>

              </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Full-screen Image Lightbox */}
      <AnimatePresence>
        {isImageZoomed && productMedia.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springCrit}
            className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsImageZoomed(false)}
          >
          <button
            onClick={() => setIsImageZoomed(false)}
            className="absolute right-4 top-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>

          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset }) => {
              if (offset.x < -40 && activeMediaIndex < productMedia.length - 1) {
                goToMedia(activeMediaIndex + 1);
              } else if (offset.x > 40 && activeMediaIndex > 0) {
                goToMedia(activeMediaIndex - 1);
              }
            }}
            className="relative w-full h-full flex items-center justify-center touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={productMedia[activeMediaIndex].src}
              alt={`${selectedProduct?.description ?? "Product"} — ${productMedia[activeMediaIndex].label}`}
              className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-200 select-none"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />

            {productMedia.length > 1 && (
              <>
                {activeMediaIndex > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToMedia(activeMediaIndex - 1); }}
                    className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {activeMediaIndex < productMedia.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToMedia(activeMediaIndex + 1); }}
                    className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {productMedia.map((media, i) => (
                    <button
                      key={media.src}
                      onClick={(e) => { e.stopPropagation(); goToMedia(i); }}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeMediaIndex ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                      }`}
                      aria-label={`Show ${media.label}`}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
