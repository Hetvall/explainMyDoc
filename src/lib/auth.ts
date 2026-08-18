import { getEnv } from "@/lib/env";

/**
 * MVP "auth": every request acts as the single seeded demo user
 * (see lib/db/seed.ts). Deliberately isolated behind this one function so
 * real authentication (session/JWT-based) can replace it later without
 * touching call sites — every server action/route already calls this
 * instead of trusting a client-supplied user id.
 */
export function getCurrentUserId(): string {
  return getEnv().DEMO_USER_ID;
}
