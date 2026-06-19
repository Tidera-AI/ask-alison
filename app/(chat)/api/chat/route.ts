import { randomUUID } from "node:crypto";
import { generateText, streamText } from "ai";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/ai/models";
import { buildSystemPrompt, titlePrompt } from "@/lib/ai/prompts";
import { getLanguageModel, getTitleModel } from "@/lib/ai/providers";
import { trackQuestion, trackRetrieval } from "@/lib/analytics/track";
import {
  getChatById,
  getMessagesByChatId,
  getOrCreateUser,
  saveChat,
  saveMessage,
  updateChatTitle,
} from "@/lib/db/queries";
import { buildRetrievalQuery } from "@/lib/rag/query-rewrite";
import {
  formatChunksForPrompt,
  hasBookSource,
  retrieveRelevantChunks,
} from "@/lib/rag/retrieval";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";
import { chatRequestSchema, extractMessageText } from "./schema";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
    });
  }

  const { id: chatId, message } = parsed.data;
  const userText = extractMessageText(message);

  if (!userText) {
    return new Response(JSON.stringify({ error: "Message text is required" }), {
      status: 400,
    });
  }

  try {
    // Get or create anonymous user
    const userId = await getOrCreateSessionUserId();
    await getOrCreateUser(userId);

    // Get or create chat
    const existingChat = await getChatById(chatId);
    if (!existingChat) {
      await saveChat({
        id: chatId,
        user_id: userId,
        title: "New conversation",
      });
    }

    // Save the user's message
    await saveMessage({
      id: randomUUID(),
      chat_id: chatId,
      role: "user",
      content: userText,
    });

    // Conversation history (the just-saved user message is the final entry;
    // exclude it when building the retrieval query so we fold in prior turns).
    const previousMessages = await getMessagesByChatId(chatId);
    const conversationHistory = previousMessages.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const priorTurns = conversationHistory.slice(0, -1);

    // Fold recent conversation into a standalone retrieval query for follow-ups.
    const retrievalQuery = await buildRetrievalQuery(userText, priorTurns);

    // RAG: hybrid retrieval over the retrieval query.
    const chunks = await retrieveRelevantChunks(retrievalQuery);
    const context = formatChunksForPrompt(chunks);

    // Track analytics (fire and forget)
    trackQuestion({
      chat_id: chatId,
      user_question: userText,
      topics_matched: chunks
        .map((c) => c.topic)
        .filter((t): t is string => t !== null),
      chunks_used: chunks.length,
    }).catch(() => {
      /* fire and forget */
    });

    trackRetrieval({
      chat_id: chatId,
      query_text: userText,
      rewritten_query: retrievalQuery === userText ? null : retrievalQuery,
      chunk_ids: chunks.map((c) => c.id),
      scores: chunks.map((c) => ({
        id: c.id,
        source: c.source,
        similarity: c.similarity,
        rrf_score: c.rrfScore,
      })),
    }).catch(() => {
      /* fire and forget */
    });

    // Build system prompt with retrieved context; cite the book only when
    // book chunks were actually retrieved.
    const systemPrompt = buildSystemPrompt(context, {
      hasBookContext: hasBookSource(chunks),
    });

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
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { code: "bad_request:chat", message: String(error) },
      { status: 500 }
    );
  }
}
