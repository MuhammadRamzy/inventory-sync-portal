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

export const metadata: Metadata = {
  title: `${BRANDING.companyName} — B2B Catalog & Inventory`,
  description: `Sales catalog and admin inventory console for ${BRANDING.companyName}`,
  manifest: process.env.NEXT_PUBLIC_MANIFEST_PATH || "/manifest-demo.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: `${BRANDING.companyName} Sales`,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
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
