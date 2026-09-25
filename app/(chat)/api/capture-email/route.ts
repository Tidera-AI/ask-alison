import { z } from "zod";
import { requiresEmailGate } from "@/lib/chat/email-gate";
import { resolveTranscriptSource } from "@/lib/chat/transcript-source";
import {
  claimUserEmail,
  countUserMessagesForUser,
  findLatestChatWithMessages,
  getChatById,
  getMessagesByChatId,
  getOrCreateUser,
  getUserById,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  deliverLeadCapture,
  type LeadDeliveryResult,
} from "@/lib/google/lead-capture";
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

const CAPTURED = { success: true, captured: true } as const;

/** Per-step outcome for reconciling the Sheet and transcripts by hand. */
function logLeadDelivery(
  detail: { userId: string; chatId: string },
  result: LeadDeliveryResult
): void {
  const ok =
    result.sheet.status === "delivered" &&
    result.transcript.status === "delivered";
  const line = JSON.stringify({
    type: "lead_delivery",
    ok,
    ...detail,
    sheet: result.sheet,
    transcript: result.transcript,
    at: new Date().toISOString(),
  });
  if (ok) {
    console.info(line);
  } else {
    console.error(line);
  }
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // Session cookies are SameSite=None for the iframe widget, so without this
  // a cross-site page could submit its own address and receive the visitor's
  // transcript.
  if (!isAllowedMutatingOrigin(request.headers)) {
    logSecurityEvent("origin_denied", { surface: "capture_email" });
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const parsed = captureEmailSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    return new ChatbotError("bad_request:email_gate").toResponse();
  }
  const email = parsed.data.email.toLowerCase();

  try {
    const userId = await getOrCreateSessionUserId();
    const [user, chat] = await Promise.all([
      getOrCreateUser(userId),
      getChatById(parsed.data.chatId),
    ]);

    if (chat && chat.user_id !== userId) {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    const previous: string | null = user.email ?? null;
    if (previous === email) {
      await setPersistentSessionUserId(userId);
      return Response.json(CAPTURED);
    }

    // Only a session the chat route would actually gate may capture, so a
    // fresh session can't manufacture leads or trigger transcript emails.
    // A gate can also go stale while shown (e.g. the visitor deletes the chat
    // holding their free question); report that without side effects so the
    // client can dismiss the gate and resume. A visitor who already gave an
    // email may correct it.
    if (previous === null) {
      const userMessageCount = await countUserMessagesForUser(userId);
      if (
        !requiresEmailGate({
          email: null,
          userMessageCountInSession: userMessageCount,
        })
      ) {
        return Response.json({ success: true, captured: false });
      }
    }

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

    // Save the lead before touching Google: a Google outage or bad config
    // then costs the transcript email / Sheet row, not the lead or the
    // visitor's ability to continue.
    const claimed = await claimUserEmail(userId, previous, email);
    if (!claimed) {
      // A concurrent request changed the email first.
      const current = await getUserById(userId);
      if (current?.email === email) {
        await setPersistentSessionUserId(userId);
        return Response.json(CAPTURED);
      }
      return new ChatbotError("internal:email_gate").toResponse();
    }
    await setPersistentSessionUserId(userId);

    const result = await deliverLeadCapture({
      chatId: transcript.chatId,
      email,
      messages: transcript.messages,
    });
    logLeadDelivery({ userId, chatId: transcript.chatId }, result);

    return Response.json(CAPTURED);
  } catch (error) {
    console.error("Capture email error:", error);
    return new ChatbotError("internal:chat").toResponse();
  }
}
