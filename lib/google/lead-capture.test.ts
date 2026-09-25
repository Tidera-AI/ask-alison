import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliverLeadCapture } from "./lead-capture";

const ENV = {
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_REFRESH_TOKEN: "refresh",
  GOOGLE_SENDER_EMAIL: "alison@example.com",
  SUBSCRIBER_SHEET_ID: "sheet",
};

type Route = "oauth" | "gmail" | "sheets";

function routeOf(url: string): Route {
  if (url.includes("oauth2")) {
    return "oauth";
  }
  return url.includes("gmail") ? "gmail" : "sheets";
}

/** A fetch that answers per endpoint; "hang" never resolves until aborted. */
function stubFetch(behavior: Partial<Record<Route, number | "hang">>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const outcome = behavior[routeOf(url)] ?? 200;
    if (outcome === "hang") {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason)
        );
      });
    }
    const body =
      routeOf(url) === "oauth" ? JSON.stringify({ access_token: "tok" }) : "{}";
    return Promise.resolve(new Response(body, { status: outcome }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const input = {
  chatId: "c1",
  email: "guest@example.com",
  messages: [{ role: "user", content: "How do I decline?" }],
};

describe("deliverLeadCapture", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(ENV)) {
      vi.stubEnv(key, value);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reports both steps delivered", async () => {
    stubFetch({});
    const result = await deliverLeadCapture(input);
    expect(result.sheet.status).toBe("delivered");
    expect(result.transcript.status).toBe("delivered");
  });

  it("reports a partial failure per step instead of rejecting", async () => {
    stubFetch({ sheets: 500 });
    const result = await deliverLeadCapture(input);
    expect(result.transcript.status).toBe("delivered");
    expect(result.sheet.status).toBe("failed");
    expect(result.sheet.error).toContain("500");
  });

  it("skips both steps without rejecting when configuration is missing", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    const fetchMock = stubFetch({});
    const result = await deliverLeadCapture(input);
    expect(result.sheet.status).toBe("skipped");
    expect(result.transcript.status).toBe("skipped");
    expect(result.sheet.error).toContain("GOOGLE_CLIENT_ID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds a hung OAuth request", async () => {
    vi.useFakeTimers();
    stubFetch({ oauth: "hang" });
    const pending = deliverLeadCapture(input);
    await vi.advanceTimersByTimeAsync(2100);
    const result = await pending;
    expect(result.sheet.status).toBe("skipped");
    expect(result.transcript.status).toBe("skipped");
  });

  it("bounds a hung delivery step and reports it as a timeout", async () => {
    vi.useFakeTimers();
    stubFetch({ gmail: "hang" });
    const pending = deliverLeadCapture(input);
    await vi.advanceTimersByTimeAsync(3100);
    const result = await pending;
    expect(result.sheet.status).toBe("delivered");
    expect(result.transcript.status).toBe("timeout");
  });

  it("never puts the visitor's address in a step error", async () => {
    stubFetch({ gmail: 400, sheets: 403 });
    const result = await deliverLeadCapture(input);
    expect(JSON.stringify(result)).not.toContain(input.email);
  });
});
