import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Cloudflare Hyperdrive provides a Postgres connection string
// Ensure DATABASE_URL is set to the Hyperdrive connection string in production
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL (Hyperdrive Connection String) is missing.");
}

// Hyperdrive requires 'prepare: false' for some connection poolers, 
// though standard postgres.js works well out of the box with it.
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
