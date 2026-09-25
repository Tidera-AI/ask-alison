type TranscriptMessage = {
  role: string;
  content: string;
};

const TRANSCRIPT_SUBJECT = "Your conversation with Elevate Etiquette";

/** Delivery runs inline in the request, so every Google call is bounded. */
const OAUTH_TIMEOUT_MS = 2000;
const STEP_TIMEOUT_MS = 3000;

/** `timeout` means the outcome is unknown: Google may still have accepted it. */
export type DeliveryStatus = "delivered" | "failed" | "timeout" | "skipped";

export type DeliveryStepResult = {
  status: DeliveryStatus;
  durationMs: number;
  /** Sanitized: status codes and config names only, never addresses. */
  error?: string;
};

export type LeadDeliveryResult = {
  sheet: DeliveryStepResult;
  transcript: DeliveryStepResult;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getGoogleAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: getRequiredEnv("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("access_token" in payload) ||
    typeof payload.access_token !== "string"
  ) {
    throw new Error("Google OAuth response did not include an access token");
  }

  return payload.access_token;
}

function formatTranscript(messages: TranscriptMessage[]): string {
  return messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant"
    )
    .map((message) => {
      const speaker = message.role === "user" ? "You" : "Elevate Etiquette";
      return `${speaker}:\n${message.content}`;
    })
    .join("\n\n");
}

function buildEmail({
  email,
  from,
  messages,
}: {
  email: string;
  from: string;
  messages: TranscriptMessage[];
}): string {
  const transcript = formatTranscript(messages);
  const body = [
    "Hi there,",
    "",
    "Thanks for chatting with Elevate Etiquette. As promised, here's a copy of our conversation for your records.",
    "",
    "We've also added you to our email list so we can stay in touch and share etiquette tips, updates, and resources. We'd love to have you.",
    "",
    "You can unsubscribe at any time — no hard feelings.",
    "",
    "Warmly,",
    "Alison — Elevate Etiquette",
    "",
    "Conversation transcript",
    "",
    transcript,
  ].join("\r\n");

  return [
    `From: Elevate Etiquette <${from}>`,
    `Reply-To: ${from}`,
    `To: ${email}`,
    `Subject: ${TRANSCRIPT_SUBJECT}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
}

async function sendTranscriptEmail({
  accessToken,
  email,
  messages,
}: {
  accessToken: string;
  email: string;
  messages: TranscriptMessage[];
}): Promise<void> {
  const from = getRequiredEnv("GOOGLE_SENDER_EMAIL");
  const raw = Buffer.from(buildEmail({ email, from, messages })).toString(
    "base64url"
  );
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(STEP_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(`Gmail send failed with status ${response.status}`);
  }
}

async function appendSubscriber({
  accessToken,
  chatId,
  email,
  capturedAt,
}: {
  accessToken: string;
  chatId: string;
  email: string;
  capturedAt: string;
}): Promise<void> {
  const sheetId = getRequiredEnv("SUBSCRIBER_SHEET_ID");
  const range = encodeURIComponent("'Ask Alison — Subscribers'!A:F");
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [[email, true, "chatbot", chatId, capturedAt, "subscribed"]],
      }),
      signal: AbortSignal.timeout(STEP_TIMEOUT_MS),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google Sheets append failed with status ${response.status}`
    );
  }
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

async function runStep(step: () => Promise<void>): Promise<DeliveryStepResult> {
  const started = Date.now();
  try {
    await step();
    return { status: "delivered", durationMs: Date.now() - started };
  } catch (error) {
    return {
      status: isTimeout(error) ? "timeout" : "failed",
      durationMs: Date.now() - started,
      error: describeError(error),
    };
  }
}

/**
 * Best-effort: never rejects. Adds the subscriber row and sends the
 * transcript independently, reporting each outcome, so one failing (or a
 * missing config) can't hide the other or block the visitor.
 */
export async function deliverLeadCapture({
  chatId,
  email,
  messages,
}: {
  chatId: string;
  email: string;
  messages: TranscriptMessage[];
}): Promise<LeadDeliveryResult> {
  const started = Date.now();
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (error) {
    const skipped: DeliveryStepResult = {
      status: "skipped",
      durationMs: Date.now() - started,
      error: `OAuth ${isTimeout(error) ? "timed out" : "failed"}: ${describeError(error)}`,
    };
    return { sheet: skipped, transcript: skipped };
  }

  const capturedAt = new Date().toISOString();
  const [sheet, transcript] = await Promise.all([
    runStep(() => appendSubscriber({ accessToken, chatId, email, capturedAt })),
    runStep(() => sendTranscriptEmail({ accessToken, email, messages })),
  ]);
  return { sheet, transcript };
}
