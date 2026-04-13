"use server";

import { generateText, type UIMessage } from "ai";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import { deleteChatById } from "@/lib/db/queries";
import { getTextFromMessage } from "@/lib/utils";

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text } = await generateText({
    model: getTitleModel(),
    system: titlePrompt,
    prompt: getTextFromMessage(message),
  });
  return text
    .replace(/^[#*"\s]+/, "")
    .replace(/["]+$/, "")
    .trim();
}

export async function deleteChatByIdAction(chatId: string) {
  await deleteChatById(chatId);
}

// Stub — no auth/visibility in this project
export async function deleteTrailingMessages(_params: { id: string }) {
  // No-op: auth removed
}

// Stub — no auth/visibility in this project
export async function updateChatVisibility(_params: {
  chatId: string;
  visibility: string;
}) {
  // No-op: auth removed
}
