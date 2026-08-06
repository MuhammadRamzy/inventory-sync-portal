import type { Metadata } from "next";
import { BRANDING } from "@/lib/branding";

// Overrides the root layout's manifest so the sales catalog can be "Added to
// Home Screen" as its own PWA, distinct from the admin console's. Also kept
// out of search results — it sits behind a password gate and isn't meant to
// be publicly indexed.
export const metadata: Metadata = {
  title: `${BRANDING.companyName} — Sales Catalogue`,
  manifest: process.env.NEXT_PUBLIC_MANIFEST_PATH || "/manifest-demo.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: `${BRANDING.companyName} Sales`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
