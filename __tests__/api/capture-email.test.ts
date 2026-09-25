import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  getOrCreateUser: vi.fn(),
  getChatById: vi.fn(),
  findLatestChatWithMessages: vi.fn(),
  getMessagesByChatId: vi.fn(),
  countUserMessagesForUser: vi.fn(),
  setUserEmail: vi.fn(),
};
const deliverLeadCapture = vi.fn();
const allowedOrigin = vi.fn();

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
  setPersistentSessionUserId: vi.fn().mockResolvedValue(undefined),
}));

const { POST } = await import("@/app/(chat)/api/capture-email/route");

const NEW_CHAT = "11111111-1111-4111-8111-111111111111";
const q = { role: "user", content: "How do I decline?" };

function post(chatId = NEW_CHAT, email = "guest@example.com") {
  return POST(
    new Request("https://ask-alison-six.vercel.app/api/capture-email", {
      method: "POST",
      body: JSON.stringify({ chatId, email }),
    })
  );
}

describe("POST /api/capture-email", () => {
  beforeEach(() => {
    for (const fn of Object.values(db)) {
      fn.mockReset();
    }
    deliverLeadCapture.mockReset().mockResolvedValue(undefined);
    allowedOrigin.mockReset().mockReturnValue(true);
    db.getOrCreateUser.mockResolvedValue({ id: "u1", email: null });
    db.getChatById.mockResolvedValue(null);
    db.findLatestChatWithMessages.mockResolvedValue("c0");
    db.getMessagesByChatId.mockImplementation((id: string) =>
      Promise.resolve(id === "c0" ? [q] : [])
    );
    db.countUserMessagesForUser.mockResolvedValue(1);
    db.setUserEmail.mockResolvedValue(undefined);
  });

  it("captures the email when the gated chat is not saved yet", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, captured: true });
    expect(deliverLeadCapture).toHaveBeenCalledWith({
      chatId: "c0",
      email: "guest@example.com",
      messages: [q],
    });
    expect(db.setUserEmail).toHaveBeenCalledWith("u1", "guest@example.com");
  });

  it("rejects cross-site requests before any side effect", async () => {
    allowedOrigin.mockReturnValue(false);
    const res = await post();
    expect(res.status).toBe(403);
    expect(deliverLeadCapture).not.toHaveBeenCalled();
    expect(db.setUserEmail).not.toHaveBeenCalled();
  });

  it("captures nothing when the session no longer needs the gate", async () => {
    db.countUserMessagesForUser.mockResolvedValue(0);
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, captured: false });
    expect(deliverLeadCapture).not.toHaveBeenCalled();
    expect(db.setUserEmail).not.toHaveBeenCalled();
  });

  it("rejects a chat owned by another user", async () => {
    db.getChatById.mockResolvedValue({ id: NEW_CHAT, user_id: "other" });
    const res = await post();
    expect(res.status).toBe(403);
    expect(deliverLeadCapture).not.toHaveBeenCalled();
  });
});
