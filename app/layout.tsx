import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import { BRANDING } from "@/lib/branding";

// Self-hosted via next/font (woff2, subsetted, no render-blocking external
// request or Google preconnect). Exposes `--font-sans`, which globals.css
// already consumes for `body`. Plus Jakarta Sans is the only family the UI
// actually renders — the previous Geist (loaded but referenced by a
// non-matching CSS var, so never applied) and Outfit (loaded, never used)
// families were dead weight and have been removed.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

// Generic fallback only — the public landing page ("/") sets its own full
// SEO metadata, and /catalog + /admin each override this with their own PWA
// manifest via their own layout.tsx. This root export just covers the gap
// if a route segment forgets to set its own <title>.
export const metadata: Metadata = {
  title: `${BRANDING.companyName} — B2B Catalog & Inventory`,
  description: `Sales catalog and admin inventory console for ${BRANDING.companyName}`,
  // app/favicon.ico (file-convention) is auto-detected by Next for the
  // regular <link rel="icon">; this just adds the iOS home-screen icon,
  // which Safari doesn't reliably pick up from the PWA manifest alone.
  icons: {
    apple: BRANDING.iconSrc,
  },
};

export const viewport: Viewport = {
  themeColor: BRANDING.themeColor,
  width: "device-width",
  initialScale: 1,
  // Deliberately no maximumScale/userScalable lock: disabling pinch-zoom is a
  // WCAG 1.4.4 (Resize Text) failure and a Google mobile-usability signal.
  // Users must be able to zoom.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className={`h-full select-none ${plusJakarta.variable}`}>
      <body className="antialiased h-full text-slate-800 bg-slate-50/50">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
