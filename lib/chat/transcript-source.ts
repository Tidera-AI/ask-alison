/** How many of the user's recent chats to search for a non-empty transcript. */
const MAX_FALLBACK_CHATS = 5;

export type TranscriptSourceInput = {
  requestedChatId: string;
  /** The chat the email gate was shown in, or null if it isn't saved yet. */
  requestedChat: { id: string; user_id: string } | null;
  userId: string;
};

export type TranscriptSourceDeps<M> = {
  /** The user's chats, newest first. */
  listUserChats: (userId: string) => Promise<{ id: string }[]>;
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
 * exist yet. Refusing that locked those visitors out of the email gate.
 * Only a chat owned by someone else is refused; otherwise use the requested
 * chat if it has messages, else the visitor's latest chat that does.
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

  const candidates = (await deps.listUserChats(userId))
    .filter((chat) => chat.id !== requestedChat?.id)
    .slice(0, MAX_FALLBACK_CHATS);

  for (const chat of candidates) {
    const messages = await deps.getMessages(chat.id);
    if (messages.length > 0) {
      return { ok: true, chatId: chat.id, messages };
    }
  }

  return { ok: true, chatId: requestedChatId, messages: [] };
}
