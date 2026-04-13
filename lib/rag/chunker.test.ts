import { describe, expect, it } from "vitest";
import { chunkText } from "./chunker";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const text = "This is a short paragraph that fits in one chunk.";
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("splits long text into multiple chunks", () => {
    // Build text exceeding the default 600-token limit (~460 words -> ~600 tokens)
    const paragraph = "word ".repeat(80).trim(); // ~80 words -> ~104 tokens per paragraph
    const longText = Array.from({ length: 8 }, () => paragraph).join("\n\n");

    const chunks = chunkText(longText);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("preserves all content across chunks (no text lost)", () => {
    const paragraph = "The quick brown fox jumps over the lazy dog. ".repeat(10).trim();
    const longText = Array.from({ length: 8 }, (_, i) => `Paragraph ${i + 1}: ${paragraph}`).join("\n\n");

    const chunks = chunkText(longText);

    // Collect all words that appear in chunks
    const chunkWords = new Set(chunks.join(" ").split(/\s+/));

    // Every word from the original text should appear in at least one chunk
    for (const word of longText.split(/\s+/)) {
      expect(chunkWords.has(word)).toBe(true);
    }
  });

  it("returns the original text unchanged when it fits in one chunk", () => {
    const text = "Short sentence one.\n\nShort sentence two.";
    const chunks = chunkText(text, { maxTokens: 600, overlapTokens: 75 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("respects custom maxTokens option", () => {
    // With a tiny maxTokens, even a moderate text must be split
    const text = Array.from({ length: 5 }, (_, i) => `Paragraph ${i + 1} with some words here.`).join("\n\n");
    const chunksSmall = chunkText(text, { maxTokens: 10, overlapTokens: 0 });
    const chunksLarge = chunkText(text, { maxTokens: 600, overlapTokens: 0 });

    expect(chunksSmall.length).toBeGreaterThan(chunksLarge.length);
  });
});
