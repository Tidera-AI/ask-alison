/** One free user question per session; further messages require a captured email. */
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
