"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Database,
  PlusCircle,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ArrowUpDown,
  Upload,
  UserCheck,
  LogOut
} from "lucide-react";
import Papa from "papaparse";
import { Product } from "@/lib/types";
import {
  getStoredProducts,
  saveStoredProducts,
  addProduct,
  updateProductInline,
  bulkUpdateProducts,
  resetDatabase
} from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import StockBadge from "@/components/StockBadge";
import SearchBar from "@/components/SearchBar";
import CategoryFilterPills from "@/components/CategoryFilterPills";

// Admin Profile constant
const ADMIN_USER = {
  name: "Muhammad Ramzy",
  role: "Admin",
  location: "Kerala Operations",
};

interface CsvRowPreview {
  itemCode: string;
  description: string;
  currentStock: number;
  newStock: number;
  difference: number;
  status: "Matched" | "Unrecognized" | "No change" | "Malformed";
  errorDetails?: string;
}

export default function AdminCommandCenter() {
  const [activeTab, setActiveTab] = useState<"master" | "manual" | "sync">("master");
  const [products, setProducts] = useState<Product[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // --- Inventory Master States ---
  const [masterSearch, setMasterSearch] = useState("");
  const [masterCategory, setMasterCategory] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Product>("itemCode");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>("");
  const [editStock, setEditStock] = useState<string>("");

  // --- Manual Product Entry States ---
  const [manualForm, setManualForm] = useState({
    itemCode: "",
    description: "",
    category: "Health Faucets" as Product["category"],
    mrp: "",
    wholesaleRate: "",
    stockCount: "",
  });
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});

  // --- Bulk Tally Sync States ---
  const [dragActive, setDragActive] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvRowPreview[]>([]);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auth States ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Load products initially and set up listeners
  const loadProducts = () => {
    setProducts(getStoredProducts());
  };

  useEffect(() => {
    const session = localStorage.getItem("wetta_admin_auth");
    if (session === "true") {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);

    loadProducts();
    window.addEventListener("wetta_db_update", loadProducts);
    return () => {
      window.removeEventListener("wetta_db_update", loadProducts);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername.trim().toLowerCase() === "admin" && loginPassword === "admin") {
      localStorage.setItem("wetta_admin_auth", "true");
      setIsAuthenticated(true);
      setLoginError("");
      setLoginUsername("");
      setLoginPassword("");
      showToast("success", "Welcome back, Muhammad Ramzy!");
    } else {
      setLoginError("Invalid Operator ID or Password credentials.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("wetta_admin_auth");
    setIsAuthenticated(false);
    showToast("success", "Session cleared. Operator logged out.");
  };

  // Toast helper
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // --- Inventory Master Handlers ---
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const startEditing = (product: Product) => {
    setEditingRow(product.itemCode);
    setEditRate(product.wholesaleRate.toString());
    setEditStock(product.stockCount.toString());
  };

  const cancelEditing = () => {
    setEditingRow(null);
  };

  const saveInlineEdit = (itemCode: string) => {
    const rateNum = parseFloat(editRate);
    const stockNum = parseInt(editStock, 10);

    if (isNaN(rateNum) || rateNum <= 0) {
      showToast("error", "Rate must be a positive number.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      showToast("error", "Stock count must be a non-negative integer.");
      return;
    }

    const success = updateProductInline(itemCode, {
      wholesaleRate: rateNum,
      stockCount: stockNum,
    });

    if (success) {
      showToast("success", `Product ${itemCode} updated successfully.`);
      setEditingRow(null);
    } else {
      showToast("error", `Failed to update product ${itemCode}.`);
    }
  };

  const deleteProductItem = (itemCode: string) => {
    if (confirm(`Are you sure you want to delete product '${itemCode}'?`)) {
      const updated = products.filter((p) => p.itemCode !== itemCode);
      saveStoredProducts(updated);
      showToast("success", `Product ${itemCode} deleted.`);
    }
  };

  const handleResetDB = () => {
    if (confirm("This will reset all inventory data back to the default seed. Are you sure?")) {
      resetDatabase();
      showToast("success", "Database reset to initial seeds.");
    }
  };

  // Filter & Sort Master list
  const categories = Array.from(new Set(products.map((p) => p.category)));

  const filteredMasterProducts = products
    .filter((p) => {
      const matchesSearch =
        p.itemCode.toLowerCase().includes(masterSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(masterSearch.toLowerCase());
      const matchesCategory = masterCategory === null || p.category === masterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  // --- Manual Product Entry Handlers ---
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setManualForm((prev) => ({ ...prev, [name]: value }));
    // Clear validation error on change
    if (manualErrors[name]) {
      setManualErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateManualForm = () => {
    const errors: Record<string, string> = {};

    if (!manualForm.itemCode.trim()) errors.itemCode = "Item Code is required.";
    if (!manualForm.description.trim()) errors.description = "Description is required.";
    
    const mrpVal = parseFloat(manualForm.mrp);
    if (!manualForm.mrp) {
      errors.mrp = "MRP is required.";
    } else if (isNaN(mrpVal) || mrpVal <= 0) {
      errors.mrp = "MRP must be a positive number.";
    }

    const rateVal = parseFloat(manualForm.wholesaleRate);
    if (!manualForm.wholesaleRate) {
      errors.wholesaleRate = "Wholesale Rate is required.";
    } else if (isNaN(rateVal) || rateVal <= 0) {
      errors.wholesaleRate = "Wholesale Rate must be a positive number.";
    } else if (mrpVal && rateVal > mrpVal) {
      errors.wholesaleRate = "Rate cannot exceed MRP.";
    }

    const stockVal = parseInt(manualForm.stockCount, 10);
    if (!manualForm.stockCount) {
      errors.stockCount = "Stock Count is required.";
    } else if (isNaN(stockVal) || stockVal < 0) {
      errors.stockCount = "Stock must be a non-negative integer.";
    }

    // Check duplicate code
    if (manualForm.itemCode.trim()) {
      const codeExists = products.some(
        (p) => p.itemCode.toUpperCase() === manualForm.itemCode.trim().toUpperCase()
      );
      if (codeExists) {
        errors.itemCode = "This Item Code already exists in the database.";
      }
    }

    setManualErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateManualForm()) return;

    const result = addProduct({
      itemCode: manualForm.itemCode.trim().toUpperCase(),
      description: manualForm.description.trim(),
      category: manualForm.category,
      mrp: parseFloat(manualForm.mrp),
      wholesaleRate: parseFloat(manualForm.wholesaleRate),
      stockCount: parseInt(manualForm.stockCount, 10),
    });

    if (result.success) {
      showToast("success", `Product ${manualForm.itemCode.toUpperCase()} added successfully.`);
      // Reset Form
      setManualForm({
        itemCode: "",
        description: "",
        category: "Health Faucets",
        mrp: "",
        wholesaleRate: "",
        stockCount: "",
      });
      setManualErrors({});
    } else {
      showToast("error", result.error || "Failed to add product.");
    }
  };

  // --- Bulk Tally Sync Handlers ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCsvFile(e.target.files[0]);
    }
  };

  const processCsvFile = (file: File) => {
    setCsvFileName(file.name);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        if (rows.length === 0) {
          showToast("error", "The uploaded CSV file is empty.");
          setParsedRows([]);
          return;
        }

        // Header normalization function
        const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[\s_-]/g, "");

        // Find keys mapping in the first row
        const firstRow = rows[0];
        const keys = Object.keys(firstRow);
        
        let codeKey = "";
        let stockKey = "";

        keys.forEach((key) => {
          const norm = normalizeHeader(key);
          if (norm === "itemcode" || norm === "code" || norm === "item") {
            codeKey = key;
          }
          if (
            norm === "newstockcount" ||
            norm === "stockcount" ||
            norm === "newstock" ||
            norm === "stock" ||
            norm === "count" ||
            norm === "qty"
          ) {
            stockKey = key;
          }
        });

        if (!codeKey || !stockKey) {
          // Fallback if normalization didn't find clear keys - take first and second column
          codeKey = keys[0] || "";
          stockKey = keys[1] || "";
        }

        const previewList: CsvRowPreview[] = rows.map((row) => {
          const rawCode = (row[codeKey] || "").trim();
          const rawStock = (row[stockKey] || "").trim();

          const parsedStock = parseInt(rawStock, 10);
          const matchedProd = products.find(
            (p) => p.itemCode.toUpperCase() === rawCode.toUpperCase()
          );

          if (!rawCode) {
            return {
              itemCode: "[EMPTY]",
              description: "-",
              currentStock: 0,
              newStock: 0,
              difference: 0,
              status: "Malformed",
              errorDetails: "Empty/Missing Item Code.",
            };
          }

          if (isNaN(parsedStock) || parsedStock < 0) {
            return {
              itemCode: rawCode,
              description: matchedProd ? matchedProd.description : "-",
              currentStock: matchedProd ? matchedProd.stockCount : 0,
              newStock: 0,
              difference: 0,
              status: "Malformed",
              errorDetails: `Invalid numeric quantity count: '${rawStock}'.`,
            };
          }

          if (!matchedProd) {
            return {
              itemCode: rawCode,
              description: "-",
              currentStock: 0,
              newStock: parsedStock,
              difference: 0,
              status: "Unrecognized",
              errorDetails: "Code not found in current inventory catalog.",
            };
          }

          const diff = parsedStock - matchedProd.stockCount;
          const status = diff === 0 ? "No change" : "Matched";

          return {
            itemCode: matchedProd.itemCode,
            description: matchedProd.description,
            currentStock: matchedProd.stockCount,
            newStock: parsedStock,
            difference: diff,
            status: status as CsvRowPreview["status"],
          };
        });

        setParsedRows(previewList);
        showToast("success", `Parsed ${previewList.length} rows from CSV.`);
      },
      error: (error) => {
        console.error("PapaParse error:", error);
        showToast("error", `Failed to parse CSV file: ${error.message}`);
      },
    });
  };

  const handleCommitSync = () => {
    const validMatchedRows = parsedRows.filter((r) => r.status === "Matched");
    
    if (validMatchedRows.length === 0) {
      showToast("error", "No valid 'Matched' rows to commit updates for.");
      return;
    }

    const updates = validMatchedRows.map((r) => ({
      itemCode: r.itemCode,
      newStockCount: r.newStock,
    }));

    const result = bulkUpdateProducts(updates);
    
    showToast(
      "success",
      `Tally Bulk Sync Complete! Committed updates to ${result.successCount} items.`
    );

    // Reset CSV Sync panel
    setCsvFileName(null);
    setParsedRows([]);
    setShowSyncConfirm(false);
    setActiveTab("master");
  };

  const validRowsCount = parsedRows.filter((r) => r.status === "Matched").length;

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-sm">
        <div className="w-full max-w-sm bg-white border border-gray-300 shadow-2xl p-6 rounded-none space-y-5 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center space-y-2 border-b border-gray-200 pb-4">
            <div className="bg-gray-900 p-2 border border-gray-800 shrink-0 flex items-center justify-center h-12 w-12 shadow-md">
              <Image src="/logo.png" alt="Wetta Logo" width={32} height={32} className="h-8 w-auto object-contain invert" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-wider uppercase text-gray-900 leading-tight">Wetta ERP Console</h2>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest leading-none mt-1">Kerala Operations Log-in</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold uppercase tracking-wider p-2.5 rounded-none flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="loginUsername" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Operator ID
              </label>
              <input
                type="text"
                id="loginUsername"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter ID..."
                className="w-full erp-input rounded-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="loginPassword" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Console Password
              </label>
              <input
                type="password"
                id="loginPassword"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full erp-input rounded-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full erp-btn erp-btn-primary bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-wider py-2.5"
            >
              Establish Session
            </button>
          </form>

          <div className="text-[10px] text-gray-400 font-bold uppercase text-center border-t border-gray-100 pt-3">
            Hint: Operator ID = <code className="bg-gray-100 px-1 font-mono text-gray-600">admin</code> / Pass = <code className="bg-gray-100 px-1 font-mono text-gray-600">admin</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100 font-sans">
      
      {/* --- Sidebar (Permanent) --- */}
      <aside className="w-full lg:w-64 bg-gray-900 text-white shrink-0 border-r border-gray-800 flex flex-col justify-between p-4">
        <div className="space-y-6">
          
          {/* Logo & Portal Nav */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="bg-white p-1 rounded-none flex items-center justify-center h-8 w-8">
                <Image src="/logo.png" alt="Wetta Logo" width={24} height={24} className="h-6 w-auto object-contain" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-wider uppercase">Wetta ERP</h1>
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest leading-none">Kerala Operations</p>
              </div>
            </div>
            
            <Link
              href="/"
              className="lg:hidden flex items-center gap-1 text-[10px] bg-gray-800 px-2 py-1 text-gray-300 font-bold border border-gray-700 hover:text-white uppercase tracking-wider rounded-none"
            >
              <ArrowLeft className="h-3 w-3" /> Sales
            </Link>
          </div>

          {/* User Profile Card */}
          <div className="bg-gray-950/50 border border-gray-800 p-3 rounded-none flex items-center gap-2.5">
            <div className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 p-1.5 shrink-0 flex items-center justify-center">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Operator</div>
              <div className="text-xs font-bold text-gray-200 truncate">{ADMIN_USER.name}</div>
              <div className="text-[10px] text-gray-500 font-medium truncate">{ADMIN_USER.role} • {ADMIN_USER.location}</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            <button
              onClick={() => setActiveTab("master")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border shrink-0 transition-colors rounded-none ${
                activeTab === "master"
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-transparent border-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Database className="h-4 w-4" /> Inventory Master
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border shrink-0 transition-colors rounded-none ${
                activeTab === "manual"
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-transparent border-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <PlusCircle className="h-4 w-4" /> Product Entry
            </button>
            <button
              onClick={() => setActiveTab("sync")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border shrink-0 transition-colors rounded-none ${
                activeTab === "sync"
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-transparent border-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <RefreshCw className="h-4 w-4" /> Bulk Tally Sync
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-transparent text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors rounded-none w-full text-left mt-4"
            >
              <LogOut className="h-4 w-4" /> Log-out
            </button>
          </nav>

        </div>

        {/* Bottom Sidebar Action (Return Link) */}
        <div className="hidden lg:block pt-4 border-t border-gray-800">
          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 w-full py-2 bg-gray-800 border border-gray-700 text-xs font-bold hover:bg-gray-750 text-gray-200 hover:text-white transition-colors uppercase tracking-wider rounded-none"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sales Portal
          </Link>
        </div>
      </aside>

      {/* --- Main Admin Dashboard Workspace --- */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Row */}
        <header className="bg-white border-b border-gray-300 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-gray-900 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-none uppercase tracking-wider">
              {activeTab === "master" && "Master Tab"}
              {activeTab === "manual" && "Form Tab"}
              {activeTab === "sync" && "Sync Tab"}
            </span>
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">
              {activeTab === "master" && "Inventory Master Database"}
              {activeTab === "manual" && "Manual Product Entry Panel"}
              {activeTab === "sync" && "Tally CSV Bulk Stock Sync"}
            </h2>
          </div>
          
          {activeTab === "master" && (
            <button
              onClick={handleResetDB}
              className="erp-btn erp-btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50 text-[10px] py-1 uppercase tracking-wider"
              title="Reset database to seed records"
            >
              Reset Seed Data
            </button>
          )}
        </header>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          
          {/* TOAST ALERT BANNER */}
          {toast && (
            <div
              className={`p-3 border rounded-none flex items-center gap-2 text-xs font-semibold uppercase tracking-wider animate-in fade-in duration-200 ${
                toast.type === "success"
                  ? "bg-green-50 border-green-300 text-green-800"
                  : "bg-red-50 border-red-300 text-red-800"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: INVENTORY MASTER                                        */}
          {/* ============================================================== */}
          {activeTab === "master" && (
            <div className="space-y-4">
              
              {/* Search and Filters */}
              <div className="bg-white p-3 border border-gray-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-none">
                <div className="flex-1 max-w-md">
                  <SearchBar
                    value={masterSearch}
                    onChange={setMasterSearch}
                    placeholder="Search by code or description..."
                  />
                </div>
                <div className="shrink-0">
                  <CategoryFilterPills
                    categories={categories}
                    selectedCategory={masterCategory}
                    onChange={setMasterCategory}
                  />
                </div>
              </div>

              {/* Master Products Table */}
              <div className="bg-white border border-gray-300 shadow-sm rounded-none overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th className="w-24 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("itemCode")}>
                          <div className="flex items-center gap-1">
                            Item Code <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="cursor-pointer hover:bg-gray-200" onClick={() => handleSort("description")}>
                          <div className="flex items-center gap-1">
                            Description <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="w-32 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("category")}>
                          <div className="flex items-center gap-1">
                            Category <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="w-24 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort("mrp")}>
                          <div className="flex items-center gap-1 justify-end">
                            MRP <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="w-36 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort("wholesaleRate")}>
                          <div className="flex items-center gap-1 justify-end">
                            Wholesale Rate <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="w-28 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort("stockCount")}>
                          <div className="flex items-center gap-1 justify-end">
                            Stock <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="w-32">Status</th>
                        <th className="w-28 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMasterProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-gray-500">
                            No records found matching search queries.
                          </td>
                        </tr>
                      ) : (
                        filteredMasterProducts.map((p) => {
                          const isEditing = editingRow === p.itemCode;
                          return (
                            <tr key={p.itemCode} className={isEditing ? "bg-indigo-50/40" : ""}>
                              <td className="num-mono font-bold">{p.itemCode}</td>
                              <td className="font-semibold text-gray-800">{p.description}</td>
                              <td className="text-[10px] font-bold text-gray-500 uppercase">{p.category}</td>
                              <td className="num-mono text-right text-gray-500">{formatCurrency(p.mrp)}</td>
                              <td className="text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editRate}
                                    onChange={(e) => setEditRate(e.target.value)}
                                    className="erp-input num-mono text-right w-24 p-0.5"
                                    step="0.01"
                                  />
                                ) : (
                                  <span className="num-mono font-bold text-indigo-700">
                                    {formatCurrency(p.wholesaleRate)}
                                  </span>
                                )}
                              </td>
                              <td className="text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editStock}
                                    onChange={(e) => setEditStock(e.target.value)}
                                    className="erp-input num-mono text-right w-20 p-0.5"
                                  />
                                ) : (
                                  <span className="num-mono font-semibold">{p.stockCount}</span>
                                )}
                              </td>
                              <td>
                                <StockBadge count={isEditing ? parseInt(editStock, 10) || 0 : p.stockCount} />
                              </td>
                              <td className="text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => saveInlineEdit(p.itemCode)}
                                      className="p-1 bg-green-600 text-white hover:bg-green-700 rounded-none"
                                      title="Save Changes"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="p-1 bg-gray-500 text-white hover:bg-gray-600 rounded-none"
                                      title="Cancel"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => startEditing(p)}
                                      className="erp-btn erp-btn-secondary px-1.5 py-0.5 text-[10px] uppercase font-bold"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteProductItem(p.itemCode)}
                                      className="p-1 text-red-600 hover:bg-red-50 rounded-none"
                                      title="Delete Product"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: MANUAL PRODUCT ENTRY                                    */}
          {/* ============================================================== */}
          {activeTab === "manual" && (
            <div className="bg-white border border-gray-300 shadow-sm max-w-2xl mx-auto rounded-none">
              <div className="bg-gray-50 border-b border-gray-300 px-4 py-2.5">
                <span className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-indigo-600" /> New Bath Fittings Product Record
                </span>
              </div>

              <form onSubmit={handleManualSubmit} className="p-4 md:p-6 space-y-4 font-sans text-sm">
                
                {/* Item Code & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="itemCode" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Item Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="itemCode"
                      name="itemCode"
                      value={manualForm.itemCode}
                      onChange={handleFormChange}
                      placeholder="E.G., HF111"
                      className={`w-full erp-input num-mono uppercase ${
                        manualErrors.itemCode ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                      }`}
                    />
                    {manualErrors.itemCode && (
                      <p className="text-[11px] text-red-600 font-semibold">{manualErrors.itemCode}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="category" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={manualForm.category}
                      onChange={handleFormChange}
                      className="w-full erp-input"
                    >
                      <option value="Health Faucets">Health Faucets</option>
                      <option value="Showers">Showers</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label htmlFor="description" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Product Description / Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    value={manualForm.description}
                    onChange={handleFormChange}
                    placeholder="E.G., Chrome Health Faucet with 1.5m Hose"
                    className={`w-full erp-input ${
                      manualErrors.description ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                    }`}
                  />
                  {manualErrors.description && (
                    <p className="text-[11px] text-red-600 font-semibold">{manualErrors.description}</p>
                  )}
                </div>

                {/* MRP, Wholesale Rate, Stock */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="mrp" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      MRP (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="mrp"
                      name="mrp"
                      value={manualForm.mrp}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      step="0.01"
                      className={`w-full erp-input num-mono text-right ${
                        manualErrors.mrp ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                      }`}
                    />
                    {manualErrors.mrp && (
                      <p className="text-[11px] text-red-600 font-semibold">{manualErrors.mrp}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="wholesaleRate" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Wholesale Rate (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="wholesaleRate"
                      name="wholesaleRate"
                      value={manualForm.wholesaleRate}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      step="0.01"
                      className={`w-full erp-input num-mono text-right ${
                        manualErrors.wholesaleRate ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                      }`}
                    />
                    {manualErrors.wholesaleRate && (
                      <p className="text-[11px] text-red-600 font-semibold">{manualErrors.wholesaleRate}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="stockCount" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Initial Stock Count <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="stockCount"
                      name="stockCount"
                      value={manualForm.stockCount}
                      onChange={handleFormChange}
                      placeholder="0"
                      className={`w-full erp-input num-mono text-right ${
                        manualErrors.stockCount ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                      }`}
                    />
                    {manualErrors.stockCount && (
                      <p className="text-[11px] text-red-600 font-semibold">{manualErrors.stockCount}</p>
                    )}
                  </div>
                </div>

                {/* Form actions */}
                <div className="pt-4 flex justify-end gap-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setManualForm({
                        itemCode: "",
                        description: "",
                        category: "Health Faucets",
                        mrp: "",
                        wholesaleRate: "",
                        stockCount: "",
                      });
                      setManualErrors({});
                    }}
                    className="erp-btn erp-btn-secondary"
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="erp-btn erp-btn-primary bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    Add Product Record
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: BULK TALLY SYNC                                         */}
          {/* ============================================================== */}
          {activeTab === "sync" && (
            <div className="space-y-4">
              
              {/* Drag & Drop Upload Zone */}
              <div className="bg-white border border-gray-300 shadow-sm p-4 md:p-6 rounded-none space-y-4">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Upload Stock Export from Tally ERP
                </h3>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    dragActive ? "border-indigo-600 bg-indigo-50/40" : "border-gray-300 bg-gray-50 hover:bg-gray-100/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv"
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-bold text-gray-700">
                    {csvFileName ? `File Selected: ${csvFileName}` : "Drag and drop your Tally stock export CSV here"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Accepts column headers: <code className="font-mono bg-gray-200 px-1 text-[10px] text-gray-700">itemCode</code> / <code className="font-mono bg-gray-200 px-1 text-[10px] text-gray-700">newStockCount</code> (or similar)
                  </p>
                </div>
              </div>

              {/* Data Mapping Preview Table */}
              {parsedRows.length > 0 && (
                <div className="bg-white border border-gray-300 shadow-sm rounded-none overflow-hidden space-y-3 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        CSV Data Mapping & Sync Preview
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Verify stock updates and flagged warnings before committing changes to the database.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCsvFileName(null);
                          setParsedRows([]);
                        }}
                        className="erp-btn erp-btn-secondary py-1 text-xs"
                      >
                        Cancel Sync
                      </button>
                      <button
                        onClick={() => setShowSyncConfirm(true)}
                        disabled={validRowsCount === 0}
                        className="erp-btn erp-btn-primary bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 text-xs disabled:opacity-50"
                      >
                        Commit Sync ({validRowsCount} Rows)
                      </button>
                    </div>
                  </div>

                  {/* Summary Counts Badges */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <span className="bg-gray-100 text-gray-700 border border-gray-300 px-2 py-0.5 rounded-none num-mono">
                      Parsed: {parsedRows.length} Rows
                    </span>
                    <span className="bg-green-50 text-green-700 border border-green-300 px-2 py-0.5 rounded-none num-mono">
                      Matched (Valid): {validRowsCount} Rows
                    </span>
                    <span className="bg-yellow-50 text-yellow-700 border border-yellow-300 px-2 py-0.5 rounded-none num-mono">
                      Unrecognized: {parsedRows.filter((r) => r.status === "Unrecognized").length} Rows
                    </span>
                    <span className="bg-gray-100 text-gray-400 border border-gray-300 px-2 py-0.5 rounded-none num-mono">
                      No Change: {parsedRows.filter((r) => r.status === "No change").length} Rows
                    </span>
                    <span className="bg-red-50 text-red-700 border border-red-300 px-2 py-0.5 rounded-none num-mono">
                      Malformed (Error): {parsedRows.filter((r) => r.status === "Malformed").length} Rows
                    </span>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto border border-gray-200">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th className="w-24">Item Code</th>
                          <th>Description</th>
                          <th className="w-28 text-right font-mono">Current Stock</th>
                          <th className="w-28 text-right font-mono">New Stock</th>
                          <th className="w-24 text-center font-mono">Diff</th>
                          <th className="w-36">Row Status</th>
                          <th>Notes / Warnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((row, idx) => {
                          let statusColor = "";
                          let diffColor = "text-gray-500";
                          let diffText = "0";

                          switch (row.status) {
                            case "Matched":
                              statusColor = "text-green-700 bg-green-50 border-green-200";
                              break;
                            case "Unrecognized":
                              statusColor = "text-yellow-700 bg-yellow-50 border-yellow-200";
                              break;
                            case "No change":
                              statusColor = "text-gray-500 bg-gray-50 border-gray-200";
                              break;
                            case "Malformed":
                              statusColor = "text-red-700 bg-red-50 border-red-200";
                              break;
                          }

                          if (row.difference > 0) {
                            diffColor = "text-green-600 font-bold";
                            diffText = `+${row.difference}`;
                          } else if (row.difference < 0) {
                            diffColor = "text-red-600 font-bold";
                            diffText = `${row.difference}`;
                          }

                          return (
                            <tr key={idx} className={row.status === "Malformed" ? "bg-red-50/20" : ""}>
                              <td className="num-mono font-bold">{row.itemCode}</td>
                              <td className="font-semibold text-gray-800 truncate max-w-xs">{row.description}</td>
                              <td className="num-mono text-right text-gray-500">{row.currentStock}</td>
                              <td className="num-mono text-right font-bold text-gray-800">{row.newStock}</td>
                              <td className={`num-mono text-center ${diffColor}`}>{diffText}</td>
                              <td>
                                <span className={`inline-block text-[10px] font-bold border px-1.5 py-0.5 rounded-none uppercase tracking-wide ${statusColor}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="text-xs text-gray-500 font-medium">
                                {row.status === "Malformed" && (
                                  <span className="text-red-600 flex items-center gap-1 font-bold">
                                    <AlertCircle className="h-3 w-3 shrink-0" /> {row.errorDetails}
                                  </span>
                                )}
                                {row.status === "Unrecognized" && (
                                  <span className="text-yellow-600 flex items-center gap-1 font-bold">
                                    <AlertCircle className="h-3 w-3 shrink-0" /> Will be skipped during sync.
                                  </span>
                                )}
                                {row.status === "Matched" && <span className="text-green-600">Valid update target.</span>}
                                {row.status === "No change" && <span>Identical quantities. No DB update.</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </main>

      {/* --- Sync Commit Confirmation Modal --- */}
      {showSyncConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-300 max-w-sm w-full p-5 shadow-2xl rounded-none flex flex-col gap-4 text-gray-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b pb-3 shrink-0">
              <Database className="h-5 w-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-900">
                Confirm Commit Sync
              </h3>
            </div>
            
            <div className="space-y-2 text-xs">
              <p className="text-gray-600">
                You are about to write Tally stock counts back to the mock database.
              </p>
              <div className="border border-gray-200 p-2.5 bg-gray-50 space-y-1">
                <div className="flex justify-between font-bold text-gray-700">
                  <span>Matched Updates:</span>
                  <span className="num-mono text-green-600">{validRowsCount} Rows</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-500">
                  <span>Ignored/Errors:</span>
                  <span className="num-mono text-red-650">{parsedRows.length - validRowsCount} Rows</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                Note: Malformed values and unrecognized product codes will be ignored. This operation cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSyncConfirm(false)}
                className="flex-1 erp-btn erp-btn-secondary text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitSync}
                className="flex-1 erp-btn erp-btn-primary bg-indigo-600 border-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase"
              >
                Commit Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
