import { randomUUID } from "node:crypto";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  smoothStream,
  streamText,
} from "ai";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/ai/models";
import { buildSystemPrompt, titlePrompt } from "@/lib/ai/prompts";
import {
  EVAL_MODEL_ID,
  getLanguageModel,
  getTitleModel,
} from "@/lib/ai/providers";
import {
  trackQuestion,
  trackResponseEval,
  trackRetrieval,
} from "@/lib/analytics/track";
import {
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  getOrCreateUser,
  saveChat,
  saveMessage,
  updateChatTitle,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { generateEmbedding } from "@/lib/rag/embeddings";
import { evaluateResponse } from "@/lib/rag/eval";
import { shouldSkipRetrieval } from "@/lib/rag/pleasantry-classify";
import {
  buildRetrievalQuery,
  type ConversationTurn,
} from "@/lib/rag/query-rewrite";
import {
  chunksToSources,
  formatChunksForPrompt,
  hasBookSource,
  retrieveRelevantChunks,
} from "@/lib/rag/retrieval";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";
import type { ChatMessage } from "@/lib/types";
import { chatRequestSchema, extractMessageText } from "./schema";

// Off by default: each graded answer costs an extra (cheap) grader call. Enable
// deliberately where that cost is acceptable, e.g. for a pre-launch eval run.
const RESPONSE_EVAL_ENABLED = process.env.RESPONSE_EVAL_ENABLED === "true";

function buildConversationHistory(
  priorMessages: Awaited<ReturnType<typeof getMessagesByChatId>>,
  userText: string
): {
  conversationHistory: ConversationTurn[];
  priorTurns: ConversationTurn[];
} {
  const recentPrior: ConversationTurn[] = priorMessages
    .slice(-9)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));
  const withCurrent: ConversationTurn[] = [
    ...recentPrior,
    { role: "user", content: userText },
  ];
  const conversationHistory = withCurrent.slice(-10);
  const priorTurns = conversationHistory.slice(0, -1);

  return { conversationHistory, priorTurns };
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("id");

  if (!chatId) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const userId = await getOrCreateSessionUserId();
  const chat = await getChatById(chatId);

  if (!chat) {
    return new ChatbotError("not_found:chat").toResponse();
  }

  if (chat.user_id !== userId) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  await deleteChatById(chatId);

  return Response.json({ success: true });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const { id: chatId, message, isFirstMessage = false } = parsed.data;
  const userText = extractMessageText(message);

  if (!userText) {
    return new ChatbotError("bad_request:chat").toResponse();
  }

  try {
    const userId = await getOrCreateSessionUserId();

    const earlyEmbeddingPromise = isFirstMessage
      ? generateEmbedding(userText)
      : null;

    const [bootstrapResults, skipRetrieval] = await Promise.all([
      Promise.all([
        getOrCreateUser(userId),
        getChatById(chatId),
        isFirstMessage ? Promise.resolve([]) : getMessagesByChatId(chatId),
      ]),
      shouldSkipRetrieval(userText),
    ]);
    const existingChat = bootstrapResults[1];
    let priorMessages = bootstrapResults[2];

    if (isFirstMessage && existingChat) {
      priorMessages = await getMessagesByChatId(chatId);
    }

    if (!existingChat) {
      await saveChat({
        id: chatId,
        user_id: userId,
        title: "New conversation",
      });
    }

    const { conversationHistory, priorTurns } = buildConversationHistory(
      priorMessages,
      userText
    );

    const userMessageId = randomUUID();

    const [retrievalQuery] = await Promise.all([
      skipRetrieval
        ? Promise.resolve("")
        : buildRetrievalQuery(userText, priorTurns),
      saveMessage({
        id: userMessageId,
        chat_id: chatId,
        role: "user",
        content: userText,
      }),
    ]);

    let precomputedEmbedding: number[] | undefined;
    if (!skipRetrieval && priorTurns.length === 0 && earlyEmbeddingPromise) {
      precomputedEmbedding = await earlyEmbeddingPromise;
    } else if (earlyEmbeddingPromise) {
      earlyEmbeddingPromise.catch(() => {
        /* discarded — follow-up-style history on a flagged first message */
      });
    }

    const chunks = skipRetrieval
      ? []
      : await retrieveRelevantChunks(retrievalQuery, {
          ...(precomputedEmbedding
            ? { queryEmbedding: precomputedEmbedding }
            : {}),
        });
    const context = formatChunksForPrompt(chunks);

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
      rewritten_query:
        !skipRetrieval && retrievalQuery !== userText ? retrievalQuery : null,
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

    const systemPrompt = buildSystemPrompt(context, {
      hasBookContext: hasBookSource(chunks),
      skipRetrieval,
    });

    const sources = chunksToSources(chunks);

    const stream = createUIMessageStream<ChatMessage>({
      execute: ({ writer }) => {
        if (sources.length > 0) {
          writer.write({ type: "data-sources", id: "sources", data: sources });
        } else if (!skipRetrieval) {
          writer.write({
            type: "data-notice",
            id: "notice",
            data: { kind: "no-context" },
          });
        }

        const result = streamText({
          model: getLanguageModel(DEFAULT_CHAT_MODEL_ID),
          system: systemPrompt,
          messages: conversationHistory,
          experimental_transform: smoothStream({
            chunking: "word",
            delayInMs: null,
          }),
          onFinish: async ({ text }) => {
            const assistantMessageId = randomUUID();
            await saveMessage({
              id: assistantMessageId,
              chat_id: chatId,
              role: "assistant",
              content: text,
              sources: skipRetrieval ? null : sources,
            });

            if (RESPONSE_EVAL_ENABLED && chunks.length > 0) {
              const scores = await evaluateResponse({
                question: userText,
                answer: text,
                chunks,
              });
              await trackResponseEval({
                chat_id: chatId,
                message_id: assistantMessageId,
                question: userText,
                faithfulness: scores.faithfulness,
                relevance: scores.relevance,
                chunks_evaluated: chunks.length,
                model: EVAL_MODEL_ID,
              });
            }

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

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Chat API error:", error);
    return new ChatbotError("internal:chat").toResponse();
  }
}
