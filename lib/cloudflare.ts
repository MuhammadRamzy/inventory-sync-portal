import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Cloudflare bindings (D1 + R2) are only reachable through the request-scoped
// worker env — there is no persistent client to hold onto like a Postgres
// connection pool, so every caller fetches the context fresh.
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}

export async function getImagesBucket() {
  const { env } = await getCloudflareContext({ async: true });
  return env.IMAGES_BUCKET;
}
