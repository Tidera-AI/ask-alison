import { z } from "zod";
import {
  getChatById,
  getMessagesByChatId,
  getOrCreateUser,
  setUserEmail,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { deliverLeadCapture } from "@/lib/google/lead-capture";
import {
  getOrCreateSessionUserId,
  setPersistentSessionUserId,
} from "@/lib/session/anonymous";

const captureEmailSchema = z.object({
  chatId: z.string().uuid(),
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = captureEmailSchema.safeParse(body);

  if (!parsed.success) {
    return new ChatbotError("bad_request:email_gate").toResponse();
  }

  try {
    const userId = await getOrCreateSessionUserId();
    const [user, chat] = await Promise.all([
      getOrCreateUser(userId),
      getChatById(parsed.data.chatId),
    ]);

    if (!chat || chat.user_id !== userId) {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (user.email) {
      await setPersistentSessionUserId(userId);
      return Response.json({ success: true });
    }

    const email = parsed.data.email.toLowerCase();
    const messages = await getMessagesByChatId(parsed.data.chatId);

    await deliverLeadCapture({
      chatId: parsed.data.chatId,
      email,
      messages,
    });
    await setUserEmail(userId, email);
    await setPersistentSessionUserId(userId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Capture email error:", error);
    return new ChatbotError("internal:chat").toResponse();
  }
}
