import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/cloudflare";
import { settings } from "@/lib/schema";
import { isAdminRequest } from "@/lib/server/auth";

// Only used when no settings row exists yet in D1 (fresh install) — set your
// own via the Config Settings admin tab once deployed.
const DEFAULT_WHATSAPP = process.env.DEFAULT_WHATSAPP_NUMBER || "910000000000";
const DEFAULT_LOW_STOCK_THRESHOLD = 50;
const DEFAULT_IN_STOCK_MIN_QTY = 51;

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(settings).where(eq(settings.id, 1));
    const row = rows[0];
    return NextResponse.json({
      whatsappNumber: row?.whatsappNumber || DEFAULT_WHATSAPP,
      lowStockThreshold: row?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
      inStockMinQty: row?.inStockMinQty ?? DEFAULT_IN_STOCK_MIN_QTY,
      // Never expose the hash itself — only whether a password is set.
      hasCatalogPassword: !!row?.catalogPasswordHash,
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: any = await request.json();
    const whatsappNumber = String(body.whatsappNumber || "").replace(/[^0-9]/g, "");

    if (whatsappNumber.length < 10) {
      return NextResponse.json({ error: "A valid WhatsApp number is required." }, { status: 400 });
    }

    let lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD;
    if (body.lowStockThreshold !== undefined) {
      const parsed = Number(body.lowStockThreshold);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return NextResponse.json({ error: "Low stock quantity must be a non-negative integer." }, { status: 400 });
      }
      lowStockThreshold = parsed;
    }

    let inStockMinQty = DEFAULT_IN_STOCK_MIN_QTY;
    if (body.inStockMinQty !== undefined) {
      const parsed = Number(body.inStockMinQty);
      if (!Number.isInteger(parsed) || parsed < 1) {
        return NextResponse.json({ error: "In stock quantity must be a positive integer." }, { status: 400 });
      }
      inStockMinQty = parsed;
    }
    if (inStockMinQty <= lowStockThreshold) {
      return NextResponse.json(
        { error: "In stock quantity must be greater than the low stock quantity." },
        { status: 400 }
      );
    }

    const db = await getDb();
    await db
      .insert(settings)
      .values({ id: 1, whatsappNumber, lowStockThreshold, inStockMinQty })
      .onConflictDoUpdate({ target: settings.id, set: { whatsappNumber, lowStockThreshold, inStockMinQty } });

    return NextResponse.json({ whatsappNumber, lowStockThreshold, inStockMinQty });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
