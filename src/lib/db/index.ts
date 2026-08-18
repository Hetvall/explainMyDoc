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
  return postgres(DATABASE_URL, { max: 10 });
}

const queryClient =
  globalForDb.__explainmydoc_queryClient ?? createQueryClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__explainmydoc_queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
