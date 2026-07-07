import { dbMessagesToUiMessages } from "@/lib/chat/history";
import { getChatById, getMessagesByChatId, getOrCreateUser } from "@/lib/db/queries";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return Response.json({ error: "chatId is required" }, { status: 400 });
  }

  const userId = await getOrCreateSessionUserId();
  const [chat, user] = await Promise.all([
    getChatById(chatId),
    getOrCreateUser(userId),
  ]);

  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const isOwner = chat.user_id === userId;
  const visibility = chat.visibility ?? "private";

  if (!isOwner && visibility === "private") {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const messages = await getMessagesByChatId(chatId);

  // Convert DB rows to the UIMessage-like format the client expects, rebuilding
  // the sources/notice data part from the persisted `sources` column.
  const uiMessages = dbMessagesToUiMessages(messages);

  return Response.json({
    messages: uiMessages,
    visibility,
    isReadonly: !isOwner,
    hasEmail: Boolean(user.email),
  });
}
