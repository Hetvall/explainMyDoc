import { defineConfig } from "drizzle-kit";

// Loaded via `tsx --env-file=.env.local` in the db:* npm scripts.
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://explainmydoc:explainmydoc@localhost:5434/explainmydoc";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: DATABASE_URL },
  verbose: true,
  strict: true,
});
