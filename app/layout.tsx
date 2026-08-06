import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import { BRANDING } from "@/lib/branding";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full select-none">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full text-slate-800 bg-slate-50/50`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
