import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Assigns every visitor an anonymous identity cookie on first touch, so
 * each browser gets its own private space (documents, chats, quizzes...)
 * instead of everyone sharing the single seeded demo user. Read back in
 * `lib/auth.ts`. Pure cookie-issuing here — no DB access; the corresponding
 * `users` row is created lazily on first document upload (see
 * `lib/db/queries.ts#ensureUser`).
 */
const UID_COOKIE = "uid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function proxy(request: NextRequest) {
  if (request.cookies.has(UID_COOKIE)) {
    return NextResponse.next();
  }

  const uid = crypto.randomUUID();

  // Mutate the incoming request's cookie jar too, so this same request's
  // render/route already sees the id — not just the next one.
  request.cookies.set(UID_COOKIE, uid);

  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.cookies.set(UID_COOKIE, uid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
