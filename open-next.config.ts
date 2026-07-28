// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// This app has no ISR/SSG routes (everything is client-rendered or a plain
// API route), so the default in-memory cache is enough — no R2 bucket
// needed just for build caching.
export default defineCloudflareConfig();
