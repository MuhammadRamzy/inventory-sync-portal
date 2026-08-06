import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/cloudflare";
import { settings } from "@/lib/schema";
import { sha256Hex } from "@/lib/server/hash";
import { isAdminRequest } from "@/lib/server/auth";

// Sets or clears the shared catalog password; an empty/omitted password
// disables the gate entirely.
export async function PUT(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: any = await request.json();
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (password && password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters, or left blank to disable the gate." }, { status: 400 });
    }

    const catalogPasswordHash = password ? await sha256Hex(password) : null;

    const db = await getDb();
    const [existing] = await db.select().from(settings).where(eq(settings.id, 1));
    await db
      .insert(settings)
      .values({
        id: 1,
        whatsappNumber: existing?.whatsappNumber || process.env.DEFAULT_WHATSAPP_NUMBER || "910000000000",
        catalogPasswordHash,
      })
      .onConflictDoUpdate({ target: settings.id, set: { catalogPasswordHash } });

    return NextResponse.json({ hasCatalogPassword: !!catalogPasswordHash });
  } catch (error) {
    console.error("Failed to update catalog password:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
