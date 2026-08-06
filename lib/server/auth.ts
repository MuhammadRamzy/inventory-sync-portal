import { eq } from "drizzle-orm";
import { getDb } from "@/lib/cloudflare";
import { settings } from "@/lib/schema";

const ADMIN_COOKIE = "admin_session";
const CATALOG_COOKIE = "catalog_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Bearer-cookie sessions: the cookie value IS the current password hash, and
// a request is authorized iff it matches what's presently stored in D1. This
// needs no separate session store/expiry bookkeeping, and rotating a
// password immediately invalidates every existing session for it — a good
// fit for this app's single-shared-credential model (see lib/server/hash.ts,
// same tier as the catalog password gate).

function parseCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookieHeader(name: string, value: string, maxAge = MAX_AGE_SECONDS): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearCookieHeader(name: string): string {
  return `${name}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function setAdminSessionCookie(hash: string): string {
  return sessionCookieHeader(ADMIN_COOKIE, hash);
}

export function setCatalogSessionCookie(hash: string): string {
  return sessionCookieHeader(CATALOG_COOKIE, hash);
}

export function clearAdminSessionCookie(): string {
  return clearCookieHeader(ADMIN_COOKIE);
}

export function clearCatalogSessionCookie(): string {
  return clearCookieHeader(CATALOG_COOKIE);
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  const cookie = parseCookie(request, ADMIN_COOKIE);
  if (!cookie) return false;

  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  const currentHash = row?.adminPasswordHash;
  return !!currentHash && cookie === currentHash;
}

// Catalog data is only gated when the admin has actually set a password —
// otherwise the catalog is intentionally open, matching /api/catalog-auth's
// existing "no password configured" behavior.
export async function isCatalogRequestAuthorized(request: Request): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (!row?.catalogPasswordHash) return true;

  const catalogCookie = parseCookie(request, CATALOG_COOKIE);
  if (catalogCookie && catalogCookie === row.catalogPasswordHash) return true;

  // An authenticated admin can always browse the catalog too.
  const adminCookie = parseCookie(request, ADMIN_COOKIE);
  return !!adminCookie && adminCookie === row.adminPasswordHash;
}
