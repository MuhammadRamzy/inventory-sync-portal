"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  LogOut,
  Settings,
  Layers,
  Plus,
  Shield,
  Package,
  XCircle,
  Image as ImageIcon
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { AppSettings, CategoryThresholdMap, Product } from "@/lib/types";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkSyncProducts,
  fetchSettings,
  saveSettings,
  fetchCategoryThresholds,
  saveCategoryThresholds,
  setCatalogPassword as setCatalogPasswordApi,
  uploadImage,
  checkAdminSession,
  adminLogin,
  adminLogout,
  updateAdminCredentials,
} from "@/lib/api-client";
import { formatCurrency, compressImage, parseTallyParticulars } from "@/lib/utils";
import { BRANDING } from "@/lib/branding";
import StockBadge from "@/components/StockBadge";
import SearchBar from "@/components/SearchBar";
import CategoryFilterPills from "@/components/CategoryFilterPills";
import LogoImage from "@/components/LogoImage";

// Admin Profile constant
const ADMIN_USER = {
  name: BRANDING.adminDisplayName,
  role: BRANDING.adminRole,
  location: BRANDING.regionLabel,
};

interface CsvRowPreview {
  itemCode: string;
  description: string;
  currentStock: number;
  newStock: number;
  difference: number;
  currentMrp?: number;
  newMrp?: number;
  status: "Matched" | "Unrecognized" | "No change" | "Malformed";
  category?: string;
  errorDetails?: string;
}

