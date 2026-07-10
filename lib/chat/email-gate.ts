/** One free user question per browser session; further messages require email in the DB. */
export function requiresEmailGate({
  email,
  userMessageCountInSession,
}: {
  email: string | null | undefined;
  userMessageCountInSession: number;
}): boolean {
  if (email) {
    return false;
  }
  return userMessageCountInSession >= 1;
}
