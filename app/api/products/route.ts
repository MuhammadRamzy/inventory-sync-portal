import { NextResponse } from "next/server";
import { listProducts, createProduct, updateProduct, deleteProduct } from "@/lib/server/products";
import { isAdminRequest, isCatalogRequestAuthorized } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    if (!(await isCatalogRequestAuthorized(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await listProducts();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: any = await request.json();

    if (!body.itemCode || !String(body.itemCode).trim()) {
      return NextResponse.json({ error: "itemCode is required." }, { status: 400 });
    }
    if (!body.description || !String(body.description).trim()) {
      return NextResponse.json({ error: "description is required." }, { status: 400 });
    }
    if (!body.category) {
      return NextResponse.json({ error: "category is required." }, { status: 400 });
    }

    const mrp = Number(body.mrp);
    const stockCount = Number(body.stockCount);

    if (!Number.isFinite(mrp) || mrp <= 0) {
      return NextResponse.json({ error: "mrp must be a positive number." }, { status: 400 });
    }
    if (!Number.isInteger(stockCount) || stockCount < 0) {
      return NextResponse.json({ error: "stockCount must be a non-negative integer." }, { status: 400 });
    }

    const result = await createProduct({
      itemCode: String(body.itemCode),
      description: String(body.description),
      category: String(body.category),
      mrp,
      stockCount,
      image: body.image ? String(body.image) : undefined,
      posterImage: body.posterImage ? String(body.posterImage) : undefined,
      details: body.details !== undefined ? String(body.details) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json(result.product);
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: any = await request.json();
    const { itemCode, ...updates } = body;

    if (!itemCode) {
      return NextResponse.json({ error: "itemCode is required" }, { status: 400 });
    }
    if (
      updates.stockCount !== undefined &&
      (!Number.isInteger(updates.stockCount) || updates.stockCount < 0)
    ) {
      return NextResponse.json({ error: "stockCount must be a non-negative integer." }, { status: 400 });
    }
    if (
      updates.mrp !== undefined &&
      (!Number.isFinite(updates.mrp) || updates.mrp <= 0)
    ) {
      return NextResponse.json({ error: "mrp must be a positive number." }, { status: 400 });
    }

    const result = await updateProduct(itemCode, updates);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result.product);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get("itemCode");
    if (!itemCode) {
      return NextResponse.json({ error: "itemCode query param is required" }, { status: 400 });
    }

    const result = await deleteProduct(itemCode);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
