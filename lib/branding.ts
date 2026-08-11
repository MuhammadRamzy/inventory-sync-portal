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
  // Square mark (favicon / apple-touch-icon / PWA icon), distinct from the
  // wide wordmark logo above.
  iconSrc: process.env.NEXT_PUBLIC_ICON_SRC || "/icon-demo.png",
  themeColor: process.env.NEXT_PUBLIC_THEME_COLOR || "#0f172a",
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

  // ── Public landing page content (app/page.tsx) ──────────────────────────
  aboutText:
    process.env.NEXT_PUBLIC_ABOUT_TEXT ||
    "Welcome to our showroom, where quality meets service in the world of wholesale distribution. " +
      "We are a trusted B2B supplier serving retailers and contractors, offering a carefully curated " +
      "product catalog backed by real-time stock visibility and a dedicated sales team. Whether you " +
      "need a single sample or a bulk order, our knowledgeable staff are ready to help you find the " +
      "right products for your business.",
  // Shorter version shown on the landing page itself (which pairs it with a
  // pull-quote + highlight cards, so it doesn't need the full story) — the
  // full aboutText is reserved for contexts that want the complete version.
  // Falls back to aboutText if unset.
  aboutTextShort: process.env.NEXT_PUBLIC_ABOUT_TEXT_SHORT || "",
  // Optional — powers the "X+ Years" stat on the landing page. Left unset,
  // that stat just doesn't render (rather than showing a made-up number).
  foundedYear: process.env.NEXT_PUBLIC_FOUNDED_YEAR ? Number(process.env.NEXT_PUBLIC_FOUNDED_YEAR) : null,
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  addressLine: process.env.NEXT_PUBLIC_ADDRESS_LINE || "",
  mapUrl: process.env.NEXT_PUBLIC_MAP_URL || "",
  // Google's numeric place ID (resolved from the mapUrl share link) — lets
  // the embedded map pin the exact verified business location instead of a
  // generic text search against addressLine. Falls back to a text search
  // when unset.
  mapEmbedCid: process.env.NEXT_PUBLIC_MAP_EMBED_CID || "",
  serviceAreaText: process.env.NEXT_PUBLIC_SERVICE_AREA_TEXT || "",
  productSeries: (process.env.NEXT_PUBLIC_PRODUCT_SERIES || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
  productTypes: (process.env.NEXT_PUBLIC_PRODUCT_TYPES || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
  metaDescription:
    process.env.NEXT_PUBLIC_META_DESCRIPTION ||
    "Browse our wholesale product catalog, check live stock availability, and request a quotation online.",
  metaKeywords: (process.env.NEXT_PUBLIC_META_KEYWORDS || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),

  // ── SEO / structured data (LocalBusiness JSON-LD in app/page.tsx) ────────
  // Schema.org LocalBusiness subtype — e.g. "Store", "HardwareStore".
  businessType: process.env.NEXT_PUBLIC_BUSINESS_TYPE || "Store",
  // Alternate brand spellings/short names — helps Google tie bare-brand
  // searches (e.g. just "Wetta") to this entity via schema `alternateName`.
  alternateNames: (process.env.NEXT_PUBLIC_ALTERNATE_NAMES || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
  // Structured postal-address parts. When set they build a precise
  // schema.org PostalAddress; unset, the code falls back to addressLine.
  streetAddress: process.env.NEXT_PUBLIC_STREET_ADDRESS || "",
  addressLocality: process.env.NEXT_PUBLIC_ADDRESS_LOCALITY || "",
  addressRegion: process.env.NEXT_PUBLIC_ADDRESS_REGION || "",
  postalCode: process.env.NEXT_PUBLIC_POSTAL_CODE || "",
  addressCountry: process.env.NEXT_PUBLIC_ADDRESS_COUNTRY || "IN",
  // Exact coordinates (from your Google Business Profile). Left unset, the
  // GeoCoordinates node is simply omitted rather than guessed.
  geoLat: process.env.NEXT_PUBLIC_GEO_LAT || "",
  geoLng: process.env.NEXT_PUBLIC_GEO_LNG || "",
  // Cities/areas served — powers areaServed for location-intent searches.
  areasServed: (process.env.NEXT_PUBLIC_AREAS_SERVED || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
  // Opening hours in schema.org text form, e.g. "Mo-Sa 09:00-19:00".
  openingHours: (process.env.NEXT_PUBLIC_OPENING_HOURS || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
  priceRange: process.env.NEXT_PUBLIC_PRICE_RANGE || "",
  // Social/other canonical profile URLs for schema `sameAs`.
  socialLinks: (process.env.NEXT_PUBLIC_SOCIAL_LINKS || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean),
  // Open Graph / Twitter share image (falls back to the logo if unset).
  ogImage: process.env.NEXT_PUBLIC_OG_IMAGE || "",
  // Optional Google Search Console HTML-tag verification token.
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",

  // Server-only (no NEXT_PUBLIC_ prefix — not inlined into client bundles).
  // Only read this from server components/metadata exports, never from
  // client ("use client") components.
  siteUrl: process.env.SITE_URL || "https://example.com",
} as const;
