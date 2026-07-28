import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/cloudflare";
import { settings } from "@/lib/schema";

// Only used when no settings row exists yet in D1 (fresh install) — set your
// own via the Config Settings admin tab once deployed.
const DEFAULT_WHATSAPP = process.env.DEFAULT_WHATSAPP_NUMBER || "910000000000";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.select().from(settings).where(eq(settings.id, 1));
    const whatsappNumber = rows[0]?.whatsappNumber || DEFAULT_WHATSAPP;
    return NextResponse.json({ whatsappNumber });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body: any = await request.json();
    const whatsappNumber = String(body.whatsappNumber || "").replace(/[^0-9]/g, "");

    if (whatsappNumber.length < 10) {
      return NextResponse.json({ error: "A valid WhatsApp number is required." }, { status: 400 });
    }

    const db = await getDb();
    await db
      .insert(settings)
      .values({ id: 1, whatsappNumber })
      .onConflictDoUpdate({ target: settings.id, set: { whatsappNumber } });

    return NextResponse.json({ whatsappNumber });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
