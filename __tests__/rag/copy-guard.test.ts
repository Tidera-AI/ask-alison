import { describe, expect, it } from "vitest";
import { checkCopyViolation } from "@/lib/rag/copy-guard";
import type { RetrievedChunk } from "@/lib/rag/format";

const bookChunk: RetrievedChunk = {
  id: "1",
  content:
    "When someone offers a sincere apology, accept it with grace and move forward together.",
  source: "book",
  title: "Was It Something I Said?",
  url: null,
  topic: null,
  metadata: {},
  similarity: 0.5,
  rrfScore: 0.1,
};

describe("checkCopyViolation", () => {
  it("flags long verbatim book copying", () => {
    const answer =
      "When someone offers a sincere apology, accept it with grace and move forward together without holding a grudge.";
    const result = checkCopyViolation(answer, [bookChunk]);
    expect(result.violated).toBe(true);
  });

  it("allows paraphrased guidance", () => {
    const answer =
      "If they apologize sincerely, receive it warmly and let the moment pass without lingering resentment.";
    const result = checkCopyViolation(answer, [bookChunk]);
    expect(result.violated).toBe(false);
  });
});
