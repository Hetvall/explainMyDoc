import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Single shared Postgres connection pool + Drizzle instance.
 * Cached on `globalThis` in dev to survive Next.js hot-reload without
 * exhausting Postgres connections.
 */
const globalForDb = globalThis as unknown as {
  __explainmydoc_queryClient?: postgres.Sql;
};

function createQueryClient() {
  const { DATABASE_URL } = getEnv();
  // `prepare: false` is required against poolers that don't support prepared
  // statements (e.g. Neon's pooled/pgbouncer connection string, PgBouncer in
  // transaction mode). Uncomment if you see prepared-statement errors when
  // pointed at a pooled DATABASE_URL in production.
  return postgres(DATABASE_URL, { max: 10 /* , prepare: false */ });
}

const queryClient =
  globalForDb.__explainmydoc_queryClient ?? createQueryClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__explainmydoc_queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
