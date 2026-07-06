import { generateText } from "ai";
import { getTitleModel } from "../ai/providers";

const CLASSIFY_SYSTEM = `You are a routing classifier for an etiquette chatbot backed by a searchable corpus of published articles and books.

Your only job: decide whether the user's latest message should trigger a corpus search.

## Output format
Reply with exactly one word on a single line — no punctuation, no explanation:
- GREETING — skip search
- SEARCH — run search

## Output GREETING (skip search) only when the message is entirely one of:

**1. Social pleasantry (any spelling or repetition)**
A lone greeting, farewell, or thanks with no other intent — e.g. hi, heyyy, hello, hey there, good morning, bye, thanks, thnx, thx, ty, thank you, ok, okay, cool, got it, you're welcome, how are you (as small talk only).

**2. Buggy or meaningless input**
No coherent question or topic — e.g. lone punctuation (. ??? …), keyboard mash (asdf, jjjj, skdjf), random symbols (hi], @@@), repeated characters (?????), or garbled text that does not form a real question or etiquette topic.

The message must contain nothing beyond pleasantry or noise. Typos and silly spellings still count as pleasantry if the intent is clearly just hi/thanks/bye.

## Output SEARCH (always search) when the message has any of:
- A question or request — even one word: why, how, what, really?
- Pleasantry plus anything else: "thanks for the advice", "hi what should I wear", "ok but what about my boss"
- Any etiquette, social situation, or lifestyle topic
- Off-topic questions (weather, sports, tech, etc.)
- Meta questions about the chatbot, citations like [1], or how a prior reply was written
- References to earlier conversation that ask for new information

## Default rule
If you are unsure whether there is a real question or topic, output SEARCH.

## Examples
Message: heyyy → GREETING
Message: thnks!!! → GREETING
Message: . → GREETING
Message: asdkjf → GREETING
Message: hi] → GREETING
Message: why? → SEARCH
Message: thanks for helping with the gift → SEARCH
Message: how do citations work → SEARCH
Message: wedding dress code → SEARCH
Message: ok what should I say → SEARCH`;

function isPunctuationOnly(query: string): boolean {
  return query.trim().replace(/[^a-zA-Z]/g, "").length === 0;
}

function isShortEnoughToClassify(query: string): boolean {
  const words = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.length <= 3;
}

function isGreetingOutput(text: string): boolean {
  const first = text.trim().split(/\r?\n/, 1)[0]?.trim() ?? "";
  return /^greeting\.?$/i.test(first);
}

async function classifyAsPleasantry(message: string): Promise<boolean> {
  try {
    const { text } = await generateText({
      model: getTitleModel(),
      system: CLASSIFY_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Message:\n${message.trim()}\n\nClassification:`,
        },
      ],
    });
    return isGreetingOutput(text);
  } catch (error) {
    console.error("Pleasantry classification failed, searching:", error);
    return false;
  }
}

/** True when retrieval should be skipped (pleasantry or meaningless input). */
export async function shouldSkipRetrieval(message: string): Promise<boolean> {
  if (isPunctuationOnly(message)) {
    return true;
  }
  if (!isShortEnoughToClassify(message)) {
    return false;
  }
  return await classifyAsPleasantry(message);
}
