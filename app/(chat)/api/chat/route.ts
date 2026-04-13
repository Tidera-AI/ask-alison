import { streamText, generateText } from "ai";
import { getLanguageModel, getTitleModel } from "@/lib/ai/providers";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/ai/models";
import { buildSystemPrompt, titlePrompt } from "@/lib/ai/prompts";
import {
  retrieveRelevantChunks,
  formatChunksForPrompt,
} from "@/lib/rag/retrieval";
import {
  saveChat,
  saveMessage,
  getChatById,
  getMessagesByChatId,
  updateChatTitle,
  getOrCreateUser,
} from "@/lib/db/queries";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";
import { trackQuestion } from "@/lib/analytics/track";
import { chatRequestSchema } from "./schema";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
    });
  }

  const { id: chatId, message } = parsed.data;
  const userText = message.content;

  // Get or create anonymous user
  const userId = await getOrCreateSessionUserId();
  await getOrCreateUser(userId);

  // Get or create chat
  const existingChat = await getChatById(chatId);
  if (!existingChat) {
    await saveChat({ id: chatId, user_id: userId, title: "New conversation" });
  }

  // Save the user's message
  await saveMessage({
    id: randomUUID(),
    chat_id: chatId,
    role: "user",
    content: userText,
  });

  // RAG: retrieve relevant content chunks
  const chunks = await retrieveRelevantChunks(userText);
  const context = formatChunksForPrompt(chunks);

  // Track analytics (fire and forget)
  trackQuestion({
    chat_id: chatId,
    user_question: userText,
    topics_matched: chunks
      .map((c) => c.topic)
      .filter((t): t is string => t !== null),
    chunks_used: chunks.length,
  }).catch(() => {});

  // Get conversation history for context
  const previousMessages = await getMessagesByChatId(chatId);
  const conversationHistory = previousMessages
    .slice(-10)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Build system prompt with retrieved context
  const systemPrompt = buildSystemPrompt(context);

  const result = streamText({
    model: getLanguageModel(DEFAULT_CHAT_MODEL_ID),
    system: systemPrompt,
    messages: conversationHistory,
    onFinish: async ({ text }) => {
      // Save assistant response
      await saveMessage({
        id: randomUUID(),
        chat_id: chatId,
        role: "assistant",
        content: text,
      });

      // Generate title for new chats
      if (!existingChat) {
        const titleResult = await generateText({
          model: getTitleModel(),
          system: titlePrompt,
          messages: [{ role: "user" as const, content: userText }],
        });
        await updateChatTitle(chatId, titleResult.text.trim());
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
