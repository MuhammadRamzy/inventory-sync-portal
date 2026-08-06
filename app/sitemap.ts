import type { MetadataRoute } from "next";
import { BRANDING } from "@/lib/branding";

// Only the public landing page is listed — /catalog sits behind a password
// gate and /admin is a private console, so neither should be crawled or
// indexed (see their own layout.tsx robots overrides).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BRANDING.siteUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
