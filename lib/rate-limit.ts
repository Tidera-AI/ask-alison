interface WindowState {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowState>();

const LIMITS = {
  sessionHour: { max: 30, windowMs: 60 * 60 * 1000 },
  ipHour: { max: 60, windowMs: 60 * 60 * 1000 },
  sessionDay: { max: 100, windowMs: 24 * 60 * 60 * 1000 },
} as const;

const PRUNE_THRESHOLD = 1000;

function pruneExpired(now: number): void {
  if (windows.size < PRUNE_THRESHOLD) {
    return;
  }
  for (const [key, state] of windows) {
    if (now >= state.resetAt) {
      windows.delete(key);
    }
  }
}

function hit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  pruneExpired(now);

  const state = windows.get(key);
  if (!state || now >= state.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (state.count >= max) {
    return false;
  }

  state.count += 1;
  return true;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkChatRateLimit(sessionId: string, ip: string): boolean {
  return (
    hit(
      `session:h:${sessionId}`,
      LIMITS.sessionHour.max,
      LIMITS.sessionHour.windowMs
    ) &&
    hit(`ip:h:${ip}`, LIMITS.ipHour.max, LIMITS.ipHour.windowMs) &&
    hit(
      `session:d:${sessionId}`,
      LIMITS.sessionDay.max,
      LIMITS.sessionDay.windowMs
    )
  );
}
