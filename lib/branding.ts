// Central place for the demo/company identity shown across the app.
// Every value here has a generic default (safe to publish), and can be
// overridden per-deployment via environment variables in `.env` — see
// `.env.example`. Because these are read from client components, the
// NEXT_PUBLIC_ prefix is required for Next.js to inline them into the
// browser bundle at build time.
//
// The logo image (public/logo.png) and PWA manifests (public/manifest*.json)
// are static assets and aren't templated here — swap them directly for your
// own deployment.
export const BRANDING = {
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || "Acme Distributors",
  logoSrc: process.env.NEXT_PUBLIC_LOGO_SRC || "/logo-demo.png",
  tagline:
    process.env.NEXT_PUBLIC_TAGLINE ||
    "Browse our wholesale catalog, check real-time stock levels, and build custom quotations for WhatsApp sharing.",
  regionLabel: process.env.NEXT_PUBLIC_REGION_LABEL || "Regional Operations",
  adminDisplayName: process.env.NEXT_PUBLIC_ADMIN_DISPLAY_NAME || "Admin User",
  adminRole: process.env.NEXT_PUBLIC_ADMIN_ROLE || "Administrator",
  defaultCategories: (
    process.env.NEXT_PUBLIC_DEFAULT_CATEGORIES || "Electronics,Apparel,Hardware,Home Goods"
  )
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
  // Optional "made by" footer credit — blank by default, so nothing renders
  // unless a deployment explicitly opts in.
  poweredByLabel: process.env.NEXT_PUBLIC_POWERED_BY_LABEL || "",
  poweredByUrl: process.env.NEXT_PUBLIC_POWERED_BY_URL || "",
} as const;
