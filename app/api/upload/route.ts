import { NextResponse } from "next/server";
import { getImagesBucket } from "@/lib/cloudflare";
import { isAdminRequest } from "@/lib/server/auth";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — client already compresses images before upload

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A 'file' field is required." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image must be smaller than 8MB." }, { status: 400 });
    }

    const bucket = await getImagesBucket();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

    const bytes = await file.arrayBuffer();
    await bucket.put(key, bytes, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    return NextResponse.json({ key, url: `/api/images/${key}` });
  } catch (error) {
    console.error("Failed to upload image:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
