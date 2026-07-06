import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "user-1" }),
    set: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics/track", () => ({
  trackQuestion: vi.fn(),
  trackResponseEval: vi.fn(),
  trackRetrieval: vi.fn(),
}));

vi.mock("@/lib/db/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("@/lib/db/queries", () => ({
  deleteChatById: vi.fn(),
  getChatById: vi.fn(),
  getMessagesByChatId: vi.fn(),
  getOrCreateUser: vi.fn(),
  saveChat: vi.fn(),
  saveMessage: vi.fn(),
  updateChatTitle: vi.fn(),
}));

import { DELETE } from "@/app/(chat)/api/chat/route";
import { deleteChatById, getChatById } from "@/lib/db/queries";

function deleteRequest(chatId?: string): Request {
  const query = chatId ? `?id=${chatId}` : "";
  return new Request(`http://localhost/api/chat${query}`, {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/chat", () => {
  it("deletes the chat when the session user owns it", async () => {
    vi.mocked(getChatById).mockResolvedValue({
      id: "chat-1",
      user_id: "user-1",
      title: "Hello",
      created_at: "2024-01-01",
      visibility: "private",
    });
    vi.mocked(deleteChatById).mockResolvedValue(undefined);

    const response = await DELETE(deleteRequest("chat-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(deleteChatById).toHaveBeenCalledWith("chat-1");
  });

  it("returns 400 when id is missing", async () => {
    const response = await DELETE(deleteRequest());
    expect(response.status).toBe(400);
    expect(deleteChatById).not.toHaveBeenCalled();
  });

  it("returns 404 when the chat does not exist", async () => {
    vi.mocked(getChatById).mockResolvedValue(null);

    const response = await DELETE(deleteRequest("missing-chat"));
    expect(response.status).toBe(404);
    expect(deleteChatById).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user does not own the chat", async () => {
    vi.mocked(getChatById).mockResolvedValue({
      id: "chat-1",
      user_id: "user-2",
      title: "Hello",
      created_at: "2024-01-01",
      visibility: "private",
    });

    const response = await DELETE(deleteRequest("chat-1"));
    expect(response.status).toBe(403);
    expect(deleteChatById).not.toHaveBeenCalled();
  });
});
