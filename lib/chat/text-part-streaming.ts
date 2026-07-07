import type { ChatMessage } from "@/lib/types";

type TextPart = Extract<ChatMessage["parts"][number], { type: "text" }>;

export function isAssistantTextPartStreaming(
  part: TextPart,
  isAssistant: boolean,
  isMessageLoading: boolean
): boolean {
  if (!isAssistant || !isMessageLoading) {
    return false;
  }

  if ("state" in part) {
    return part.state === "streaming";
  }

  return false;
}
