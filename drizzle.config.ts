import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  // Only used by `drizzle-kit studio`/`push` to talk to D1 directly over
  // Cloudflare's HTTP API. Actual migrations are applied via
  // `wrangler d1 migrations apply` (see package.json db:migrate:* scripts),
  // which is the Cloudflare-recommended path and works against local + remote.
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.D1_DATABASE_ID!,
    token: process.env.D1_API_TOKEN!,
  },
} satisfies Config;
