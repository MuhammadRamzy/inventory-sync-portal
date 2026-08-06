import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/cloudflare";
import { settings } from "@/lib/schema";
import { sha256Hex } from "@/lib/server/hash";
import { setCatalogSessionCookie } from "@/lib/server/auth";

// Verifies a submitted catalog password against the admin-configured hash.
// Public endpoint — this is a basic access deterrent for the sales catalog,
// not a hardened auth system (matches the existing admin login's security
// tier: a shared password, no per-user accounts).
export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    const password = typeof body.password === "string" ? body.password : "";

    const db = await getDb();
    const [row] = await db.select().from(settings).where(eq(settings.id, 1));

    // No password configured — catalog is open, nothing to check.
    if (!row?.catalogPasswordHash) {
      return NextResponse.json({ success: true });
    }

    const submittedHash = await sha256Hex(password);
    if (submittedHash === row.catalogPasswordHash) {
      const response = NextResponse.json({ success: true });
      response.headers.set("Set-Cookie", setCatalogSessionCookie(submittedHash));
      return response;
    }

    return NextResponse.json({ success: false, error: "Incorrect password." }, { status: 401 });
  } catch (error) {
    console.error("Failed to verify catalog password:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
