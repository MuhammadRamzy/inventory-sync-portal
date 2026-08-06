import { NextResponse } from "next/server";
import { bulkSyncProducts } from "@/lib/server/products";
import { isAdminRequest } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: any = await request.json();
    const updates = body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "updates array is required" }, { status: 400 });
    }

    // The admin UI's CSV/Excel importer already filters out malformed rows
    // client-side, but the server shouldn't trust that — a bad row here
    // would otherwise write NaN/garbage straight into D1 with no error.
    for (const [i, update] of updates.entries()) {
      if (!update || typeof update !== "object") {
        return NextResponse.json({ error: `Row ${i + 1}: must be an object.` }, { status: 400 });
      }
      if (!update.itemCode || !String(update.itemCode).trim()) {
        return NextResponse.json({ error: `Row ${i + 1}: itemCode is required.` }, { status: 400 });
      }
      if (!update.description || !String(update.description).trim()) {
        return NextResponse.json({ error: `Row ${i + 1}: description is required.` }, { status: 400 });
      }
      if (!Number.isFinite(Number(update.mrp)) || Number(update.mrp) <= 0) {
        return NextResponse.json({ error: `Row ${i + 1}: mrp must be a positive number.` }, { status: 400 });
      }
      if (!Number.isInteger(Number(update.stockCount)) || Number(update.stockCount) < 0) {
        return NextResponse.json({ error: `Row ${i + 1}: stockCount must be a non-negative integer.` }, { status: 400 });
      }
      if (!update.category || !String(update.category).trim()) {
        return NextResponse.json({ error: `Row ${i + 1}: category is required.` }, { status: 400 });
      }
    }

    const result = await bulkSyncProducts(
      updates.map((u: any) => ({
        itemCode: String(u.itemCode),
        description: String(u.description),
        stockCount: Number(u.stockCount),
        mrp: Number(u.mrp),
        category: String(u.category),
      }))
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to bulk sync products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
