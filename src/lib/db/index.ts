import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Single shared Postgres connection pool + Drizzle instance.
 * Cached on `globalThis` in dev to survive Next.js hot-reload without
 * exhausting Postgres connections.
 *
 * Built lazily (on first actual query, via the Proxy below) rather than at
 * module import time. Next's build-time "Collecting page data" step imports
 * every route module to statically analyze it, without necessarily having
 * runtime env vars available — calling `getEnv()` eagerly here made that
 * step throw and fail the build.
 */
const globalForDb = globalThis as unknown as {
  __explainmydoc_queryClient?: postgres.Sql;
  __explainmydoc_db?: PostgresJsDatabase<typeof schema>;
};

function getDb(): PostgresJsDatabase<typeof schema> {
  if (globalForDb.__explainmydoc_db) return globalForDb.__explainmydoc_db;

  const { DATABASE_URL } = getEnv();
  // `prepare: false` is required against poolers that don't support prepared
  // statements (e.g. Neon's pooled/pgbouncer connection string, PgBouncer in
  // transaction mode). Uncomment if you see prepared-statement errors when
  // pointed at a pooled DATABASE_URL in production.
  const queryClient =
    globalForDb.__explainmydoc_queryClient ??
    postgres(DATABASE_URL, { max: 10 /* , prepare: false */ });

  const instance = drizzle(queryClient, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__explainmydoc_queryClient = queryClient;
    globalForDb.__explainmydoc_db = instance;
  }

  return instance;
}

/** Proxy defers connection creation (and env validation) until `db` is first used. */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
