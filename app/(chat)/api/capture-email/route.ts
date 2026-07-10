import { z } from "zod";
import { getOrCreateUser, setUserEmail } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import {
  getOrCreateSessionUserId,
  setPersistentSessionUserId,
} from "@/lib/session/anonymous";

const captureEmailSchema = z.object({
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
    await getOrCreateUser(userId);
    await setUserEmail(userId, parsed.data.email.toLowerCase());
    await setPersistentSessionUserId(userId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Capture email error:", error);
    return new ChatbotError("internal:chat").toResponse();
  }
}
