export type TranscriptSourceInput = {
  requestedChatId: string;
  /** The chat the email gate was shown in, or null if it isn't saved yet. */
  requestedChat: { id: string; user_id: string } | null;
  userId: string;
};

export type TranscriptSourceDeps<M> = {
  /** Id of the user's most recent chat that contains a message, or null. */
  findLatestChatWithMessages: (userId: string) => Promise<string | null>;
  getMessages: (chatId: string) => Promise<M[]>;
};

export type TranscriptSource<M> =
  | { ok: false }
  | { ok: true; chatId: string; messages: M[] };

/**
 * Pick the conversation to email when a visitor submits the email gate.
 *
 * The chat route checks the gate before it saves a new chat, so a visitor
 * whose second question starts a new chat submits a chat id that doesn't
 * exist yet (and failed requests can leave empty chats behind). Only a chat
 * owned by someone else is refused. The transcript is the requested chat when
 * it has messages, else the visitor's latest chat that does.
 */
export async function resolveTranscriptSource<M>(
  { requestedChatId, requestedChat, userId }: TranscriptSourceInput,
  deps: TranscriptSourceDeps<M>
): Promise<TranscriptSource<M>> {
  if (requestedChat && requestedChat.user_id !== userId) {
    return { ok: false };
  }

  if (requestedChat) {
    const messages = await deps.getMessages(requestedChat.id);
    if (messages.length > 0) {
      return { ok: true, chatId: requestedChat.id, messages };
    }
  }

  const chatId = await deps.findLatestChatWithMessages(userId);
  if (!chatId) {
    return { ok: true, chatId: requestedChatId, messages: [] };
  }

  return { ok: true, chatId, messages: await deps.getMessages(chatId) };
}
