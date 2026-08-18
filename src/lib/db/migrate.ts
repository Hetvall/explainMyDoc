import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Runs pending migrations. Ensures the `vector` extension exists first,
 * since the generated SQL references the `vector` column type.
 *
 * Run via `npm run db:migrate` (loads .env.local through `tsx --env-file`).
 */
async function main() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://explainmydoc:explainmydoc@localhost:5434/explainmydoc";

  const sql = postgres(connectionString, { max: 1 });

  console.log("Ensuring pgvector extension...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  const db = drizzle(sql);
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");

  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
