import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

// Reuse the pool during Next.js development hot reloads.
const globalForDb = globalThis as typeof globalThis & {
  neonPool?: Pool;
};

const pool =
  globalForDb.neonPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.neonPool = pool;
}

export const db = drizzle({
  client: pool,
  schema,
});