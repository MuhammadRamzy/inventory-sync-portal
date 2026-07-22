import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { products } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allProducts = await db.select().from(products);
    return NextResponse.json(allProducts);
  } catch (error) {
    console.error("Failed to fetch products from Hyperdrive:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newProduct = await db.insert(products).values({
      ...body,
      lastUpdated: new Date(),
    }).returning();
    return NextResponse.json(newProduct[0]);
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { itemCode, ...updates } = body;

    if (!itemCode) {
      return NextResponse.json({ error: "itemCode is required" }, { status: 400 });
    }

    const updatedProduct = await db
      .update(products)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(products.itemCode, itemCode))
      .returning();

    return NextResponse.json(updatedProduct[0]);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
