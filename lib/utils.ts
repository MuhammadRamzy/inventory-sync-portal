import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getStockStatus(count: number): "In Stock" | "Low Stock" | "Out of Stock" {
  if (count > 50) return "In Stock";
  if (count > 0) return "Low Stock";
  return "Out of Stock";
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function compressImage(file: File, maxWidth = 400, maxHeight = 400, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2d context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Using image/webp for better compression, fallback to jpeg if unsupported
        try {
          const dataUrl = canvas.toDataURL("image/webp", quality);
          resolve(dataUrl);
        } catch {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function parseTallyParticulars(particulars: string): { itemCode: string; description: string } {
  const trimmed = particulars.trim();
  // Regex to match code prefixes like "AR 107", "AT109", "PV-2103"
  const codeMatch = trimmed.match(/^([A-Z0-9-]{2,}\s+\d+|[A-Z0-9-]{3,})/);
  if (codeMatch) {
    const code = codeMatch[1].trim();
    const desc = trimmed.substring(codeMatch[0].length).trim();
    return {
      itemCode: code,
      description: desc || code
    };
  }
  
  // Fallback: extract first word in uppercase as code, full string as description
  const words = trimmed.split(/\s+/);
  const firstWord = words[0] || "PRODUCT";
  const cleanCode = firstWord.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return {
    itemCode: cleanCode || "PRODUCT",
    description: trimmed
  };
}
