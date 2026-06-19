import { describe, expect, it } from "vitest";
import {
  chunkSourceLabel,
  chunksToSources,
  filterByRelevance,
  formatChunksForPrompt,
  hasBookSource,
  type RetrievedChunk,
} from "./format";

function chunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    content: "Some etiquette guidance.",
    source: "blog",
    title: "Elevate Etiquette Blog",
    url: null,
    topic: null,
    metadata: {},
    similarity: 0.8,
    rrfScore: 0.03,
    ...overrides,
  };
}

describe("chunkSourceLabel", () => {
  it("uses Title (source) for non-book chunks", () => {
    expect(chunkSourceLabel(chunk())).toBe("Elevate Etiquette Blog (blog)");
  });

  it("builds a rich label for book chunks with chapter + page range", () => {
    const c = chunk({
      source: "book",
      title: "Was It Something I Said?",
      metadata: {
        book_title: "Was It Something I Said?",
        chapter_number: 3,
        chapter_title: "Job Search Edition",
        page_start: 72,
        page_end: 74,
      },
    });
    expect(chunkSourceLabel(c)).toBe(
      'Was It Something I Said?, Ch. 3 "Job Search Edition", pp. 72–74'
    );
  });

  it("uses a single-page label when start equals end", () => {
    const c = chunk({
      source: "book",
      metadata: {
        book_title: "Was It Something I Said?",
        page_start: 50,
        page_end: 50,
      },
    });
    expect(chunkSourceLabel(c)).toBe("Was It Something I Said?, p. 50");
  });

  it("degrades when book metadata is sparse", () => {
    const c = chunk({
      source: "book",
      title: "Was It Something I Said?",
      metadata: {},
    });
    expect(chunkSourceLabel(c)).toBe("Was It Something I Said?");
  });
});

describe("formatChunksForPrompt", () => {
  it("returns a fallback when there are no chunks", () => {
    expect(formatChunksForPrompt([])).toContain("No relevant content");
  });

  it("numbers sources and includes the label + content", () => {
    const out = formatChunksForPrompt([
      chunk(),
      chunk({ id: "x", source: "evie", title: "Evie" }),
    ]);
    expect(out).toContain("[Source 1: Elevate Etiquette Blog (blog)]");
    expect(out).toContain("[Source 2: Evie (evie)]");
    expect(out).toContain("---");
  });
});

describe("hasBookSource", () => {
  it("detects a book chunk", () => {
    expect(hasBookSource([chunk(), chunk({ source: "book" })])).toBe(true);
  });

  it("is false with no book chunks", () => {
    expect(hasBookSource([chunk(), chunk({ source: "substack" })])).toBe(false);
  });
});

describe("filterByRelevance", () => {
  it("drops chunks below the similarity floor", () => {
    const kept = chunk({ id: "keep", similarity: 0.42 });
    const dropped = chunk({ id: "drop", similarity: 0.08 });
    const result = filterByRelevance([kept, dropped], 0.2);
    expect(result.map((c) => c.id)).toEqual(["keep"]);
  });

  it("returns an empty array when every chunk is off-topic", () => {
    const offTopic = [chunk({ similarity: 0.1 }), chunk({ similarity: 0.05 })];
    expect(filterByRelevance(offTopic, 0.2)).toEqual([]);
  });

  it("keeps chunks exactly at the floor", () => {
    expect(filterByRelevance([chunk({ similarity: 0.2 })], 0.2)).toHaveLength(
      1
    );
  });

  it("uses the default floor when none is given", () => {
    expect(filterByRelevance([chunk({ similarity: 0.5 })])).toHaveLength(1);
    expect(filterByRelevance([chunk({ similarity: 0.01 })])).toHaveLength(0);
  });
});

describe("chunksToSources", () => {
  it("returns an empty array for no chunks", () => {
    expect(chunksToSources([])).toEqual([]);
  });

  it("maps a chunk to a serializable source with its display label", () => {
    const source = chunksToSources([
      chunk({ id: "a", source: "blog", title: "Etiquette Blog", url: "/blog" }),
    ]);
    expect(source).toEqual([
      {
        id: "a",
        label: "Etiquette Blog (blog)",
        source: "blog",
        url: "/blog",
      },
    ]);
  });

  it("de-duplicates chunks that share a display label", () => {
    const meta = {
      book_title: "Was It Something I Said?",
      chapter_number: 3,
      chapter_title: "The Apology",
    };
    const sources = chunksToSources([
      chunk({ id: "a", source: "book", metadata: meta }),
      chunk({ id: "b", source: "book", metadata: meta }),
    ]);
    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe("a");
  });

  it("preserves a null url", () => {
    expect(chunksToSources([chunk({ url: null })])[0].url).toBeNull();
  });
});
