import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

/**
 * "Auth" for the MVP: every visitor gets an anonymous identity via the
 * `uid` cookie issued in `src/proxy.ts` on first touch, so each browser has
 * its own private space instead of everyone sharing one account. The
 * corresponding `users` row is created lazily on first upload (see
 * `lib/db/queries.ts#ensureUser`). Deliberately isolated behind this one
 * function so real authentication (session/JWT-based) can replace it later
 * without touching call sites — every server action/route already calls
 * this instead of trusting a client-supplied user id.
 */
export async function getCurrentUserId(): Promise<string> {
  const cookieStore = await cookies();
  const uid = cookieStore.get("uid")?.value;
  // Fallback for the rare context that bypasses proxy.ts (e.g. it not
  // running for some reason) — keeps the app usable rather than erroring.
  return uid ?? getEnv().DEMO_USER_ID;
}
