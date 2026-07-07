import { randomUUID } from "node:crypto";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
} from "ai";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/ai/models";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { EVAL_MODEL_ID, getLanguageModel } from "@/lib/ai/providers";
import {
  trackQuestion,
  trackResponseEval,
  trackRetrieval,
} from "@/lib/analytics/track";
import {
  createStaticReplyStream,
  generateChatTitle,
} from "@/lib/chat/static-reply";
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
import {
  COPY_VIOLATION_REFUSAL,
  checkCopyViolation,
} from "@/lib/rag/copy-guard";
import { generateEmbedding } from "@/lib/rag/embeddings";
import { evaluateResponse } from "@/lib/rag/eval";
import { EXTRACTION_REFUSAL, isExtractionAttempt } from "@/lib/rag/input-guard";
import {
  isRetrievalCertain,
  shouldSkipRetrieval,
} from "@/lib/rag/pleasantry-classify";
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
import { checkChatRateLimit, getClientIp } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { isChatOwner } from "@/lib/security/chat-access";
import { isAllowedMutatingOrigin } from "@/lib/security/origin";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";
import type { ChatMessage } from "@/lib/types";
import { chatRequestSchema, extractMessageText } from "./schema";

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

function shouldPrewarmEmbedding(
  isFirstMessage: boolean,
  userText: string
): boolean {
  return isFirstMessage && isRetrievalCertain(userText);
}

export async function DELETE(request: Request) {
  if (!isAllowedMutatingOrigin(request.headers)) {
    logSecurityEvent("origin_denied", { surface: "chat_delete" });
    return new ChatbotError("forbidden:chat").toResponse();
  }

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

  if (!isChatOwner(chat, userId)) {
    logSecurityEvent("ownership_denied", {
      surface: "chat_delete",
      chatId,
      userId,
    });
    return new ChatbotError("forbidden:chat").toResponse();
  }

  await deleteChatById(chatId, userId);

  return Response.json({ success: true });
}

export async function POST(request: Request) {
  if (!isAllowedMutatingOrigin(request.headers)) {
    logSecurityEvent("origin_denied", { surface: "chat" });
    return new ChatbotError("forbidden:chat").toResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

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
    const clientIp = getClientIp(request);

    if (!checkChatRateLimit(userId, clientIp)) {
      logSecurityEvent("rate_limit", { chatId, userId, ip: clientIp });
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    // Only prewarm the embedding when cheap heuristics already guarantee
    // retrieval will run. This keeps the parallel head start for real questions
    // while avoiding a wasted embedding API call when `shouldSkipRetrieval`
    // ends up true for greetings/thanks/junk.
    const earlyEmbeddingPromise = shouldPrewarmEmbedding(
      isFirstMessage,
      userText
    )
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

    if (existingChat && !isChatOwner(existingChat, userId)) {
      logSecurityEvent("ownership_denied", {
        surface: "chat_post",
        chatId,
        userId,
      });
      return new ChatbotError("forbidden:chat").toResponse();
    }

    const isNewChat = !existingChat;

    if (isFirstMessage && existingChat) {
      priorMessages = await getMessagesByChatId(chatId);
    }

    if (isNewChat) {
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

    if (isExtractionAttempt(userText)) {
      logSecurityEvent("input_guard", { chatId, userId });
      earlyEmbeddingPromise?.catch(() => {
        /* discarded — extraction attempt short-circuits retrieval */
      });
      await saveMessage({
        id: userMessageId,
        chat_id: chatId,
        role: "user",
        content: userText,
      });
      const stream = createStaticReplyStream({
        chatId,
        text: EXTRACTION_REFUSAL,
        isNewChat,
        userText,
        showNoContextNotice: true,
      });
      return createUIMessageStreamResponse({ stream });
    }

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
    }).catch(() => undefined);

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
    }).catch(() => undefined);

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
            const copyCheck = checkCopyViolation(text, chunks);
            const finalText = copyCheck.violated
              ? COPY_VIOLATION_REFUSAL
              : text;

            if (copyCheck.violated) {
              logSecurityEvent("copy_guard", {
                chatId,
                userId,
                maxConsecutive: copyCheck.maxConsecutive,
                wordOverlapRatio: copyCheck.wordOverlapRatio,
              });
            }

            let finalSources: typeof sources | null = sources;
            if (copyCheck.violated) {
              finalSources = [];
            } else if (skipRetrieval) {
              finalSources = null;
            }

            const assistantMessageId = randomUUID();
            await saveMessage({
              id: assistantMessageId,
              chat_id: chatId,
              role: "assistant",
              content: finalText,
              sources: finalSources,
            });

            if (
              RESPONSE_EVAL_ENABLED &&
              chunks.length > 0 &&
              !copyCheck.violated
            ) {
              const scores = await evaluateResponse({
                question: userText,
                answer: finalText,
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

            if (isNewChat) {
              await updateChatTitle(chatId, await generateChatTitle(userText));
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
