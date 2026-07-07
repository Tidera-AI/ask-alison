export type SecurityEvent =
  | "ownership_denied"
  | "origin_denied"
  | "rate_limit"
  | "input_guard"
  | "copy_guard"
  | "ingest_rejected";

export function logSecurityEvent(
  event: SecurityEvent,
  detail: Record<string, unknown>
): void {
  console.error(
    JSON.stringify({
      type: "security_event",
      event,
      ...detail,
      at: new Date().toISOString(),
    })
  );
}
