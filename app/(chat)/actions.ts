"use server";

import { generateText, type UIMessage } from "ai";
import { headers } from "next/headers";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import { deleteChatById, updateChatVisibilityById } from "@/lib/db/queries";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { assertChatOwner } from "@/lib/security/chat-access";
import { isAllowedMutatingOrigin } from "@/lib/security/origin";
import { getOrCreateSessionUserId } from "@/lib/session/anonymous";
import { getTextFromMessage } from "@/lib/utils";

async function assertMutatingRequest(): Promise<string> {
  const headerStore = await headers();
  if (!isAllowedMutatingOrigin(headerStore)) {
    logSecurityEvent("origin_denied", { surface: "server_action" });
    throw new Error("Forbidden");
  }
  return getOrCreateSessionUserId();
}

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
  const userId = await assertMutatingRequest();
  const access = await assertChatOwner(chatId, userId);
  if (!access.ok) {
    logSecurityEvent("ownership_denied", {
      surface: "delete_chat",
      chatId,
      userId,
    });
    throw new Error("Forbidden");
  }
  await deleteChatById(chatId, userId);
}

export async function deleteTrailingMessages(_params: { id: string }) {
  await Promise.resolve();
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
  const userId = await assertMutatingRequest();
  const access = await assertChatOwner(chatId, userId);
  if (!access.ok) {
    logSecurityEvent("ownership_denied", {
      surface: "update_visibility",
      chatId,
      userId,
    });
    throw new Error("Forbidden");
  }
  await updateChatVisibilityById(chatId, userId, visibility);
}
