import { describe, expect, it } from "vitest";
import {
  type BookSection,
  buildContextualHeader,
  chunkBook,
  chunkSection,
  estimateTokens,
  splitIntoUnits,
} from "./book-chunker";

const SMALL_OPTS = { maxTokens: 40, minTokens: 20, overlapTokens: 8 };

function makeSection(overrides: Partial<BookSection> = {}): BookSection {
  return {
    chapterNumber: 3,
    chapterTitle: "Difficult Conversations",
    sectionTitle: "At Work",
    pageStart: 72,
    pageEnd: 74,
    text: "",
    ...overrides,
  };
}

describe("estimateTokens", () => {
  it("scales with word count", () => {
    expect(estimateTokens("one two three")).toBe(Math.ceil(3 * 1.3));
    expect(estimateTokens("   ")).toBe(0);
  });
});

describe("splitIntoUnits", () => {
  it("treats blank-line-separated paragraphs as units", () => {
    const units = splitIntoUnits("First para.\n\nSecond para.");
    expect(units).toHaveLength(2);
    expect(units.every((u) => !u.atomic)).toBe(true);
  });

  it("keeps a Q&A pair together as one atomic unit", () => {
    const text =
      "Q: How do I decline an invitation?\n\nA: You might try a warm, brief note.\n\nIt softens the no.";
    const units = splitIntoUnits(text);
    expect(units).toHaveLength(1);
    expect(units[0].atomic).toBe(true);
    expect(units[0].text).toContain("How do I decline");
    expect(units[0].text).toContain("softens the no");
  });

  it("separates consecutive Q&A pairs", () => {
    const text =
      "Q: First question?\n\nA: First answer.\n\nQuestion: Second one?\n\nA: Second answer.";
    const units = splitIntoUnits(text);
    expect(units).toHaveLength(2);
    expect(units[0].text).toContain("First question");
    expect(units[1].text).toContain("Second one");
  });
});

describe("chunkSection", () => {
  it("returns a single chunk when the section fits", () => {
    const section = makeSection({ text: "Short body that easily fits." });
    expect(chunkSection(section)).toEqual(["Short body that easily fits."]);
  });

  it("returns no chunks for empty text", () => {
    expect(chunkSection(makeSection({ text: "   " }))).toEqual([]);
  });

  it("splits a long section into multiple chunks within the token bound", () => {
    const para = `${"word ".repeat(30).trim()}.`;
    const text = Array.from({ length: 6 }, () => para).join("\n\n");
    const chunks = chunkSection(makeSection({ text }), SMALL_OPTS);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Allow a little slack for the single-sentence fallback path.
      expect(estimateTokens(chunk)).toBeLessThanOrEqual(
        SMALL_OPTS.maxTokens * 1.5
      );
    }
  });

  it("never splits an atomic Q&A pair even when it exceeds maxTokens", () => {
    const longAnswer = "word ".repeat(60).trim();
    const text = `Q: A weighty question?\n\nA: ${longAnswer}`;
    const chunks = chunkSection(makeSection({ text }), SMALL_OPTS);
    const qaChunks = chunks.filter((c) => c.includes("weighty question"));
    expect(qaChunks).toHaveLength(1);
    expect(qaChunks[0]).toContain(longAnswer);
  });

  it("carries overlap text into the next chunk", () => {
    const sentences = Array.from(
      { length: 8 },
      (_, i) => `Sentence number ${i} here.`
    );
    const text = sentences.join("\n\n");
    const chunks = chunkSection(makeSection({ text }), SMALL_OPTS);
    expect(chunks.length).toBeGreaterThan(1);
    // Some trailing content of chunk N should reappear at the start of chunk N+1.
    const firstWords = (s: string) => s.split(/\s+/).slice(0, 3).join(" ");
    const overlapFound = chunks.some((chunk, i) =>
      i > 0 ? chunks[i - 1].includes(firstWords(chunk)) : false
    );
    expect(overlapFound).toBe(true);
  });
});

describe("chunkBook", () => {
  it("attaches section metadata and a global chunk index", () => {
    const sections: BookSection[] = [
      makeSection({ text: "Chapter three body.", chapterNumber: 3 }),
      makeSection({
        text: "Chapter four body.",
        chapterNumber: 4,
        chapterTitle: "Hosting",
        sectionTitle: null,
        pageStart: 90,
        pageEnd: 92,
      }),
    ];
    const chunks = chunkBook(sections);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[0].chapterNumber).toBe(3);
    expect(chunks[1].chapterTitle).toBe("Hosting");
    expect(chunks[1].pageStart).toBe(90);
  });

  it("merges consecutive small chunks within the same chapter", () => {
    const sections: BookSection[] = [
      makeSection({
        text: "First small section.",
        sectionTitle: "A",
        pageStart: 10,
        pageEnd: 10,
      }),
      makeSection({
        text: "Second small section.",
        sectionTitle: "B",
        pageStart: 11,
        pageEnd: 12,
      }),
    ];
    const chunks = chunkBook(sections);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("First small section.");
    expect(chunks[0].content).toContain("Second small section.");
    // Keeps the first section's title; widens the page span across the merge.
    expect(chunks[0].sectionTitle).toBe("A");
    expect(chunks[0].pageStart).toBe(10);
    expect(chunks[0].pageEnd).toBe(12);
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it("does not merge across chapters", () => {
    const sections: BookSection[] = [
      makeSection({ text: "Tiny chapter three.", chapterNumber: 3 }),
      makeSection({ text: "Tiny chapter four.", chapterNumber: 4 }),
    ];
    expect(chunkBook(sections)).toHaveLength(2);
  });

  it("stops merging once maxTokens would be exceeded", () => {
    const big = `${"word ".repeat(20).trim()}.`;
    const sections: BookSection[] = Array.from({ length: 4 }, () =>
      makeSection({ text: big, chapterNumber: 5 })
    );
    // maxTokens 40 => ~26 tokens each, so at most one pair fits per merged chunk.
    const chunks = chunkBook(sections, SMALL_OPTS);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(estimateTokens(chunk.content)).toBeLessThanOrEqual(
        SMALL_OPTS.maxTokens
      );
    }
  });
});

describe("buildContextualHeader", () => {
  it("includes chapter, title, and section", () => {
    const header = buildContextualHeader(
      {
        chapterNumber: 4,
        chapterTitle: "Hosting",
        sectionTitle: "Awkward guests",
      },
      "Was It Something I Said?"
    );
    expect(header).toBe(
      'From Was It Something I Said?, Chapter 4, "Hosting", on Awkward guests.'
    );
  });

  it("degrades gracefully without chapter metadata", () => {
    const header = buildContextualHeader(
      { chapterNumber: null, chapterTitle: null, sectionTitle: null },
      "Was It Something I Said?"
    );
    expect(header).toBe("From Was It Something I Said?.");
  });
});
