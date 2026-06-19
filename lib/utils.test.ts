import { describe, expect, it, vi } from "vitest";
import { fetcher, safeExternalUrl } from "./utils";

describe("safeExternalUrl", () => {
  it("returns undefined for empty values", () => {
    expect(safeExternalUrl(null)).toBeUndefined();
    expect(safeExternalUrl(undefined)).toBeUndefined();
    expect(safeExternalUrl("")).toBeUndefined();
  });

  it("allows http and https URLs", () => {
    expect(safeExternalUrl("https://example.com/a")).toBe(
      "https://example.com/a"
    );
    expect(safeExternalUrl("http://example.com")).toBe("http://example.com");
  });

  it("allows site-relative URLs", () => {
    expect(safeExternalUrl("/blog/post")).toBe("/blog/post");
  });

  it("rejects dangerous schemes", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeExternalUrl("data:text/html,<script>")).toBeUndefined();
    expect(safeExternalUrl("vbscript:msgbox")).toBeUndefined();
  });
});

describe("fetcher", () => {
  it("returns parsed JSON for successful responses", async () => {
    const mockData = { messages: [{ id: "1", role: "user" }] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    );

    const result = await fetcher("/api/messages?chatId=123");
    expect(result).toEqual(mockData);

    vi.unstubAllGlobals();
  });

  it("throws ChatbotError when response has JSON error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: () =>
          Promise.resolve({ code: "rate_limit:chat", cause: "rate limited" }),
      })
    );

    await expect(fetcher("/api/chat")).rejects.toThrow(
      "You've reached the message limit"
    );

    vi.unstubAllGlobals();
  });

  it("throws generic error when error response is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: () => Promise.reject(new SyntaxError("Unexpected end of JSON")),
      })
    );

    await expect(fetcher("/api/nonexistent")).rejects.toThrow(
      "Request failed: 404 Not Found"
    );

    vi.unstubAllGlobals();
  });

  it("throws generic error when error response body is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new TypeError("Failed to execute 'json'")),
      })
    );

    await expect(fetcher("/api/broken")).rejects.toThrow(
      "Request failed: 500 Internal Server Error"
    );

    vi.unstubAllGlobals();
  });
});
