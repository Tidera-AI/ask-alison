import { getChatById } from "@/lib/db/queries";

type ChatRow = NonNullable<Awaited<ReturnType<typeof getChatById>>>;

export type ChatAccessResult =
  | { ok: true; chat: ChatRow }
  | { ok: false; reason: "not_found" | "forbidden" };

export function isChatOwner(
  chat: { user_id: string },
  userId: string
): boolean {
  return chat.user_id === userId;
}

export async function assertChatOwner(
  chatId: string,
  userId: string
): Promise<ChatAccessResult> {
  const chat = await getChatById(chatId);
  if (!chat) {
    return { ok: false, reason: "not_found" };
  }
  if (!isChatOwner(chat, userId)) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, chat };
}
