import { z } from "zod";
import { requiresEmailGate } from "@/lib/chat/email-gate";
import { resolveTranscriptSource } from "@/lib/chat/transcript-source";
import {
  countUserMessagesForUser,
  findLatestChatWithMessages,
  getChatById,
  getMessagesByChatId,
  getOrCreateUser,
  setUserEmail,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { deliverLeadCapture } from "@/lib/google/lead-capture";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { isAllowedMutatingOrigin } from "@/lib/security/origin";
import {
  getOrCreateSessionUserId,
  setPersistentSessionUserId,
} from "@/lib/session/anonymous";

const captureEmailSchema = z.object({
  chatId: z.string().uuid(),
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  // Session cookies are SameSite=None for the iframe widget, so without this
  // a cross-site page could submit its own address and receive the visitor's
  // transcript.
  if (!isAllowedMutatingOrigin(request.headers)) {
    logSecurityEvent("origin_denied", { surface: "capture_email" });
    return new ChatbotError("forbidden:chat").toResponse();
  }

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

    if (chat && chat.user_id !== userId) {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    if (user.email) {
      await setPersistentSessionUserId(userId);
      return Response.json({ success: true, captured: true });
    }

    // Only a session the chat route would actually gate may capture, so a
    // fresh session can't manufacture leads or trigger transcript emails.
    // A gate can also go stale while shown (e.g. the visitor deletes the chat
    // holding their free question); report that without side effects so the
    // client can dismiss the gate and resume.
    const userMessageCount = await countUserMessagesForUser(userId);
    if (
      !requiresEmailGate({
        email: user.email,
        userMessageCountInSession: userMessageCount,
      })
    ) {
      return Response.json({ success: true, captured: false });
    }

    const email = parsed.data.email.toLowerCase();
    const transcript = await resolveTranscriptSource(
      { requestedChatId: parsed.data.chatId, requestedChat: chat, userId },
      {
        findLatestChatWithMessages,
        getMessages: getMessagesByChatId,
      }
    );
    if (!transcript.ok) {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    await deliverLeadCapture({
      chatId: transcript.chatId,
      email,
      messages: transcript.messages,
    });
    await setUserEmail(userId, email);
    await setPersistentSessionUserId(userId);

    return Response.json({ success: true, captured: true });
  } catch (error) {
    console.error("Capture email error:", error);
    return new ChatbotError("internal:chat").toResponse();
  }
}
