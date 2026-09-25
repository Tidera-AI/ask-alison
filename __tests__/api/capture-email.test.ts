import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  getOrCreateUser: vi.fn(),
  getUserById: vi.fn(),
  getChatById: vi.fn(),
  findLatestChatWithMessages: vi.fn(),
  getMessagesByChatId: vi.fn(),
  countUserMessagesForUser: vi.fn(),
  claimUserEmail: vi.fn(),
};
const deliverLeadCapture = vi.fn();
const allowedOrigin = vi.fn();
const setPersistentSessionUserId = vi.fn();
const calls: string[] = [];

vi.mock("@/lib/db/queries", () => db);
vi.mock("@/lib/google/lead-capture", () => ({
  deliverLeadCapture: (...args: unknown[]) => deliverLeadCapture(...args),
}));
vi.mock("@/lib/security/origin", () => ({
  isAllowedMutatingOrigin: () => allowedOrigin(),
}));
vi.mock("@/lib/security/audit-log", () => ({ logSecurityEvent: vi.fn() }));
vi.mock("@/lib/session/anonymous", () => ({
  getOrCreateSessionUserId: vi.fn().mockResolvedValue("u1"),
  setPersistentSessionUserId: (...args: unknown[]) =>
    setPersistentSessionUserId(...args),
}));

const { POST } = await import("@/app/(chat)/api/capture-email/route");

const NEW_CHAT = "11111111-1111-4111-8111-111111111111";
const q = { role: "user", content: "How do I decline?" };
const delivered = { status: "delivered", durationMs: 1 };

function post(email = "guest@example.com", chatId = NEW_CHAT) {
  return POST(
    new Request("https://ask-alison-six.vercel.app/api/capture-email", {
      method: "POST",
      body: JSON.stringify({ chatId, email }),
    })
  );
}

describe("POST /api/capture-email", () => {
  beforeEach(() => {
    calls.length = 0;
    for (const fn of Object.values(db)) {
      fn.mockReset();
    }
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    allowedOrigin.mockReset().mockReturnValue(true);
    db.getOrCreateUser.mockResolvedValue({ id: "u1", email: null });
    db.getChatById.mockResolvedValue(null);
    db.findLatestChatWithMessages.mockResolvedValue("c0");
    db.getMessagesByChatId.mockImplementation((id: string) =>
      Promise.resolve(id === "c0" ? [q] : [])
    );
    db.countUserMessagesForUser.mockResolvedValue(1);
    db.claimUserEmail.mockReset().mockImplementation(() => {
      calls.push("save");
      return Promise.resolve(true);
    });
    setPersistentSessionUserId.mockReset().mockImplementation(() => {
      calls.push("cookie");
      return Promise.resolve();
    });
    deliverLeadCapture.mockReset().mockImplementation(() => {
      calls.push("deliver");
      return Promise.resolve({ sheet: delivered, transcript: delivered });
    });
  });

  it("captures the email when the gated chat is not saved yet", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, captured: true });
    expect(db.claimUserEmail).toHaveBeenCalledWith(
      "u1",
      null,
      "guest@example.com"
    );
    expect(deliverLeadCapture).toHaveBeenCalledWith({
      chatId: "c0",
      email: "guest@example.com",
      messages: [q],
    });
  });

  it("saves the email and cookie before attempting Google delivery", async () => {
    await post();
    expect(calls).toEqual(["save", "cookie", "deliver"]);
  });

  it("lets the visitor continue when Google delivery fails", async () => {
    deliverLeadCapture.mockResolvedValue({
      sheet: { status: "skipped", durationMs: 1, error: "oauth" },
      transcript: { status: "skipped", durationMs: 1, error: "oauth" },
    });
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, captured: true });
  });

  it("fails without delivering when the email can't be saved", async () => {
    db.claimUserEmail.mockRejectedValue(new Error("db down"));
    const res = await post();
    expect(res.status).toBe(500);
    expect(deliverLeadCapture).not.toHaveBeenCalled();
    expect(setPersistentSessionUserId).not.toHaveBeenCalled();
  });

  it("treats a resubmission of the saved address as a no-op", async () => {
    db.getOrCreateUser.mockResolvedValue({
      id: "u1",
      email: "guest@example.com",
    });
    const res = await post("  Guest@Example.com ");
    expect(await res.json()).toEqual({ success: true, captured: true });
    expect(db.claimUserEmail).not.toHaveBeenCalled();
    expect(deliverLeadCapture).not.toHaveBeenCalled();
    expect(setPersistentSessionUserId).toHaveBeenCalledWith("u1");
  });

  it("saves and delivers a corrected address", async () => {
    db.getOrCreateUser.mockResolvedValue({
      id: "u1",
      email: "typo@exmple.com",
    });
    const res = await post("guest@example.com");
    expect(res.status).toBe(200);
    expect(db.claimUserEmail).toHaveBeenCalledWith(
      "u1",
      "typo@exmple.com",
      "guest@example.com"
    );
    expect(deliverLeadCapture).toHaveBeenCalledTimes(1);
  });

  it("does not deliver twice when a concurrent request saved the same address", async () => {
    db.claimUserEmail.mockResolvedValue(false);
    db.getUserById.mockResolvedValue({ id: "u1", email: "guest@example.com" });
    const res = await post();
    expect(await res.json()).toEqual({ success: true, captured: true });
    expect(deliverLeadCapture).not.toHaveBeenCalled();
  });

  it("asks for a retry when a concurrent request saved a different address", async () => {
    db.claimUserEmail.mockResolvedValue(false);
    db.getUserById.mockResolvedValue({ id: "u1", email: "other@example.com" });
    const res = await post();
    expect(res.status).toBe(500);
    expect(deliverLeadCapture).not.toHaveBeenCalled();
  });

  it("rejects cross-site requests before any side effect", async () => {
    allowedOrigin.mockReturnValue(false);
    const res = await post();
    expect(res.status).toBe(403);
    expect(db.claimUserEmail).not.toHaveBeenCalled();
    expect(deliverLeadCapture).not.toHaveBeenCalled();
  });

  it("captures nothing when the session no longer needs the gate", async () => {
    db.countUserMessagesForUser.mockResolvedValue(0);
    const res = await post();
    expect(await res.json()).toEqual({ success: true, captured: false });
    expect(db.claimUserEmail).not.toHaveBeenCalled();
    expect(deliverLeadCapture).not.toHaveBeenCalled();
  });

  it("rejects a chat owned by another user", async () => {
    db.getChatById.mockResolvedValue({ id: NEW_CHAT, user_id: "other" });
    const res = await post();
    expect(res.status).toBe(403);
    expect(db.claimUserEmail).not.toHaveBeenCalled();
    expect(deliverLeadCapture).not.toHaveBeenCalled();
  });

  it("rejects a malformed body with 400", async () => {
    const res = await POST(
      new Request("https://ask-alison-six.vercel.app/api/capture-email", {
        method: "POST",
        body: "not json",
      })
    );
    expect(res.status).toBe(400);
  });
});
