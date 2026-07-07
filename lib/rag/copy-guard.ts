import type { RetrievedChunk } from "./format";

export const COPY_VIOLATION_REFUSAL =
  "I want to help with etiquette guidance, but I can't reproduce long passages from my book or other published sources. " +
  "Here's a warm nudge to explore the full chapter in *Was It Something I Said?*: https://www.amazon.com/dp/1400350123/";

const BOOK_MAX_CONSECUTIVE = 40;
const ARTICLE_MAX_CONSECUTIVE = 80;
const BOOK_WORD_OVERLAP_RATIO = 0.25;
const MIN_WORD_LENGTH = 4;

export interface CopyCheckResult {
  violated: boolean;
  maxConsecutive: number;
  wordOverlapRatio: number;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function longestConsecutiveOverlap(
  a: string,
  b: string,
  stopAt: number
): number {
  if (!a || !b) {
    return 0;
  }

  let max = 0;
  for (let i = 0; i < a.length && max < stopAt; i++) {
    for (let j = 0; j < b.length && max < stopAt; j++) {
      let run = 0;
      while (
        i + run < a.length &&
        j + run < b.length &&
        a[i + run] === b[j + run]
      ) {
        run += 1;
      }
      if (run > max) {
        max = run;
      }
    }
  }
  return max;
}

function wordOverlapRatio(answer: string, chunks: RetrievedChunk[]): number {
  const answerWords = normalize(answer)
    .split(" ")
    .filter((word) => word.length > MIN_WORD_LENGTH);
  if (answerWords.length === 0) {
    return 0;
  }

  const sourceWords = new Set<string>();
  for (const chunk of chunks) {
    for (const word of normalize(chunk.content).split(" ")) {
      if (word.length > MIN_WORD_LENGTH) {
        sourceWords.add(word);
      }
    }
  }

  let overlap = 0;
  for (const word of answerWords) {
    if (sourceWords.has(word)) {
      overlap += 1;
    }
  }
  return overlap / answerWords.length;
}

export function checkCopyViolation(
  answer: string,
  chunks: RetrievedChunk[]
): CopyCheckResult {
  if (!answer.trim() || chunks.length === 0) {
    return { violated: false, maxConsecutive: 0, wordOverlapRatio: 0 };
  }

  const normalizedAnswer = normalize(answer);
  let maxConsecutive = 0;
  let hasBook = false;

  for (const chunk of chunks) {
    if (chunk.source === "book") {
      hasBook = true;
    }
    const stopAt =
      chunk.source === "book" ? BOOK_MAX_CONSECUTIVE : ARTICLE_MAX_CONSECUTIVE;
    maxConsecutive = Math.max(
      maxConsecutive,
      longestConsecutiveOverlap(
        normalizedAnswer,
        normalize(chunk.content),
        stopAt
      )
    );
  }

  const threshold = hasBook ? BOOK_MAX_CONSECUTIVE : ARTICLE_MAX_CONSECUTIVE;
  const overlap = hasBook ? wordOverlapRatio(answer, chunks) : 0;
  const violated =
    maxConsecutive >= threshold ||
    (hasBook && overlap >= BOOK_WORD_OVERLAP_RATIO);

  return { violated, maxConsecutive, wordOverlapRatio: overlap };
}
