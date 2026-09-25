import { describe, expect, it, vi } from "vitest";
import { rollbackFailedTurn } from "./failed-turn";

describe("rollbackFailedTurn", () => {
  it("deletes only the message this request saved, never the chat", async () => {
    const deleteMessage = vi.fn().mockResolvedValue(undefined);
    await rollbackFailedTurn(
      { chatId: "c1", userMessageId: "m1" },
      { deleteMessage }
    );
    expect(deleteMessage).toHaveBeenCalledTimes(1);
    expect(deleteMessage).toHaveBeenCalledWith("m1", "c1");
  });

  it("never throws when the cleanup itself fails", async () => {
    const deleteMessage = vi.fn().mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      rollbackFailedTurn(
        { chatId: "c1", userMessageId: "m1" },
        { deleteMessage }
      )
    ).resolves.toBeUndefined();
  });
});
