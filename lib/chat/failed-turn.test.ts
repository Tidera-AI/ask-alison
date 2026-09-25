import { describe, expect, it, vi } from "vitest";
import { rollbackFailedTurn } from "./failed-turn";

function deps() {
  return {
    deleteChat: vi.fn().mockResolvedValue(undefined),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
  };
}

describe("rollbackFailedTurn", () => {
  it("deletes a chat this request created, which cascades its messages", async () => {
    const d = deps();
    await rollbackFailedTurn(
      {
        chatId: "c1",
        userId: "u1",
        createdChat: true,
        savedUserMessageId: "m1",
      },
      d
    );
    expect(d.deleteChat).toHaveBeenCalledWith("c1", "u1");
    expect(d.deleteMessage).not.toHaveBeenCalled();
  });

  it("deletes only the unanswered message in an existing chat", async () => {
    const d = deps();
    await rollbackFailedTurn(
      {
        chatId: "c1",
        userId: "u1",
        createdChat: false,
        savedUserMessageId: "m1",
      },
      d
    );
    expect(d.deleteMessage).toHaveBeenCalledWith("m1", "c1");
    expect(d.deleteChat).not.toHaveBeenCalled();
  });

  it("does nothing when nothing was persisted", async () => {
    const d = deps();
    await rollbackFailedTurn(
      {
        chatId: "c1",
        userId: "u1",
        createdChat: false,
        savedUserMessageId: null,
      },
      d
    );
    expect(d.deleteChat).not.toHaveBeenCalled();
    expect(d.deleteMessage).not.toHaveBeenCalled();
  });

  it("never throws when the cleanup itself fails", async () => {
    const d = deps();
    d.deleteChat.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      rollbackFailedTurn(
        {
          chatId: "c1",
          userId: "u1",
          createdChat: true,
          savedUserMessageId: null,
        },
        d
      )
    ).resolves.toBeUndefined();
  });
});
