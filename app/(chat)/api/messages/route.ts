import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return Response.json({ error: "chatId is required" }, { status: 400 });
  }

  const userId = await getOrCreateSessionUserId();
  const chat = await getChatById(chatId);

  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const isOwner = chat.user_id === userId;
  const visibility = chat.visibility ?? "private";

  if (!isOwner && visibility === "private") {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const messages = await getMessagesByChatId(chatId);

  // Convert DB messages to the UIMessage-like format the client expects.
  // Reconstruct the sources/notice data part from the persisted `sources`:
  //   [..]  -> "Used N sources" panel + inline citations
  //   []    -> graceful "no context" notice
  //   null  -> legacy message, nothing extra
  const uiMessages = messages.map((m) => {
    const parts: Array<{
      type: string;
      id?: string;
      text?: string;
      data?: unknown;
    }> = [];

    if (m.role === "assistant" && Array.isArray(m.sources)) {
      if (m.sources.length > 0) {
        parts.push({ type: "data-sources", id: "sources", data: m.sources });
      } else {
        parts.push({
          type: "data-notice",
          id: "notice",
          data: { kind: "no-context" },
        });
      }
    }

    parts.push({ type: "text" as const, text: m.content });

    return {
      id: m.id,
      role: m.role,
      parts,
      createdAt: m.created_at,
    };
  });

  return Response.json({
    messages: uiMessages,
    visibility,
    isReadonly: !isOwner,
  });
}
