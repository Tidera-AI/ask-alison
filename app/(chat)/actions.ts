"use server";

import { generateText, type UIMessage } from "ai";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import {
  deleteChatById,
  getChatById,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";
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
  const userId = await getOrCreateSessionUserId();
  const chat = await getChatById(chatId);

  if (!chat || chat.user_id !== userId) {
    return;
  }

  await deleteChatById(chatId);
}

// Stub — no auth/visibility in this project
export async function deleteTrailingMessages(_params: { id: string }) {
  // No-op: auth removed
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: string;
}) {
  if (visibility !== "private" && visibility !== "public") {
    return;
  }
  await getOrCreateSessionUserId();
  await updateChatVisibilityById(chatId, visibility);
}
