import { randomUUID } from "node:crypto";
import { createUIMessageStream, generateText } from "ai";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import { saveMessage, updateChatTitle } from "@/lib/db/queries";
import type { ChatSource } from "@/lib/rag/format";
import type { ChatMessage } from "@/lib/types";

export async function generateChatTitle(userText: string): Promise<string> {
  const result = await generateText({
    model: getTitleModel(),
    system: titlePrompt,
    messages: [{ role: "user" as const, content: userText }],
  });
  return result.text.trim();
}

export function createStaticReplyStream(args: {
  chatId: string;
  text: string;
  isNewChat: boolean;
  userText: string;
  sources?: ChatSource[];
  showNoContextNotice: boolean;
}) {
  const {
    chatId,
    text,
    isNewChat,
    userText,
    sources = [],
    showNoContextNotice,
  } = args;

  return createUIMessageStream<ChatMessage>({
    execute: async ({ writer }) => {
      if (sources.length > 0) {
        writer.write({ type: "data-sources", id: "sources", data: sources });
      } else if (showNoContextNotice) {
        writer.write({
          type: "data-notice",
          id: "notice",
          data: { kind: "no-context" },
        });
      }

      const textPartId = randomUUID();
      writer.write({ type: "text-start", id: textPartId });
      writer.write({ type: "text-delta", id: textPartId, delta: text });
      writer.write({ type: "text-end", id: textPartId });

      await saveMessage({
        id: randomUUID(),
        chat_id: chatId,
        role: "assistant",
        content: text,
        sources,
      });

      if (isNewChat) {
        await updateChatTitle(chatId, await generateChatTitle(userText));
      }
    },
  });
}
