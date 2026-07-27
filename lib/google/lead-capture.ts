type TranscriptMessage = {
  role: string;
  content: string;
};

const TRANSCRIPT_SUBJECT = "Your conversation with Elevate Etiquette";

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
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google Sheets append failed with status ${response.status}`
    );
  }
}

export async function deliverLeadCapture({
  chatId,
  email,
  messages,
}: {
  chatId: string;
  email: string;
  messages: TranscriptMessage[];
}): Promise<void> {
  const accessToken = await getGoogleAccessToken();
  const capturedAt = new Date().toISOString();

  await Promise.all([
    appendSubscriber({ accessToken, chatId, email, capturedAt }),
    sendTranscriptEmail({ accessToken, email, messages }),
  ]);
}
