import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/cloudflare";
import { settings } from "@/lib/schema";
import { sha256Hex } from "@/lib/server/hash";
import {
  isAdminRequest,
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from "@/lib/server/auth";

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD_HASH =
  "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

// Session check — the admin console calls this on load to decide whether to
// show the dashboard or the login screen (the session cookie itself is
// HttpOnly, so client JS can't just read it directly).
export async function GET(request: Request) {
  const authenticated = await isAdminRequest(request);
  if (!authenticated) {
    return NextResponse.json({ authenticated: false });
  }
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return NextResponse.json({ authenticated: true, username: row?.adminUsername || DEFAULT_ADMIN_USERNAME });
}

// Login — verifies credentials server-side (previously this was a
// client-only check against a hash sitting in localStorage, which meant
// every mutating admin API route was reachable by anyone who knew the URL,
// login screen or not).
export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const db = await getDb();
    const [row] = await db.select().from(settings).where(eq(settings.id, 1));
    const storedUsername = row?.adminUsername || DEFAULT_ADMIN_USERNAME;
    const storedHash = row?.adminPasswordHash || DEFAULT_ADMIN_PASSWORD_HASH;

    const submittedHash = await sha256Hex(password);
    if (username.toLowerCase() !== storedUsername.toLowerCase() || submittedHash !== storedHash) {
      return NextResponse.json({ success: false, error: "Invalid Operator ID or Password credentials." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", setAdminSessionCookie(storedHash));
    return response;
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Update credentials — requires an existing valid admin session AND the
// current password (defense in depth: a stolen session cookie alone can't
// silently take over the account without also knowing the current password).
export async function PUT(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: any = await request.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newUsername = typeof body.newUsername === "string" ? body.newUsername.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!newUsername) {
      return NextResponse.json({ error: "Username cannot be empty." }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: "New password must be at least 4 characters." }, { status: 400 });
    }

    const db = await getDb();
    const [row] = await db.select().from(settings).where(eq(settings.id, 1));
    const storedHash = row?.adminPasswordHash || DEFAULT_ADMIN_PASSWORD_HASH;

    const currentHash = await sha256Hex(currentPassword);
    if (currentHash !== storedHash) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const newHash = await sha256Hex(newPassword);
    await db
      .insert(settings)
      .values({
        id: 1,
        whatsappNumber: row?.whatsappNumber || process.env.DEFAULT_WHATSAPP_NUMBER || "910000000000",
        adminUsername: newUsername,
        adminPasswordHash: newHash,
      })
      .onConflictDoUpdate({ target: settings.id, set: { adminUsername: newUsername, adminPasswordHash: newHash } });

    const response = NextResponse.json({ success: true });
    // Refresh the cookie to the new hash so this session doesn't get logged
    // out by its own password change.
    response.headers.set("Set-Cookie", setAdminSessionCookie(newHash));
    return response;
  } catch (error) {
    console.error("Failed to update admin credentials:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearAdminSessionCookie());
  return response;
}
