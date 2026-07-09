"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Layers, RefreshCw, Sparkles } from "lucide-react";
import { Product } from "@/lib/types";
import { getStoredProducts } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import SearchBar from "@/components/SearchBar";
import CategoryFilterPills from "@/components/CategoryFilterPills";
import StockBadge from "@/components/StockBadge";
import EmptyState from "@/components/EmptyState";

export default function SalesBrochure() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Reload products from DB (localStorage)
  const loadProducts = () => {
    setLoading(true);
    const data = getStoredProducts();
    setProducts(data);
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans pb-10">
      
      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-gray-900 text-white shadow-md border-b border-gray-800">
        <div className="px-4 py-4 max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-none shrink-0 flex items-center justify-center h-10 w-10 border border-gray-700 shadow-inner">
              <Image src="/logo.png" alt="Wetta Logo" width={32} height={32} className="h-8 w-auto object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-wider uppercase leading-none">Wetta Bath Fittings</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none mt-1">B2B Digital Catalogue</p>
            </div>
          </div>
          
          <button 
            onClick={loadProducts}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Refresh database"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-4">
        
        {/* Search and Filters panel */}
        <div className="bg-white p-4 border border-gray-200 shadow-sm space-y-3.5 rounded-none">
          <div className="space-y-3">
            <div className="relative">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search code (HF101) or description..."
              />
            </div>
            
            <div className="border-t border-gray-100 pt-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Layers className="h-3 w-3" /> Select Category
              </div>
              <CategoryFilterPills
                categories={categories}
                selectedCategory={selectedCategory}
                onChange={setSelectedCategory}
              />
            </div>
          </div>
        </div>

        {/* Catalog List Header */}
        <div className="flex items-center justify-between px-1">
          <span className="font-bold text-xs uppercase tracking-wider text-gray-500">
            {selectedCategory || "All Products"} ({filteredProducts.length})
          </span>
          <span className="text-[10px] text-gray-400 font-bold uppercase">
            Kerala Region
          </span>
        </div>

        {/* Product Cards Stack (Optimized for Mobile viewports and highly readable) */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No Products Found"
            message="We couldn't find any products matching your current search or category filters. Try checking the item code or reset the search query."
          />
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div
                key={product.itemCode}
                className="bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all rounded-none flex flex-col gap-3"
              >
                {/* Top Badge Row */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="num-mono font-bold text-sm bg-gray-900 text-white px-2 py-0.5 tracking-wide rounded-none border border-gray-900">
                      {product.itemCode}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 border border-indigo-100 uppercase tracking-wider">
                      {product.category}
                    </span>
                  </div>
                  
                  <StockBadge count={product.stockCount} />
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-base font-bold text-gray-800 leading-snug">
                    {product.description}
                  </h3>
                </div>

                {/* Pricing Block */}
                <div className="bg-gray-50 border border-gray-100 p-3 flex justify-between items-center rounded-none mt-1">
                  <div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">Suggested MRP</div>
                    <div className="num-mono text-xs text-gray-500 font-semibold mt-1">
                      {formatCurrency(product.mrp)}
                    </div>
                  </div>
                  
                  <div className="text-right border-l border-gray-200 pl-4">
                    <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider leading-none flex items-center justify-end gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> B2B Wholesale Rate
                    </div>
                    <div className="num-mono text-lg font-extrabold text-indigo-700 mt-0.5">
                      {formatCurrency(product.wholesaleRate)}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Footer Branding info */}
      <footer className="text-center py-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest border-t border-gray-100 mt-6 bg-white">
        WETTA BATH FITTINGS &copy; {new Date().getFullYear()} • KERALA
      </footer>

    </div>
  );
}
