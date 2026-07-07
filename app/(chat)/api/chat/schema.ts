import { z } from "zod";

// Accept both simple { content } and AI SDK v6 { parts } format
const messagePartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const chatRequestSchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    role: z.literal("user"),
    content: z.string().min(1).max(2000).optional(),
    parts: z.array(messagePartSchema).optional(),
  }),
  /** First turn in a chat — skips an empty history fetch on the server. */
  isFirstMessage: z.boolean().optional(),
  selectedChatModel: z.string().optional(),
  selectedVisibilityType: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** Extract the user's text from a message, handling both formats. */
export function extractMessageText(
  message: ChatRequest["message"]
): string | null {
  if (message.content) {
    return message.content;
  }
  if (message.parts?.length) {
    const textPart = message.parts.find((p) => p.type === "text");
    if (textPart) {
      return textPart.text;
    }
  }
  return null;
}
