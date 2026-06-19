import { generateText } from "ai";
import { getTitleModel } from "../ai/providers";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

const REWRITE_SYSTEM = `You rewrite a user's latest message into a single, standalone search query for retrieving etiquette guidance from a knowledge base.

Rules:
- Resolve pronouns and references using the recent conversation (e.g. "what if it's my boss?" -> "how to handle the situation when it involves my boss").
- Keep it concise: one line, no preamble, no quotes.
- Preserve the core topic and any specific entities mentioned.
- Output ONLY the rewritten query.`;

const MAX_HISTORY_TURNS = 6;

// Fold recent conversation into a standalone retrieval query. Returns the
// original message unchanged when there's no prior context, or if the rewrite
// fails (retrieval should never be blocked by this best-effort step).
export async function buildRetrievalQuery(
  latestMessage: string,
  history: ConversationTurn[]
): Promise<string> {
  const priorTurns = history
    .filter((t) => t.content.trim())
    .slice(-MAX_HISTORY_TURNS);

  if (priorTurns.length === 0) {
    return latestMessage;
  }

  const transcript = priorTurns
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
    .join("\n");

  try {
    const { text } = await generateText({
      model: getTitleModel(),
      system: REWRITE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Recent conversation:\n${transcript}\n\nLatest message:\n${latestMessage}\n\nRewritten standalone query:`,
        },
      ],
    });

    const rewritten = text.trim();
    return rewritten.length > 0 ? rewritten : latestMessage;
  } catch (error) {
    console.error("Query rewrite failed, using raw message:", error);
    return latestMessage;
  }
}
