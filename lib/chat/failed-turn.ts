export type FailedTurn = {
  chatId: string;
  userId: string;
  /** True when this request inserted the chat row. */
  createdChat: boolean;
  /** Id of the user message this request saved, or null if none was saved. */
  savedUserMessageId: string | null;
};

export type FailedTurnDeps = {
  deleteChat: (chatId: string, userId: string) => Promise<void>;
  deleteMessage: (messageId: string, chatId: string) => Promise<void>;
};

/**
 * Undo what a chat request persisted before it failed without answering.
 * An unanswered user message would otherwise count toward the email gate, so
 * a visitor whose first question failed would hit the gate on retry. Deleting
 * a chat this request created cascades its messages and keeps an empty
 * "New conversation" out of history. Best-effort: never throws.
 */
export async function rollbackFailedTurn(
  turn: FailedTurn,
  deps: FailedTurnDeps
): Promise<void> {
  try {
    if (turn.createdChat) {
      await deps.deleteChat(turn.chatId, turn.userId);
    } else if (turn.savedUserMessageId) {
      await deps.deleteMessage(turn.savedUserMessageId, turn.chatId);
    }
  } catch (error) {
    console.error("Failed to roll back unanswered chat turn:", {
      chatId: turn.chatId,
      error,
    });
  }
}
