export type FailedTurn = {
  chatId: string;
  /** Id of the user message this request saved. */
  userMessageId: string;
};

export type FailedTurnDeps = {
  deleteMessage: (messageId: string, chatId: string) => Promise<void>;
};

/**
 * Delete the user message a chat request saved before it failed without
 * saving an answer. An unanswered message would otherwise count toward the
 * email gate, so a visitor whose first question failed would hit the gate on
 * retry. Only this request's own message is deleted — never the chat, whose
 * cascade could take another request's messages with it. Best-effort: never
 * throws.
 */
export async function rollbackFailedTurn(
  turn: FailedTurn,
  deps: FailedTurnDeps
): Promise<void> {
  try {
    await deps.deleteMessage(turn.userMessageId, turn.chatId);
  } catch (error) {
    console.error("Failed to roll back unanswered chat turn:", {
      chatId: turn.chatId,
      error,
    });
  }
}
