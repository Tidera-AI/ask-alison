import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getUserById } from "@/lib/db/queries";

export const SESSION_COOKIE_NAME = "ask-alison-session";
export const PERSISTENT_COOKIE_NAME = "ask-alison-user";
const PERSISTENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const cookieBase = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/",
};

export function generateSessionId(): string {
  return randomUUID();
}

async function resolveVerifiedPersistentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const persistent = cookieStore.get(PERSISTENT_COOKIE_NAME);

  if (!persistent?.value) {
    return null;
  }

  const user = await getUserById(persistent.value);
  if (user?.email) {
    return user.id;
  }

  return null;
}

export async function getOrCreateSessionUserId(): Promise<string> {
  const verifiedPersistentUserId = await resolveVerifiedPersistentUserId();
  if (verifiedPersistentUserId) {
    return verifiedPersistentUserId;
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME);

  if (existing?.value) {
    return existing.value;
  }

  const userId = generateSessionId();

  // Session cookie: no maxAge — cleared when the browser closes.
  cookieStore.set(SESSION_COOKIE_NAME, userId, cookieBase);

  return userId;
}

export async function setPersistentSessionUserId(
  userId: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PERSISTENT_COOKIE_NAME, userId, {
    ...cookieBase,
    maxAge: PERSISTENT_MAX_AGE,
  });
}
