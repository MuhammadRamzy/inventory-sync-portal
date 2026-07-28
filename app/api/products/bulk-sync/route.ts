import { NextResponse } from "next/server";
import { bulkSyncProducts } from "@/lib/server/products";

export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    const updates = body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "updates array is required" }, { status: 400 });
    }

    const result = await bulkSyncProducts(updates);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to bulk sync products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
