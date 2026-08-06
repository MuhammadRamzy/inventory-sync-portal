import type { MetadataRoute } from "next";
import { BRANDING } from "@/lib/branding";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/catalog", "/admin"],
      },
    ],
    sitemap: `${BRANDING.siteUrl}/sitemap.xml`,
  };
}
