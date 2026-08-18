import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";
import { getEnv } from "@/lib/env";

/**
 * Seeds the single demo user the whole MVP operates as (see lib/auth.ts).
 * Idempotent — safe to re-run. Run via `npm run db:seed`.
 */
async function main() {
  const { DEMO_USER_ID } = getEnv();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, DEMO_USER_ID))
    .limit(1);

  if (existing.length > 0) {
    console.log("Demo user already exists:", existing[0].email);
    process.exit(0);
  }

  const [user] = await db
    .insert(users)
    .values({
      id: DEMO_USER_ID,
      name: "Demo User",
      email: "demo@explainmydoc.app",
    })
    .returning();

  console.log("Seeded demo user:", user.email);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