export default function AdminCommandCenter() {
  const [activeTab, setActiveTab] = useState<"master" | "manual" | "sync" | "settings">("master");
  const [products, setProducts] = useState<Product[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // --- Inventory Master States ---
  const [masterSearch, setMasterSearch] = useState("");
  const [masterCategory, setMasterCategory] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Product>("itemCode");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editMrp, setEditMrp] = useState<string>("");
  const [editStock, setEditStock] = useState<string>("");
  const [editImage, setEditImage] = useState<string>("");
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [editPosterImage, setEditPosterImage] = useState<string>("");
  const [editPosterImageUploading, setEditPosterImageUploading] = useState(false);
  const [savingRow, setSavingRow] = useState(false);

  // --- Settings States ---
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("50");
  const [inStockMinQty, setInStockMinQty] = useState("51");
  // Per-category overrides of the two fields above. `categoryThresholds` is
  // the last-saved state from the server; `categoryThresholdEdits` holds
  // in-progress edits keyed by category, only populated once the admin
  // touches that category's row (see getCategoryThresholdRow below).
  const [categoryThresholds, setCategoryThresholds] = useState<CategoryThresholdMap>({});
  const [categoryThresholdEdits, setCategoryThresholdEdits] = useState<
    Record<string, { enabled: boolean; low: string; inStock: string }>
  >({});
  const [savingCategoryThresholds, setSavingCategoryThresholds] = useState(false);
  const [hasCatalogPassword, setHasCatalogPassword] = useState(false);
  const [catalogPassword, setCatalogPassword] = useState("");
  const [confirmCatalogPassword, setConfirmCatalogPassword] = useState("");
  const [savingCatalogPassword, setSavingCatalogPassword] = useState(false);
  const [currPassword, setCurrPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // --- Manual Product Entry States ---
  const [manualForm, setManualForm] = useState({
    itemCode: "",
    description: "",
    category: BRANDING.defaultCategories[0] as string,
    mrp: "",
    stockCount: "",
    image: "",
    posterImage: "",
  });
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});
  const [isCreatingManualCategory, setIsCreatingManualCategory] = useState(false);
  const [newManualCategoryName, setNewManualCategoryName] = useState("");
  const [manualImageUploading, setManualImageUploading] = useState(false);
  const [manualPosterUploading, setManualPosterUploading] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  // --- Bulk Tally Sync States ---
  const [dragActive, setDragActive] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvRowPreview[]>([]);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]); // indexes of rows in parsedRows
  const [bulkCategory, setBulkCategory] = useState(BRANDING.defaultCategories[0]);
  const [isCreatingBulkCategory, setIsCreatingBulkCategory] = useState(false);
  const [newBulkCategoryName, setNewBulkCategoryName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auth States ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Load products initially
  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
      showToast("error", "Failed to load inventory from the database.");
    }
  };

  useEffect(() => {
    checkAdminSession()
      .then((session) => {
        setIsAuthenticated(session.authenticated);
        if (session.authenticated && session.username) {
          setNewUsername(session.username);
        }
        // Only fetch products once we know whether a session cookie already
        // exists — calling this unconditionally races the login flow and
        // (when the sales catalog has a password set) fails with a
        // confusing 401 before the admin has even seen the login form.
        if (session.authenticated) {
          loadProducts();
        }
      })
      .catch((error) => console.error("Failed to check admin session:", error))
      .finally(() => setCheckingAuth(false));

    fetchSettings()
      .then((settings) => {
        setWhatsappNumber(settings.whatsappNumber);
        setLowStockThreshold(String(settings.lowStockThreshold));
        setInStockMinQty(String(settings.inStockMinQty));
        setHasCatalogPassword(settings.hasCatalogPassword);
      })
      .catch((error) => console.error("Failed to load settings:", error));

    fetchCategoryThresholds()
      .then(setCategoryThresholds)
      .catch((error) => console.error("Failed to load category thresholds:", error));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await adminLogin(loginUsername.trim(), loginPassword);
    if (result.success) {
      setIsAuthenticated(true);
      setLoginError("");
      setLoginUsername("");
      setLoginPassword("");
      checkAdminSession().then((session) => {
        if (session.authenticated && session.username) setNewUsername(session.username);
      });
      // The initial mount-time loadProducts() runs before login and gets a
      // 401 if the sales catalog has a password set (since /api/products now
      // requires either a catalog or admin session) — refetch now that we
      // actually have one.
      loadProducts();
      showToast("success", `Welcome back, ${ADMIN_USER.name}!`);
    } else {
      setLoginError(result.error || "Invalid Operator ID or Password credentials.");
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setIsAuthenticated(false);
    showToast("success", "Session cleared. Operator logged out.");
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      showToast("error", "Username cannot be empty.");
      return;
    }
    if (!newPassword || newPassword !== confirmNewPassword) {
      showToast("error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 4) {
      showToast("error", "Password must be at least 4 characters long.");
      return;
    }

    const result = await updateAdminCredentials(currPassword, newUsername.trim(), newPassword);
    if (!result.success) {
      showToast("error", result.error || "Current password verification failed.");
      return;
    }

    // Reset inputs
    setCurrPassword("");
    setNewPassword("");
    setConfirmNewPassword("");

    showToast("success", "Security credentials updated successfully.");
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappNumber.trim()) {
      showToast("error", "WhatsApp number cannot be empty.");
      return;
    }
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
    if (cleanNumber.length < 10) {
      showToast("error", "Please enter a valid WhatsApp phone number.");
      return;
    }
    const threshold = parseInt(lowStockThreshold, 10);
    if (isNaN(threshold) || threshold < 0) {
      showToast("error", "Please enter a valid low stock quantity.");
      return;
    }
    const inStockMin = parseInt(inStockMinQty, 10);
    if (isNaN(inStockMin) || inStockMin < 1) {
      showToast("error", "Please enter a valid in stock quantity.");
      return;
    }
    if (inStockMin <= threshold) {
      showToast("error", "In stock quantity must be greater than the low stock quantity.");
      return;
    }
    const result = await saveSettings({
      whatsappNumber: cleanNumber,
      lowStockThreshold: threshold,
      inStockMinQty: inStockMin,
      hasCatalogPassword,
    });
    if (result.success) {
      showToast("success", "Settings saved successfully.");
    } else {
      showToast("error", result.error || "Failed to save settings.");
    }
  };

  // Effective row shown for a category in the Category Stock Thresholds
  // editor: an in-progress edit if the admin has touched this category this
  // session, else the last-saved override, else "not customized" (falls
  // back to the global quantities above).
  const getCategoryThresholdRow = (category: string) => {
    if (categoryThresholdEdits[category]) return categoryThresholdEdits[category];
    const saved = categoryThresholds[category];
    return {
      enabled: !!saved,
      low: String(saved?.lowStockThreshold ?? lowStockThreshold),
      inStock: String(saved?.inStockMinQty ?? inStockMinQty),
    };
  };

  const updateCategoryThresholdRow = (
    category: string,
    patch: Partial<{ enabled: boolean; low: string; inStock: string }>
  ) => {
    setCategoryThresholdEdits((prev) => ({
      ...prev,
      [category]: { ...getCategoryThresholdRow(category), ...patch },
    }));
  };

  // Resolves the thresholds actually used to render a StockBadge in the
  // inventory list — the saved per-category override if one exists, else
  // the global settings.
  const resolveDisplayThresholds = (category: string) => {
    const saved = categoryThresholds[category];
    return {
      threshold: saved?.lowStockThreshold ?? (parseInt(lowStockThreshold, 10) || 50),
      inStockMinQty: saved?.inStockMinQty ?? (parseInt(inStockMinQty, 10) || 51),
    };
  };

  const handleSaveCategoryThresholds = async () => {
    const payload: CategoryThresholdMap = {};
    for (const category of allCategories) {
      const row = getCategoryThresholdRow(category);
      if (!row.enabled) continue;
      const low = parseInt(row.low, 10);
      const inStock = parseInt(row.inStock, 10);
      if (isNaN(low) || low < 0) {
        showToast("error", `Enter a valid low stock quantity for "${category}".`);
        return;
      }
      if (isNaN(inStock) || inStock < 1) {
        showToast("error", `Enter a valid in stock quantity for "${category}".`);
        return;
      }
      if (inStock <= low) {
        showToast("error", `In stock quantity must be greater than low stock quantity for "${category}".`);
        return;
      }
      payload[category] = { lowStockThreshold: low, inStockMinQty: inStock };
    }

    setSavingCategoryThresholds(true);
    const result = await saveCategoryThresholds(payload);
    setSavingCategoryThresholds(false);
    if (result.success) {
      setCategoryThresholds(payload);
      setCategoryThresholdEdits({});
      showToast("success", "Category stock thresholds saved.");
      loadProducts(); // Re-derive stockStatus for every product against the new thresholds
    } else {
      showToast("error", result.error || "Failed to save category thresholds.");
    }
  };

  const handleSetCatalogPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogPassword || catalogPassword !== confirmCatalogPassword) {
      showToast("error", "Catalog passwords do not match.");
      return;
    }
    setSavingCatalogPassword(true);
    const result = await setCatalogPasswordApi(catalogPassword);
    setSavingCatalogPassword(false);
    if (result.success) {
      setHasCatalogPassword(true);
      setCatalogPassword("");
      setConfirmCatalogPassword("");
      showToast("success", "Catalog password updated. Sales staff must sign in again.");
    } else {
      showToast("error", result.error || "Failed to update catalog password.");
    }
  };

  const handleDisableCatalogPassword = async () => {
    if (!confirm("Disable catalog access protection? Anyone with the catalog link will be able to view it.")) {
      return;
    }
    setSavingCatalogPassword(true);
    const result = await setCatalogPasswordApi("");
    setSavingCatalogPassword(false);
    if (result.success) {
      setHasCatalogPassword(false);
      setCatalogPassword("");
      setConfirmCatalogPassword("");
      showToast("success", "Catalog password protection disabled.");
    } else {
      showToast("error", result.error || "Failed to disable catalog password.");
    }
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
    setEditDescription(product.description);
    setEditCategory(product.category);
    setEditMrp(product.mrp.toString());
    setEditStock(product.stockCount.toString());
    setEditImage(product.image || "");
    setEditPosterImage(product.posterImage || "");
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditImageUploading(false);
    setEditPosterImageUploading(false);
  };

  // Uploads a freshly-selected image (a compressed `data:` URL) to R2 and
  // returns its served path; an already-stored `/api/images/…` URL or an
  // empty string (image cleared) is passed straight through. Because the
  // upload happens here at save-time — not when the file is picked — canceling
  // an edit or re-picking a file never leaves orphaned objects in R2.
  const resolveImageForSave = async (
    value: string,
    name: string
  ): Promise<{ url: string } | { error: string }> => {
    if (!value || !value.startsWith("data:")) return { url: value };
    const result = await uploadImage(value, name);
    if ("error" in result) return { error: result.error };
    return { url: result.url };
  };

  const handleEditImageSelect = async (file: File) => {
    try {
      setEditImageUploading(true);
      const compressed = await compressImage(file);
      setEditImage(compressed); // held locally; uploaded on save
    } catch {
      showToast("error", "Failed to process image.");
    } finally {
      setEditImageUploading(false);
    }
  };

  const handleEditPosterImageSelect = async (file: File) => {
    try {
      setEditPosterImageUploading(true);
      // Higher fidelity than product photos — posters usually carry text and
      // feature callouts that need to stay legible, not just recognizable.
      const compressed = await compressImage(file, 2000, 2000, 0.95);
      setEditPosterImage(compressed); // held locally; uploaded on save
    } catch {
      showToast("error", "Failed to process image.");
    } finally {
      setEditPosterImageUploading(false);
    }
  };

  const saveInlineEdit = async (itemCode: string) => {
    const mrpNum = parseFloat(editMrp);
    const stockNum = parseInt(editStock, 10);

    if (!editDescription.trim()) {
      showToast("error", "Description cannot be empty.");
      return;
    }
    if (!editCategory.trim()) {
      showToast("error", "Category cannot be empty.");
      return;
    }
    if (isNaN(mrpNum) || mrpNum <= 0) {
      showToast("error", "MRP must be a positive number.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      showToast("error", "Stock count must be a non-negative integer.");
      return;
    }
    if (editImageUploading || editPosterImageUploading) {
      showToast("error", "Please wait for the image to finish processing.");
      return;
    }

    setSavingRow(true);
    // Upload any newly-picked photo/poster now, then persist. The server
    // deletes the previously-stored R2 object whenever the URL changes or is
    // cleared (see updateProduct in lib/server/products.ts).
    const img = await resolveImageForSave(editImage, `${itemCode}-photo`);
    if ("error" in img) {
      showToast("error", img.error);
      setSavingRow(false);
      return;
    }
    const poster = await resolveImageForSave(editPosterImage, `${itemCode}-poster`);
    if ("error" in poster) {
      showToast("error", poster.error);
      setSavingRow(false);
      return;
    }
    const result = await updateProduct(itemCode, {
      description: editDescription.trim(),
      category: editCategory,
      mrp: mrpNum,
      stockCount: stockNum,
      image: img.url,
      posterImage: poster.url,
    });
    setSavingRow(false);

    if (result.success) {
      showToast("success", `Product ${itemCode} updated successfully.`);
      setEditingRow(null);
      loadProducts();
    } else {
      showToast("error", result.error || `Failed to update product ${itemCode}.`);
    }
  };

  const deleteProductItem = async (itemCode: string) => {
    if (confirm(`Are you sure you want to delete product '${itemCode}'?`)) {
      const result = await deleteProduct(itemCode);
      if (result.success) {
        showToast("success", `Product ${itemCode} deleted.`);
        loadProducts();
      } else {
        showToast("error", result.error || `Failed to delete product ${itemCode}.`);
      }
    }
  };

  // Inventory-wide stats (Master tab summary bar)
  const inStockCount = products.filter((p) => p.stockStatus === "In Stock").length;
  const lowStockCount = products.filter((p) => p.stockStatus === "Low Stock").length;
  const outOfStockCount = products.filter((p) => p.stockStatus === "Out of Stock").length;

  // Filter & Sort Master list
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const dbCategories = Array.from(new Set(products.map((p) => p.category)));
  const parsedCategories = Array.from(new Set(parsedRows.map((p) => p.category).filter(Boolean))) as string[];
  const defaultCategories = [...BRANDING.defaultCategories];
  const allCategories = Array.from(new Set([...defaultCategories, ...dbCategories, ...parsedCategories])).filter(Boolean);

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

  const handleManualImageSelect = async (file: File) => {
    try {
      setManualImageUploading(true);
      const compressed = await compressImage(file);
      setManualForm((prev) => ({ ...prev, image: compressed })); // held locally; uploaded on submit
    } catch {
      showToast("error", "Failed to process image.");
    } finally {
      setManualImageUploading(false);
    }
  };

  const handleManualPosterSelect = async (file: File) => {
    try {
      setManualPosterUploading(true);
      // Higher fidelity than product photos — posters usually carry text and
      // feature callouts that need to stay legible, not just recognizable.
      const compressed = await compressImage(file, 2000, 2000, 0.95);
      setManualForm((prev) => ({ ...prev, posterImage: compressed })); // held locally; uploaded on submit
    } catch {
      showToast("error", "Failed to process image.");
    } finally {
      setManualPosterUploading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateManualForm()) return;
    if (manualImageUploading || manualPosterUploading) {
      showToast("error", "Please wait for the image to finish processing.");
      return;
    }

    setSubmittingManual(true);
    const codeForName = manualForm.itemCode.trim().toUpperCase() || "product";
    const img = await resolveImageForSave(manualForm.image, `${codeForName}-photo`);
    if ("error" in img) {
      showToast("error", img.error);
      setSubmittingManual(false);
      return;
    }
    const poster = await resolveImageForSave(manualForm.posterImage, `${codeForName}-poster`);
    if ("error" in poster) {
      showToast("error", poster.error);
      setSubmittingManual(false);
      return;
    }
    const result = await createProduct({
      itemCode: manualForm.itemCode.trim().toUpperCase(),
      description: manualForm.description.trim(),
      category: manualForm.category,
      mrp: parseFloat(manualForm.mrp),
      stockCount: parseInt(manualForm.stockCount, 10),
      image: img.url,
      posterImage: poster.url,
    });
    setSubmittingManual(false);

    if (result.success) {
      showToast("success", `Product ${manualForm.itemCode.toUpperCase()} added successfully.`);
      // Reset Form
      setManualForm({
        itemCode: "",
        description: "",
        category: BRANDING.defaultCategories[0],
        mrp: "",
        stockCount: "",
        image: "",
        posterImage: "",
      });
      setManualErrors({});
      loadProducts();
    } else {
      showToast("error", result.error || "Failed to add product.");
    }
  };

  // --- Bulk Tally Sync Handlers ---
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(parsedRows.map((_, idx) => idx));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (idx: number) => {
    setSelectedRows((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleBulkCategoryApply = (categoryName: string) => {
    if (selectedRows.length === 0) {
      showToast("error", "No rows selected.");
      return;
    }
    setParsedRows((prev) =>
      prev.map((row, idx) =>
        selectedRows.includes(idx) ? { ...row, category: categoryName } : row
      )
    );
    showToast("success", `Assigned ${selectedRows.length} items to "${categoryName}".`);
  };

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
      processSyncFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSyncFile(e.target.files[0]);
    }
  };

  const processSyncFile = (file: File) => {
    setCsvFileName(file.name);
    setSelectedRows([]);
    setIsCreatingBulkCategory(false);
    setNewBulkCategoryName("");
    const isExcel = file.name.endsWith(".xls") || file.name.endsWith(".xlsx");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          if (rows.length === 0) {
            showToast("error", "The uploaded file is empty.");
            setParsedRows([]);
            return;
          }

          let foundCategory = "";
          for (let i = 0; i < Math.min(8, rows.length); i++) {
            const row = rows[i];
            if (row) {
              for (let j = 0; j < row.length; j++) {
                const val = String(row[j] || "").trim();
                if (BRANDING.defaultCategories.includes(val)) {
                  foundCategory = val;
                  break;
                }
              }
            }
            if (foundCategory) break;
          }
          const category = foundCategory || BRANDING.defaultCategories[BRANDING.defaultCategories.length - 1];

          let headerRowIndex = -1;
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row && row[0] === "Particulars") {
              headerRowIndex = i;
              break;
            }
          }

          let dataStartIndex = headerRowIndex !== -1 ? headerRowIndex + 3 : 9;
          const previewList: CsvRowPreview[] = [];
          
          for (let i = dataStartIndex; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            const rawParticulars = String(row[0] || "").trim();
            if (!rawParticulars || rawParticulars === "Grand Total" || rawParticulars === "Particulars") continue;
            
            // Extract raw values, parse text like "18 pcs" into 18
            const rawStockText = String(row[1] || "0");
            const quantity = parseInt(rawStockText, 10);
            const rate = parseFloat(String(row[2] || "0"));
            
            const { itemCode, description } = parseTallyParticulars(rawParticulars);
            
            const matchedProd = products.find(
              (p) => p.itemCode.toUpperCase() === itemCode.toUpperCase() || p.description.toLowerCase() === description.toLowerCase()
            );

            const currentStock = matchedProd ? matchedProd.stockCount : 0;
            const currentMrp = matchedProd ? matchedProd.mrp : 0;
            const diff = (isNaN(quantity) ? 0 : quantity) - currentStock;
            
            let status: CsvRowPreview["status"] = "Matched";
            if (!matchedProd) {
              status = "Unrecognized";
            } else if (diff === 0 && rate === matchedProd.mrp) {
              status = "No change";
            }
            
            const rowCategory = matchedProd ? matchedProd.category : (foundCategory || BRANDING.defaultCategories[BRANDING.defaultCategories.length - 1]);

            previewList.push({
              itemCode,
              description,
              currentStock,
              newStock: isNaN(quantity) ? 0 : quantity,
              difference: diff,
              currentMrp,
              newMrp: isNaN(rate) ? 0 : rate,
              status,
              category: rowCategory
            });
          }
          
          setParsedRows(previewList);
          showToast("success", `Parsed ${previewList.length} products from Excel.`);
        } catch (err: any) {
          console.error("Excel parse error:", err);
          showToast("error", `Failed to parse Excel file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
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

          const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[\s_-]/g, "");

          const firstRow = rows[0];
          const keys = Object.keys(firstRow);
          
          let codeKey = "";
          let stockKey = "";
          let mrpKey = "";

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
              norm === "qty" ||
              norm === "quantity"
            ) {
              stockKey = key;
            }
            if (norm === "mrp" || norm === "rate" || norm === "price") {
              mrpKey = key;
            }
          });

          if (!codeKey || !stockKey) {
            codeKey = keys[0] || "";
            stockKey = keys[1] || "";
          }
          if (!mrpKey) {
            mrpKey = keys[2] || "";
          }

          const previewList: CsvRowPreview[] = rows.map((row) => {
            const rawCode = (row[codeKey] || "").trim();
            const rawStock = (row[stockKey] || "").trim();
            const rawMrp = mrpKey ? (row[mrpKey] || "").trim() : "";

            const parsedStock = parseInt(rawStock, 10);
            const parsedMrp = rawMrp ? parseFloat(rawMrp) : 0;
            
            const { itemCode, description } = parseTallyParticulars(rawCode);

            const matchedProd = products.find(
              (p) => p.itemCode.toUpperCase() === itemCode.toUpperCase()
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
                itemCode,
                description: matchedProd ? matchedProd.description : description,
                currentStock: matchedProd ? matchedProd.stockCount : 0,
                newStock: 0,
                difference: 0,
                status: "Malformed",
                errorDetails: `Invalid numeric quantity count: '${rawStock}'.`,
              };
            }

            const currentStock = matchedProd ? matchedProd.stockCount : 0;
            const currentMrp = matchedProd ? matchedProd.mrp : 0;
            const newMrp = isNaN(parsedMrp) || parsedMrp <= 0 ? currentMrp : parsedMrp;
            const diff = parsedStock - currentStock;
            
            let status: CsvRowPreview["status"] = "Matched";
            if (!matchedProd) {
              status = "Unrecognized";
            } else if (diff === 0 && newMrp === currentMrp) {
              status = "No change";
            }

            return {
              itemCode,
              description: matchedProd ? matchedProd.description : description,
              currentStock,
              newStock: parsedStock,
              difference: diff,
              currentMrp,
              newMrp,
              status,
              category: matchedProd ? matchedProd.category : BRANDING.defaultCategories[BRANDING.defaultCategories.length - 1],
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
    }
  };

  const handleCommitSync = async () => {
    const validRows = parsedRows.filter((r) => r.status === "Matched" || r.status === "Unrecognized");

    if (validRows.length === 0) {
      showToast("error", "No valid rows to commit updates for.");
      return;
    }

    const updates = validRows.map((r) => ({
      itemCode: r.itemCode,
      description: r.description,
      stockCount: r.newStock,
      mrp: r.newMrp || 0,
      category: r.category || BRANDING.defaultCategories[BRANDING.defaultCategories.length - 1]
    }));

    setIsSyncing(true);
    try {
      const result = await bulkSyncProducts(updates);
      showToast(
        "success",
        `Tally Bulk Sync Complete! Updated ${result.successCount} items and created ${result.createdCount} new items.`
      );
      setCsvFileName(null);
      setParsedRows([]);
      setShowSyncConfirm(false);
      setActiveTab("master");
      loadProducts();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to commit sync.");
    } finally {
      setIsSyncing(false);
    }
  };

  const validRowsCount = parsedRows.filter((r) => r.status === "Matched" || r.status === "Unrecognized").length;

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-sm">
        <div className="w-full max-w-sm bg-white border border-gray-300 shadow-2xl p-6 rounded-none space-y-5 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center space-y-3 border-b border-gray-200 pb-4">
            <div className="h-12 w-auto flex items-center justify-center">
              <LogoImage width={160} height={40} className="h-10 w-auto object-contain" />
            </div>
            <div>
              <p className="text-[10px] text-brand-900 font-bold uppercase tracking-widest leading-none">{BRANDING.regionLabel} Console</p>
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
              className="w-full erp-btn erp-btn-primary bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold uppercase tracking-wider py-2.5"
            >
              Establish Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden bg-gray-100 font-sans">

      {/* --- Sidebar (Permanent) — stays fixed on desktop while the workspace
          scrolls independently; on mobile it's a normal top bar. --- */}
      <aside className="w-full lg:w-64 bg-gray-900 text-white shrink-0 border-r border-gray-800 flex flex-col justify-between p-4 lg:h-screen lg:overflow-y-auto">
        <div className="space-y-6">
          
          {/* Logo & Portal Nav */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <div className="flex flex-col items-start gap-1">
              <div className="h-8 w-auto flex items-center justify-start">
                <LogoImage width={120} height={32} className="h-8 w-auto object-contain brightness-0 invert" />
              </div>
              <p className="text-[9px] text-brand-400 font-bold uppercase tracking-widest leading-none mt-1.5 pl-0.5">{BRANDING.regionLabel}</p>
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
            <div className="bg-brand-900/20 text-brand-400 border border-brand-500/30 p-1.5 shrink-0 flex items-center justify-center">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Operator</div>
              <div className="text-xs font-bold text-gray-200 truncate">{ADMIN_USER.name}</div>
              <div className="text-[10px] text-gray-500 font-medium truncate">{ADMIN_USER.role} • {ADMIN_USER.location}</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-row flex-wrap lg:flex-col gap-1">
            <button
              onClick={() => setActiveTab("master")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border shrink-0 transition-colors rounded-none ${
                activeTab === "master"
                  ? "bg-brand-900 border-brand-900 text-white"
                  : "bg-transparent border-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Database className="h-4 w-4" /> Inventory Master
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border shrink-0 transition-colors rounded-none ${
                activeTab === "manual"
                  ? "bg-brand-900 border-brand-900 text-white"
                  : "bg-transparent border-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <PlusCircle className="h-4 w-4" /> Product Entry
            </button>
            <button
              onClick={() => setActiveTab("sync")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border shrink-0 transition-colors rounded-none ${
                activeTab === "sync"
                  ? "bg-brand-900 border-brand-900 text-white"
                  : "bg-transparent border-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <RefreshCw className="h-4 w-4" /> Bulk Tally Sync
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border shrink-0 transition-colors rounded-none ${
                activeTab === "settings"
                  ? "bg-brand-900 border-brand-900 text-white"
                  : "bg-transparent border-transparent text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4" /> Config Settings
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
              {activeTab === "settings" && "Settings Tab"}
            </span>
            <h2 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">
              {activeTab === "master" && "Inventory Master Database"}
              {activeTab === "manual" && "Manual Product Entry Panel"}
              {activeTab === "sync" && "Tally CSV/Excel Bulk Stock Sync"}
              {activeTab === "settings" && "Quotation Contact Configuration"}
            </h2>
          </div>
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

              {/* Inventory Stats Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-300 shadow-sm p-3 flex items-center gap-2.5 rounded-none">
                  <div className="bg-gray-100 text-gray-600 p-2 shrink-0"><Package className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">Total SKUs</div>
                    <div className="text-lg font-black text-gray-900 num-mono leading-tight mt-0.5">{products.length}</div>
                  </div>
                </div>
                <div className="bg-white border border-gray-300 shadow-sm p-3 flex items-center gap-2.5 rounded-none">
                  <div className="bg-green-50 text-green-600 p-2 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">In Stock</div>
                    <div className="text-lg font-black text-gray-900 num-mono leading-tight mt-0.5">{inStockCount}</div>
                  </div>
                </div>
                <div className="bg-white border border-gray-300 shadow-sm p-3 flex items-center gap-2.5 rounded-none">
                  <div className="bg-yellow-50 text-yellow-600 p-2 shrink-0"><AlertCircle className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">Low Stock</div>
                    <div className="text-lg font-black text-gray-900 num-mono leading-tight mt-0.5">{lowStockCount}</div>
                  </div>
                </div>
                <div className="bg-white border border-gray-300 shadow-sm p-3 flex items-center gap-2.5 rounded-none">
                  <div className="bg-red-50 text-red-600 p-2 shrink-0"><XCircle className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">Out of Stock</div>
                    <div className="text-lg font-black text-gray-900 num-mono leading-tight mt-0.5">{outOfStockCount}</div>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="bg-white p-3 border border-gray-300 shadow-sm flex flex-col md:flex-row md:items-center gap-3 rounded-none">
                <div className="w-full md:w-64 lg:w-72 md:shrink-0">
                  <SearchBar
                    value={masterSearch}
                    onChange={setMasterSearch}
                    placeholder="Search by code or description..."
                  />
                </div>
                <div className="w-full min-w-0 md:flex-1">
                  <CategoryFilterPills
                    categories={categories}
                    selectedCategory={masterCategory}
                    onChange={setMasterCategory}
                  />
                </div>
              </div>

              {/* Master Products Table (desktop/tablet) */}
              <div className="hidden md:block bg-white border border-gray-300 shadow-sm rounded-none overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="erp-table animate-fade-in">
                    <thead>
                      <tr className="bg-gray-100/75 border-b border-gray-300 text-xs font-bold text-gray-700 uppercase tracking-wider text-left">
                        <th className="w-28 cursor-pointer hover:bg-gray-200" onClick={() => handleSort("itemCode")}>
                          <div className="flex items-center gap-1">
                            Item Code <ArrowUpDown className="h-3 w-3" />
                          </div>
                        </th>
                        <th className="w-16">Img</th>
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
                        <th className="w-32 text-right cursor-pointer hover:bg-gray-200" onClick={() => handleSort("mrp")}>
                          <div className="flex items-center gap-1 justify-end">
                            MRP <ArrowUpDown className="h-3 w-3" />
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
                            <tr key={p.itemCode} className={isEditing ? "bg-brand-50/40" : ""}>
                              <td className="num-mono font-bold">{p.itemCode}</td>
                              <td className="w-16 py-1">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <div className="relative h-8 w-8 bg-gray-100 border border-dashed border-brand-400 text-gray-400 hover:bg-brand-50 cursor-pointer flex items-center justify-center" title="Product photo">
                                      {editImageUploading ? (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-500" />
                                      ) : editImage ? (
                                        <img src={editImage} alt={p.itemCode} className="h-full w-full object-cover animate-fade-in" />
                                      ) : (
                                        <Plus className="h-4 w-4" />
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            await handleEditImageSelect(file);
                                          }
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        title="Upload product photo"
                                      />
                                      {editImage && !editImageUploading && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditImage(""); }}
                                          className="absolute -top-1.5 -right-1.5 z-20 h-4 w-4 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow"
                                          title="Remove photo"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </div>
                                    <div className="relative h-8 w-8 bg-gray-100 border border-dashed border-brand-400 text-gray-400 hover:bg-brand-50 cursor-pointer flex items-center justify-center" title="Poster / feature sheet">
                                      {editPosterImageUploading ? (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-500" />
                                      ) : editPosterImage ? (
                                        <img src={editPosterImage} alt={`${p.itemCode} poster`} className="h-full w-full object-cover animate-fade-in" />
                                      ) : (
                                        <ImageIcon className="h-3.5 w-3.5" />
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            await handleEditPosterImageSelect(file);
                                          }
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        title="Upload poster"
                                      />
                                      {editPosterImage && !editPosterImageUploading && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditPosterImage(""); }}
                                          className="absolute -top-1.5 -right-1.5 z-20 h-4 w-4 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow"
                                          title="Remove poster"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : p.image ? (
                                  <img src={p.image} alt={p.itemCode} className="h-8 w-8 object-cover border border-gray-200" />
                                ) : (
                                  <div className="h-8 w-8 bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400">
                                    <Layers className="h-4 w-4" />
                                  </div>
                                )}
                              </td>
                              <td className="font-semibold text-gray-800">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="erp-input w-full p-0.5"
                                  />
                                ) : (
                                  p.description
                                )}
                              </td>
                              <td className="text-[10px] font-bold text-gray-500 uppercase">
                                {isEditing ? (
                                  <select
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="erp-input w-full p-0.5 normal-case"
                                  >
                                    {allCategories.map((cat) => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>
                                ) : (
                                  p.category
                                )}
                              </td>
                              <td className="text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editMrp}
                                    onChange={(e) => setEditMrp(e.target.value)}
                                    className="erp-input num-mono text-right w-24 p-0.5"
                                    step="0.01"
                                  />
                                ) : (
                                  <span className="num-mono font-bold text-brand-800">
                                    {formatCurrency(p.mrp)}
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
                                <StockBadge
                                  count={isEditing ? parseInt(editStock, 10) || 0 : p.stockCount}
                                  status={isEditing ? undefined : p.stockStatus}
                                  threshold={resolveDisplayThresholds(isEditing ? editCategory : p.category).threshold}
                                  inStockMinQty={resolveDisplayThresholds(isEditing ? editCategory : p.category).inStockMinQty}
                                />
                              </td>
                              <td className="text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => saveInlineEdit(p.itemCode)}
                                      disabled={savingRow || editImageUploading}
                                      className="p-1 bg-green-600 text-white hover:bg-green-700 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Save Changes"
                                    >
                                      {savingRow ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      disabled={savingRow}
                                      className="p-1 bg-gray-500 text-white hover:bg-gray-600 rounded-none disabled:opacity-50"
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

              {/* Master Products List (mobile) */}
              <div className="md:hidden space-y-3">
                {filteredMasterProducts.length === 0 ? (
                  <div className="bg-white border border-gray-300 shadow-sm p-6 text-center text-sm text-gray-500">
                    No records found matching search queries.
                  </div>
                ) : (
                  filteredMasterProducts.map((p) => {
                    const isEditing = editingRow === p.itemCode;
                    return (
                      <div
                        key={p.itemCode}
                        className={`bg-white border shadow-sm p-3 space-y-2.5 ${isEditing ? "border-brand-400 bg-brand-50/40" : "border-gray-300"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="relative h-11 w-11 shrink-0 bg-gray-100 border border-dashed border-brand-400 text-gray-400 hover:bg-brand-50 cursor-pointer flex items-center justify-center" title="Product photo">
                                  {editImageUploading ? (
                                    <RefreshCw className="h-4 w-4 animate-spin text-brand-500" />
                                  ) : editImage ? (
                                    <img src={editImage} alt={p.itemCode} className="h-full w-full object-cover animate-fade-in" />
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        await handleEditImageSelect(file);
                                      }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    title="Upload product photo"
                                  />
                                  {editImage && !editImageUploading && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditImage(""); }}
                                      className="absolute -top-1.5 -right-1.5 z-20 h-4 w-4 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow"
                                      title="Remove photo"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                                <div className="relative h-11 w-11 shrink-0 bg-gray-100 border border-dashed border-brand-400 text-gray-400 hover:bg-brand-50 cursor-pointer flex items-center justify-center" title="Poster / feature sheet">
                                  {editPosterImageUploading ? (
                                    <RefreshCw className="h-4 w-4 animate-spin text-brand-500" />
                                  ) : editPosterImage ? (
                                    <img src={editPosterImage} alt={`${p.itemCode} poster`} className="h-full w-full object-cover animate-fade-in" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4" />
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        await handleEditPosterImageSelect(file);
                                      }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    title="Upload poster"
                                  />
                                  {editPosterImage && !editPosterImageUploading && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditPosterImage(""); }}
                                      className="absolute -top-1.5 -right-1.5 z-20 h-4 w-4 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow"
                                      title="Remove poster"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : p.image ? (
                              <img src={p.image} alt={p.itemCode} className="h-11 w-11 shrink-0 object-cover border border-gray-200" />
                            ) : (
                              <div className="h-11 w-11 shrink-0 bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400">
                                <Layers className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="num-mono font-bold text-xs text-gray-900">{p.itemCode}</div>
                              {isEditing ? (
                                <select
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                  className="erp-input w-full p-0.5 text-[10px] mt-0.5"
                                >
                                  {allCategories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="text-[9px] font-bold text-gray-500 uppercase truncate">{p.category}</div>
                              )}
                            </div>
                          </div>
                          <StockBadge
                                  count={isEditing ? parseInt(editStock, 10) || 0 : p.stockCount}
                                  status={isEditing ? undefined : p.stockStatus}
                                  threshold={resolveDisplayThresholds(isEditing ? editCategory : p.category).threshold}
                                  inStockMinQty={resolveDisplayThresholds(isEditing ? editCategory : p.category).inStockMinQty}
                                />
                        </div>

                        {isEditing ? (
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="erp-input w-full text-xs p-1.5"
                          />
                        ) : (
                          <p className="text-xs font-semibold text-gray-800 leading-snug">{p.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                          <div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase block">MRP</span>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editMrp}
                                onChange={(e) => setEditMrp(e.target.value)}
                                className="erp-input num-mono text-xs w-full p-0.5"
                                step="0.01"
                              />
                            ) : (
                              <span className="num-mono text-xs font-bold text-brand-800">{formatCurrency(p.mrp)}</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase block">Stock</span>
                            {isEditing ? (
                              <input
                                type="number"
                                value={editStock}
                                onChange={(e) => setEditStock(e.target.value)}
                                className="erp-input num-mono text-xs w-full p-0.5"
                              />
                            ) : (
                              <span className="num-mono text-xs font-semibold">{p.stockCount}</span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveInlineEdit(p.itemCode)}
                                disabled={savingRow || editImageUploading}
                                className="flex-1 erp-btn bg-green-600 text-white hover:bg-green-700 rounded-none disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase py-2"
                              >
                                {savingRow ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={savingRow}
                                className="flex-1 erp-btn bg-gray-500 text-white hover:bg-gray-600 rounded-none disabled:opacity-50 text-xs font-bold uppercase py-2"
                              >
                                <X className="h-3.5 w-3.5" /> Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditing(p)}
                                className="flex-1 erp-btn erp-btn-secondary text-xs uppercase font-bold py-2"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteProductItem(p.itemCode)}
                                className="p-2 text-red-600 hover:bg-red-50 border border-gray-300 rounded-none"
                                title="Delete Product"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
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
                  <PlusCircle className="h-4 w-4 text-brand-900" /> New Product Record
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
                    {isCreatingManualCategory ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newManualCategoryName}
                          onChange={(e) => setNewManualCategoryName(e.target.value)}
                          placeholder="New category name..."
                          className="w-full erp-input"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newManualCategoryName.trim();
                            if (!trimmed) {
                              showToast("error", "Category name cannot be empty.");
                              return;
                            }
                            setManualForm((prev) => ({ ...prev, category: trimmed }));
                            setIsCreatingManualCategory(false);
                            setNewManualCategoryName("");
                          }}
                          className="erp-btn erp-btn-primary bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold shrink-0 px-3"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCreatingManualCategory(false)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-1 shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <select
                        id="category"
                        name="category"
                        value={manualForm.category}
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setIsCreatingManualCategory(true);
                          } else {
                            handleFormChange(e);
                          }
                        }}
                        className="w-full erp-input"
                      >
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="__NEW__" className="text-brand-800 font-bold">+ Create New Category...</option>
                      </select>
                    )}
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
                    placeholder="E.G., Wireless Bluetooth Speaker 20W"
                    className={`w-full erp-input ${
                      manualErrors.description ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                    }`}
                  />
                  {manualErrors.description && (
                    <p className="text-[11px] text-red-600 font-semibold">{manualErrors.description}</p>
                  )}
                </div>

                {/* MRP, Stock */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Product Image */}
                <div className="space-y-1">
                  <label htmlFor="image" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Product Image (Optional)
                  </label>
                  <div className="flex items-center gap-4 border border-gray-300 p-3 bg-gray-50">
                    <div className="h-16 w-16 bg-white border border-gray-300 flex items-center justify-center text-gray-400 shrink-0">
                      {manualImageUploading ? (
                        <RefreshCw className="h-5 w-5 animate-spin text-brand-500" />
                      ) : manualForm.image ? (
                        <img src={manualForm.image} alt="Preview" className="h-full w-full object-cover animate-fade-in" />
                      ) : (
                        <Layers className="h-8 w-8" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <input
                        type="file"
                        id="image"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleManualImageSelect(file);
                          }
                        }}
                        className="text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:border file:border-gray-300 file:bg-gray-50 file:hover:bg-gray-100 file:text-xs file:font-bold file:uppercase file:rounded-none file:cursor-pointer w-full"
                      />
                      <p className="text-[10px] text-gray-400 truncate">
                        Images are compressed client-side, then uploaded to R2 storage.
                      </p>
                    </div>
                    {manualForm.image && (
                      <button
                        type="button"
                        onClick={() => setManualForm(prev => ({ ...prev, image: "" }))}
                        className="erp-btn erp-btn-secondary py-1 text-xs shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Poster / Feature Sheet Image */}
                <div className="space-y-1">
                  <label htmlFor="posterImage" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Product Poster (Optional)
                  </label>
                  <div className="flex items-center gap-4 border border-gray-300 p-3 bg-gray-50">
                    <div className="h-16 w-16 bg-white border border-gray-300 flex items-center justify-center text-gray-400 shrink-0">
                      {manualPosterUploading ? (
                        <RefreshCw className="h-5 w-5 animate-spin text-brand-500" />
                      ) : manualForm.posterImage ? (
                        <img src={manualForm.posterImage} alt="Poster preview" className="h-full w-full object-cover animate-fade-in" />
                      ) : (
                        <ImageIcon className="h-8 w-8" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <input
                        type="file"
                        id="posterImage"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleManualPosterSelect(file);
                          }
                        }}
                        className="text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:border file:border-gray-300 file:bg-gray-50 file:hover:bg-gray-100 file:text-xs file:font-bold file:uppercase file:rounded-none file:cursor-pointer w-full"
                      />
                      <p className="text-[10px] text-gray-400 truncate">
                        A feature/spec sheet image. Shown as a second swipeable slide in the sales catalog.
                      </p>
                    </div>
                    {manualForm.posterImage && (
                      <button
                        type="button"
                        onClick={() => setManualForm(prev => ({ ...prev, posterImage: "" }))}
                        className="erp-btn erp-btn-secondary py-1 text-xs shrink-0"
                      >
                        Remove
                      </button>
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
                        category: BRANDING.defaultCategories[0],
                        mrp: "",
                        stockCount: "",
                        image: "",
                        posterImage: "",
                      });
                      setManualErrors({});
                    }}
                    className="erp-btn erp-btn-secondary"
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    disabled={submittingManual || manualImageUploading}
                    className="erp-btn erp-btn-primary bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingManual ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Adding...
                      </>
                    ) : (
                      "Add Product Record"
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: SETTINGS PANEL                                          */}
          {/* ============================================================== */}
          {activeTab === "settings" && (
            <div className="max-w-xl mx-auto space-y-6">
              
              {/* WhatsApp Config Card */}
              <div className="bg-white border border-gray-300 shadow-sm rounded-none animate-fade-in">
                <div className="bg-gray-50 border-b border-gray-300 px-4 py-2.5">
                  <span className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Settings className="h-4 w-4 text-brand-900" /> WhatsApp Contact Configuration
                  </span>
                </div>
                <form onSubmit={handleSaveSettings} className="p-4 md:p-6 space-y-4 font-sans text-sm">
                  <div className="space-y-1">
                    <label htmlFor="whatsappNumber" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      WhatsApp Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="whatsappNumber"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="E.G., 919388833888"
                      className="w-full erp-input num-mono"
                    />
                    <p className="text-[10px] text-gray-400">
                      Enter the WhatsApp phone number (with country code, no + or spaces) where quotation requests from the sales cart will be directed.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div className="space-y-1">
                      <label htmlFor="lowStockThreshold" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Low Stock Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="lowStockThreshold"
                        min={0}
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value)}
                        placeholder="E.G., 50"
                        className="w-full erp-input num-mono"
                      />
                      <p className="text-[10px] text-gray-400">
                        Stock from 1 up to this number shows &quot;Low Stock&quot; (zero always shows &quot;Out of Stock&quot;).
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="inStockMinQty" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        In Stock Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="inStockMinQty"
                        min={1}
                        value={inStockMinQty}
                        onChange={(e) => setInStockMinQty(e.target.value)}
                        placeholder="E.G., 51"
                        className="w-full erp-input num-mono"
                      />
                      <p className="text-[10px] text-gray-400">
                        Stock at or above this number shows &quot;In Stock&quot;. Must be greater than Low Stock Quantity.
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Sales staff never see the exact stock count on the catalog, only the status.
                  </p>

                  <div className="pt-4 flex justify-end border-t border-gray-200">
                    <button
                      type="submit"
                      className="erp-btn erp-btn-primary bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              </div>

              {/* Category Stock Thresholds Card */}
              <div className="bg-white border border-gray-300 shadow-sm rounded-none animate-fade-in">
                <div className="bg-gray-50 border-b border-gray-300 px-4 py-2.5">
                  <span className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-brand-900" /> Category Stock Thresholds
                  </span>
                </div>
                <div className="p-4 md:p-6 space-y-4 font-sans text-sm">
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Override the Low/In Stock quantities above for individual categories — e.g. fast-moving
                    accessories can use a higher threshold than slow-moving concealed fittings. Any category left
                    unchecked uses the global quantities.
                  </p>

                  {allCategories.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No categories yet — add products first.</p>
                  ) : (
                    <div className="divide-y divide-gray-100 border border-gray-200">
                      {allCategories.map((category) => {
                        const row = getCategoryThresholdRow(category);
                        return (
                          <div key={category} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.enabled}
                                onChange={(e) => updateCategoryThresholdRow(category, { enabled: e.target.checked })}
                                className="h-4 w-4 accent-brand-900 shrink-0"
                              />
                              <span className="text-xs font-bold text-gray-800 truncate">{category}</span>
                            </label>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="space-y-0.5">
                                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                  Low Stock
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={row.low}
                                  disabled={!row.enabled}
                                  onChange={(e) => updateCategoryThresholdRow(category, { low: e.target.value })}
                                  className="erp-input num-mono w-24 disabled:bg-gray-50 disabled:text-gray-400"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                  In Stock
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={row.inStock}
                                  disabled={!row.enabled}
                                  onChange={(e) => updateCategoryThresholdRow(category, { inStock: e.target.value })}
                                  className="erp-input num-mono w-24 disabled:bg-gray-50 disabled:text-gray-400"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleSaveCategoryThresholds}
                      disabled={savingCategoryThresholds || allCategories.length === 0}
                      className="erp-btn erp-btn-primary bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold disabled:opacity-50"
                    >
                      {savingCategoryThresholds ? "Saving..." : "Save Category Thresholds"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Catalog Access / Privacy Card */}
              <div className="bg-white border border-gray-300 shadow-sm rounded-none animate-fade-in">
                <div className="bg-gray-50 border-b border-gray-300 px-4 py-2.5 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-brand-900" /> Sales Catalogue Privacy
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                      hasCatalogPassword
                        ? "bg-green-50 text-green-700 border-green-300"
                        : "bg-yellow-50 text-yellow-700 border-yellow-300"
                    }`}
                  >
                    {hasCatalogPassword ? "Protected" : "Open Access"}
                  </span>
                </div>
                <form onSubmit={handleSetCatalogPassword} className="p-4 md:p-6 space-y-4 font-sans text-sm">
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Set a shared password sales staff must enter before viewing the catalogue at <span className="num-mono">/catalog</span>.
                    Leave unset for open access.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="catalogPassword" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {hasCatalogPassword ? "New Catalogue Password" : "Set Catalogue Password"}
                      </label>
                      <input
                        type="password"
                        id="catalogPassword"
                        value={catalogPassword}
                        onChange={(e) => setCatalogPassword(e.target.value)}
                        placeholder="Min 4 characters..."
                        className="w-full erp-input"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="confirmCatalogPassword" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        id="confirmCatalogPassword"
                        value={confirmCatalogPassword}
                        onChange={(e) => setConfirmCatalogPassword(e.target.value)}
                        placeholder="Re-enter password..."
                        className="w-full erp-input"
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex flex-wrap justify-end gap-2 border-t border-gray-200">
                    {hasCatalogPassword && (
                      <button
                        type="button"
                        onClick={handleDisableCatalogPassword}
                        disabled={savingCatalogPassword}
                        className="erp-btn erp-btn-secondary text-red-700 border-red-300 hover:bg-red-50 font-bold disabled:opacity-50"
                      >
                        Disable Protection
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={savingCatalogPassword}
                      className="erp-btn erp-btn-primary bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold disabled:opacity-50"
                    >
                      {hasCatalogPassword ? "Update Password" : "Set Password"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Security Credentials Card */}
              <div className="bg-white border border-gray-300 shadow-sm rounded-none animate-fade-in">
                <div className="bg-gray-50 border-b border-gray-300 px-4 py-2.5">
                  <span className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-brand-900" /> Administrative Security Settings
                  </span>
                </div>
                <form onSubmit={handleUpdateCredentials} className="p-4 md:p-6 space-y-4 font-sans text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="newUsername" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        New Operator ID / Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="newUsername"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="E.G., admin"
                        className="w-full erp-input"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="currPassword" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Current Password (Verify) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="currPassword"
                        value={currPassword}
                        onChange={(e) => setCurrPassword(e.target.value)}
                        placeholder="Verify identity..."
                        className="w-full erp-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label htmlFor="newPassword" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        New Console Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 4 characters..."
                        className="w-full erp-input"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="confirmNewPassword" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Confirm New Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="confirmNewPassword"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter password..."
                        className="w-full erp-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end border-t border-gray-200">
                    <button
                      type="submit"
                      className="erp-btn erp-btn-primary bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold"
                    >
                      Update Credentials
                    </button>
                  </div>
                </form>
              </div>

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
                  Upload Stock Export from Tally ERP (Excel/CSV)
                </h3>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    dragActive ? "border-brand-900 bg-brand-50/40" : "border-gray-300 bg-gray-50 hover:bg-gray-100/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,.xls,.xlsx"
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 text-gray-400 mb-2 animate-bounce" />
                  <p className="text-sm font-bold text-gray-700">
                    {csvFileName ? `File Selected: ${csvFileName}` : "Drag and drop your Tally Excel (.xls/.xlsx) or CSV here"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Automatically processes Particulars, Closing Balance Quantity (with units), and Rate as MRP.
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
                        className="erp-btn erp-btn-primary bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold py-1 text-xs disabled:opacity-50"
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
                      Valid updates: {parsedRows.filter(r => r.status === "Matched").length} Rows
                    </span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-300 px-2 py-0.5 rounded-none num-mono">
                      New products: {parsedRows.filter((r) => r.status === "Unrecognized").length} Rows
                    </span>
                    <span className="bg-gray-100 text-gray-400 border border-gray-300 px-2 py-0.5 rounded-none num-mono">
                      No Change: {parsedRows.filter((r) => r.status === "No change").length} Rows
                    </span>
                    <span className="bg-red-50 text-red-700 border border-red-300 px-2 py-0.5 rounded-none num-mono">
                      Malformed: {parsedRows.filter((r) => r.status === "Malformed").length} Rows
                    </span>
                  </div>

                  {/* Bulk Category Assignment Panel */}
                  <div className="bg-gray-50 border border-gray-250 p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        Bulk Category Assignment
                      </h4>
                      <p className="text-[10px] text-gray-550">
                        Select multiple products from the list below and assign them to a category at once.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-600 font-bold num-mono bg-white border border-gray-200 px-2 py-1">
                        {selectedRows.length} selected
                      </span>

                      {isCreatingBulkCategory ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newBulkCategoryName}
                            onChange={(e) => setNewBulkCategoryName(e.target.value)}
                            placeholder="New category name..."
                            className="text-xs border border-gray-300 px-2.5 py-1.5 rounded-none outline-none focus:border-brand-900 bg-white"
                          />
                          <button
                            onClick={() => {
                              const trimmed = newBulkCategoryName.trim();
                              if (!trimmed) {
                                showToast("error", "Category name cannot be empty.");
                                return;
                              }
                              handleBulkCategoryApply(trimmed);
                              setIsCreatingBulkCategory(false);
                              setNewBulkCategoryName("");
                            }}
                            className="erp-btn erp-btn-primary py-1.5 px-3 text-xs bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold"
                          >
                            Create & Apply
                          </button>
                          <button
                            onClick={() => setIsCreatingBulkCategory(false)}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={bulkCategory}
                            onChange={(e) => {
                              if (e.target.value === "__NEW__") {
                                setIsCreatingBulkCategory(true);
                              } else {
                                setBulkCategory(e.target.value);
                              }
                            }}
                            className="text-xs bg-white border border-gray-300 rounded-none px-2.5 py-1.5 text-gray-800 outline-none focus:border-brand-900"
                          >
                            {allCategories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="__NEW__" className="text-brand-900 font-bold">+ Create New Category...</option>
                          </select>
                          
                          <button
                            onClick={() => handleBulkCategoryApply(bulkCategory)}
                            disabled={selectedRows.length === 0}
                            className={`erp-btn py-1.5 px-3 text-xs font-bold uppercase transition-all ${
                              selectedRows.length === 0
                                ? "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-brand-900 border-brand-900 hover:bg-brand-800 text-white"
                            }`}
                          >
                            Apply to Selected
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto border border-gray-200">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th className="w-10 text-center">
                            <input
                              type="checkbox"
                              checked={parsedRows.length > 0 && selectedRows.length === parsedRows.length}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="rounded border-gray-300 text-brand-900 focus:ring-brand-900 cursor-pointer"
                            />
                          </th>
                          <th className="w-24">Item Code</th>
                          <th>Description</th>
                          <th className="w-32">Category</th>
                          <th className="w-20 text-right font-mono">Old Stock</th>
                          <th className="w-20 text-right font-mono">New Stock</th>
                          <th className="w-16 text-center font-mono">Diff</th>
                          <th className="w-28 text-right font-mono">Old MRP</th>
                          <th className="w-28 text-right font-mono">New MRP</th>
                          <th className="w-28">Row Status</th>
                          <th>Notes / Warnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((row, idx) => {
                          const isSelected = selectedRows.includes(idx);
                          let statusColor = "";
                          let diffColor = "text-gray-500";
                          let diffText = "0";

                          switch (row.status) {
                            case "Matched":
                              statusColor = "text-green-700 bg-green-50 border-green-200";
                              break;
                            case "Unrecognized":
                              statusColor = "text-blue-700 bg-blue-50 border-blue-200";
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
                            <tr key={idx} className={`${row.status === "Malformed" ? "bg-red-50/20" : ""} ${isSelected ? "bg-brand-50/30" : ""}`}>
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelectRow(idx)}
                                  className="rounded border-gray-300 text-brand-900 focus:ring-brand-900 cursor-pointer"
                                />
                              </td>
                              <td className="num-mono font-bold">{row.itemCode}</td>
                              <td className="font-semibold text-gray-800 truncate max-w-xs">{row.description}</td>
                              
                              {/* Inline Category Select Dropdown */}
                              <td>
                                <select
                                  value={row.category || BRANDING.defaultCategories[BRANDING.defaultCategories.length - 1]}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setParsedRows((prev) =>
                                      prev.map((r, rIdx) =>
                                        rIdx === idx ? { ...r, category: val } : r
                                      )
                                    );
                                  }}
                                  className="text-xs bg-white border border-gray-300 rounded px-1.5 py-1 text-gray-800 outline-none focus:border-brand-700"
                                >
                                  {allCategories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </td>

                              <td className="num-mono text-right text-gray-500">{row.currentStock}</td>
                              <td className="num-mono text-right font-bold text-gray-800">{row.newStock}</td>
                              <td className={`num-mono text-center ${diffColor}`}>{diffText}</td>
                              <td className="num-mono text-right text-gray-500">{formatCurrency(row.currentMrp || 0)}</td>
                              <td className="num-mono text-right font-bold text-gray-800">{formatCurrency(row.newMrp || 0)}</td>
                              <td>
                                <span className={`inline-block text-[10px] font-bold border px-1.5 py-0.5 rounded-none uppercase tracking-wide ${statusColor}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="text-xs text-gray-550 font-medium">
                                {row.status === "Malformed" && (
                                  <span className="text-red-600 flex items-center gap-1 font-bold">
                                    <AlertCircle className="h-3 w-3 shrink-0" /> {row.errorDetails}
                                  </span>
                                )}
                                {row.status === "Unrecognized" && (
                                  <span className="text-brand-700 flex items-center gap-1 font-bold">
                                    <CheckCircle2 className="h-3 w-3 shrink-0" /> Will add as new product in &quot;{row.category}&quot;.
                                  </span>
                                )}
                                {row.status === "Matched" && (
                                  <span className="text-green-600 flex items-center gap-1 font-bold">
                                    <CheckCircle2 className="h-3 w-3 shrink-0" /> Will update stock & MRP.
                                  </span>
                                )}
                                {row.status === "No change" && (
                                  <span className="text-gray-400">No updates required.</span>
                                )}
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
              <Database className="h-5 w-5 text-brand-900" />
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
                disabled={isSyncing}
                className="flex-1 erp-btn erp-btn-secondary text-xs uppercase disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitSync}
                disabled={isSyncing}
                className="flex-1 erp-btn erp-btn-primary bg-brand-900 border-brand-900 hover:bg-brand-800 text-white font-bold text-xs uppercase disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing...
                  </>
                ) : (
                  "Commit Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
