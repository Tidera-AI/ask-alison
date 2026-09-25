import { describe, expect, it, vi } from "vitest";
import { resolveTranscriptSource } from "./transcript-source";

type Msg = { role: string; content: string };
const q: Msg = { role: "user", content: "How do I decline?" };

function deps(chats: { id: string }[], messagesByChat: Record<string, Msg[]>) {
  return {
    listUserChats: vi.fn().mockResolvedValue(chats),
    getMessages: vi.fn((id: string) =>
      Promise.resolve(messagesByChat[id] ?? [])
    ),
  };
}

describe("resolveTranscriptSource", () => {
  it("forbids a chat owned by someone else", async () => {
    const d = deps([], {});
    const result = await resolveTranscriptSource(
      {
        requestedChatId: "c1",
        requestedChat: { id: "c1", user_id: "other" },
        userId: "u1",
      },
      d
    );
    expect(result).toEqual({ ok: false });
    expect(d.getMessages).not.toHaveBeenCalled();
  });

  it("uses the requested chat when the user owns it and it has messages", async () => {
    const d = deps([], { c1: [q] });
    const result = await resolveTranscriptSource(
      {
        requestedChatId: "c1",
        requestedChat: { id: "c1", user_id: "u1" },
        userId: "u1",
      },
      d
    );
    expect(result).toEqual({ ok: true, chatId: "c1", messages: [q] });
    expect(d.listUserChats).not.toHaveBeenCalled();
  });

  it("falls back to the user's latest chat with messages when the requested chat does not exist yet", async () => {
    const d = deps([{ id: "empty" }, { id: "c0" }], { c0: [q] });
    const result = await resolveTranscriptSource(
      { requestedChatId: "new", requestedChat: null, userId: "u1" },
      d
    );
    expect(result).toEqual({ ok: true, chatId: "c0", messages: [q] });
  });

  it("falls back when the requested chat is owned but empty", async () => {
    const d = deps([{ id: "c1" }, { id: "c0" }], { c0: [q] });
    const result = await resolveTranscriptSource(
      {
        requestedChatId: "c1",
        requestedChat: { id: "c1", user_id: "u1" },
        userId: "u1",
      },
      d
    );
    expect(result).toEqual({ ok: true, chatId: "c0", messages: [q] });
  });

  it("still allows capture with an empty transcript when no chat has messages", async () => {
    const d = deps([], {});
    const result = await resolveTranscriptSource(
      { requestedChatId: "new", requestedChat: null, userId: "u1" },
      d
    );
    expect(result).toEqual({ ok: true, chatId: "new", messages: [] });
  });
});
