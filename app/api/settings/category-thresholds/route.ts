import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/cloudflare";
import { settings } from "@/lib/schema";
import { isAdminRequest } from "@/lib/server/auth";

type CategoryThresholds = Record<string, { lowStockThreshold: number; inStockMinQty: number }>;

function parseStoredThresholds(raw: string | null | undefined): CategoryThresholds {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse stored categoryThresholds JSON:", error);
    return {};
  }
}

// Per-category overrides for the low/in-stock cutoffs; any category not
// present here falls back to the global thresholds in /api/settings.
export async function GET() {
  try {
    const db = await getDb();
    const [row] = await db.select().from(settings).where(eq(settings.id, 1));
    return NextResponse.json({ categoryThresholds: parseStoredThresholds(row?.categoryThresholds) });
  } catch (error) {
    console.error("Failed to fetch category thresholds:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Replaces the full category-threshold map. Send `{}` to clear all
// overrides (every category then falls back to the global thresholds).
export async function PUT(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: any = await request.json();
    const input = body?.categoryThresholds;
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json({ error: "categoryThresholds must be an object keyed by category." }, { status: 400 });
    }

    const cleaned: CategoryThresholds = {};
    for (const [category, value] of Object.entries(input)) {
      const name = category.trim();
      if (!name) continue;
      const lowStockThreshold = Number((value as any)?.lowStockThreshold);
      const inStockMinQty = Number((value as any)?.inStockMinQty);
      if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
        return NextResponse.json(
          { error: `Low stock quantity for "${name}" must be a non-negative integer.` },
          { status: 400 }
        );
      }
      if (!Number.isInteger(inStockMinQty) || inStockMinQty < 1) {
        return NextResponse.json(
          { error: `In stock quantity for "${name}" must be a positive integer.` },
          { status: 400 }
        );
      }
      if (inStockMinQty <= lowStockThreshold) {
        return NextResponse.json(
          { error: `In stock quantity for "${name}" must be greater than its low stock quantity.` },
          { status: 400 }
        );
      }
      cleaned[name] = { lowStockThreshold, inStockMinQty };
    }

    const db = await getDb();
    const [existing] = await db.select().from(settings).where(eq(settings.id, 1));
    const categoryThresholds = Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
    await db
      .insert(settings)
      .values({
        id: 1,
        whatsappNumber: existing?.whatsappNumber || process.env.DEFAULT_WHATSAPP_NUMBER || "910000000000",
        categoryThresholds,
      })
      .onConflictDoUpdate({ target: settings.id, set: { categoryThresholds } });

    return NextResponse.json({ categoryThresholds: cleaned });
  } catch (error) {
    console.error("Failed to save category thresholds:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
