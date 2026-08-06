// Content-Security-Policy: 'unsafe-inline' on script-src is needed for
// Next.js App Router's hydration/streaming inline scripts (no nonce
// infrastructure wired up here); everything else is scoped as tightly as
// the app's actual dependencies (Google Fonts CSS, the Maps embed iframe on
// the landing page, R2-served product images) allow.
// 'unsafe-eval' is only needed for Next's dev-mode HMR/React Refresh runtime
// — production bundles don't eval, so keep it out of the deployed CSP.
const scriptSrc = process.env.NODE_ENV === "development" ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  // "data:" is required here (not just in img-src) because the image-upload
  // flow does `fetch(dataUrl)` client-side to turn a compressed base64 data
  // URL into a Blob before uploading (see dataUrlToBlob in lib/utils.ts) —
  // that fetch call is itself subject to connect-src, and without this the
  // browser blocks it, breaking all product image uploads.
  "connect-src 'self' data:",
  "frame-src 'self' https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    // Next's built-in optimizer needs sharp (Node-only) and doesn't run on the
    // Workers runtime; images are served as-is (product images are already
    // client-side compressed before upload, see lib/utils.ts compressImage).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: process.env.R2_PUBLIC_DOMAIN || 'images.example.com',
      }
    ]
  }
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
