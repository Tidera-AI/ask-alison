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
    secure: true,
    sameSite: "none",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return userId;
}
