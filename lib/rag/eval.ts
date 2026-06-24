import { generateText } from "ai";
import { getEvalModel } from "../ai/providers";
import { chunkSourceLabel, type RetrievedChunk } from "./format";

// Per-answer quality scores. null = eval was skipped or could not be parsed;
// callers must treat null as "unknown", never as a zero.
export interface ResponseEval {
  faithfulness: number | null;
  relevance: number | null;
}

const EMPTY_EVAL: ResponseEval = { faithfulness: null, relevance: null };

// How much of each chunk to show the grader. The grader only needs enough to
// judge support, and capping keeps the extra call cheap. Retrieval already
// trims to <=8 chunks, so the worst case is bounded.
const MAX_CHUNK_CHARS = 600;

function clampScore(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.max(0, Math.min(1, value));
}

// Defensive parse: the grader is told to return bare JSON, but models sometimes
// wrap it in prose or a ```json fence. Pull the first {...} block and parse it,
// clamping each score to [0,1]. Any failure degrades to nulls rather than
// throwing — this is best-effort instrumentation, not a user-facing path.
export function parseEvalResponse(raw: string): ResponseEval {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return EMPTY_EVAL;
  }

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      faithfulness: clampScore(parsed.faithfulness),
      relevance: clampScore(parsed.relevance),
    };
  } catch {
    return EMPTY_EVAL;
  }
}

function buildGraderContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, i) => {
      const body = chunk.content.slice(0, MAX_CHUNK_CHARS);
      return `[Source ${i + 1}: ${chunkSourceLabel(chunk)}]\n${body}`;
    })
    .join("\n\n---\n\n");
}

const GRADER_SYSTEM =
  "You are a strict evaluator of a retrieval-augmented answer. You are given a " +
  "user question, the source passages that were retrieved, and the assistant's " +
  "answer. Score two things from 0.0 to 1.0:\n" +
  '- "faithfulness": fraction of the answer\'s factual claims that are directly ' +
  "supported by the source passages. General etiquette common-sense and " +
  "empathy do not count against it; fabricated specifics, quotes, or citations " +
  "not in the sources do.\n" +
  '- "relevance": how well the answer actually addresses the question.\n' +
  'Respond with ONLY a JSON object: {"faithfulness": <number>, "relevance": <number>}.';

// Grade a finished answer against the chunks it was grounded on. Never throws;
// on any model/parse failure it returns null scores so the caller can record
// "eval unavailable" without affecting the user.
export async function evaluateResponse(args: {
  question: string;
  answer: string;
  chunks: RetrievedChunk[];
}): Promise<ResponseEval> {
  const { question, answer, chunks } = args;

  if (chunks.length === 0 || answer.trim().length === 0) {
    return EMPTY_EVAL;
  }

  try {
    const result = await generateText({
      model: getEvalModel(),
      system: GRADER_SYSTEM,
      messages: [
        {
          role: "user",
          content:
            `QUESTION:\n${question}\n\n` +
            `RETRIEVED SOURCES:\n${buildGraderContext(chunks)}\n\n` +
            `ASSISTANT ANSWER:\n${answer}`,
        },
      ],
    });

    return parseEvalResponse(result.text);
  } catch {
    return EMPTY_EVAL;
  }
}
