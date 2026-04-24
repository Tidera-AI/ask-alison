import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "ask-alison-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function generateSessionId(): string {
  return randomUUID();
}

export async function getOrCreateSessionUserId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME);

  if (existing?.value) {
    return existing.value;
  }

  const userId = generateSessionId();

  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    // In local dev we typically run over http, so `secure: true` would prevent
    // the cookie from being set and we'd generate a new user id on every request.
    secure: process.env.NODE_ENV === "production",
    // This is a first-party cookie used for anonymous sessions; `lax` is the
    // safest default and avoids Safari/localhost issues with SameSite=None.
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return userId;
}
