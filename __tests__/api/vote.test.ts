import { describe, it, expect, vi } from "vitest";

// Mock next/headers before importing the route handler
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "test-session-id" }),
    set: vi.fn(),
  }),
}));

import { GET, PATCH } from "@/app/(chat)/api/vote/route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/vote", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/vote", () => {
  it("returns an empty array", async () => {
    const response = GET();
    const data = await response.json();
    expect(data).toEqual([]);
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/vote", () => {
  it("accepts type: 'up' and returns success", async () => {
    const request = jsonRequest({
      chatId: "chat-1",
      messageId: "msg-1",
      type: "up",
    });

    const response = await PATCH(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("accepts type: 'down' and returns success", async () => {
    const request = jsonRequest({
      chatId: "chat-1",
      messageId: "msg-1",
      type: "down",
    });

    const response = await PATCH(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("rejects missing chatId with 400", async () => {
    const request = jsonRequest({
      messageId: "msg-1",
      type: "up",
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("rejects missing messageId with 400", async () => {
    const request = jsonRequest({
      chatId: "chat-1",
      type: "up",
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("rejects invalid type value with 400", async () => {
    const request = jsonRequest({
      chatId: "chat-1",
      messageId: "msg-1",
      type: "invalid",
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("rejects the old isUpvoted field (regression)", async () => {
    const request = jsonRequest({
      chatId: "chat-1",
      messageId: "msg-1",
      isUpvoted: true,
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });
});
