import type { Metadata } from "next";
import { BRANDING } from "@/lib/branding";

// Overrides the root layout's manifest for everything under /admin, so the
// admin console can be "Added to Home Screen" as its own separate PWA
// (distinct name/icon/start_url) from the sales catalog at "/".
export const metadata: Metadata = {
  title: `${BRANDING.companyName} — Admin Console`,
  manifest: process.env.NEXT_PUBLIC_ADMIN_MANIFEST_PATH || "/manifest-admin-demo.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: `${BRANDING.companyName} Admin`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
