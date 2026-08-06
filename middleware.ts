import { NextRequest, NextResponse } from "next/server";

// Lets the admin console live on its own subdomain (e.g.
// admin.example.com) while staying the same Next.js app/worker as the public
// site + sales catalog — no separate deployment needed. Unset by default, so
// this is a no-op until a real ADMIN_HOST is configured for a deployment.
const ADMIN_HOST = process.env.ADMIN_HOST || "";

export function middleware(request: NextRequest) {
  if (!ADMIN_HOST) return NextResponse.next();

  const host = request.headers.get("host") || "";
  const isAdminHost = host === ADMIN_HOST || host.startsWith(`${ADMIN_HOST}:`);
  if (!isAdminHost) return NextResponse.next();

  const { pathname } = request.nextUrl;
  // Static assets (manifest.json, icons, sw.js, favicon.ico...) are served
  // from the same public root regardless of host — only rewrite page routes.
  const isAsset = pathname.includes(".") || pathname.startsWith("/api") || pathname.startsWith("/_next");
  if (isAsset || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
