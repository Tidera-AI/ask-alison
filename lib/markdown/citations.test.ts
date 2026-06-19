import { describe, expect, it } from "vitest";
import type { ChatSource } from "@/lib/rag/format";
import { buildSourceIndex, resolveCitation } from "./citations";

function source(
  index: number,
  overrides: Partial<ChatSource> = {}
): ChatSource {
  return {
    index,
    id: `id-${index}`,
    label: `Source ${index}`,
    source: "book",
    url: null,
    ...overrides,
  };
}

describe("resolveCitation", () => {
  const byIndex = buildSourceIndex([source(1), source(2), source(3)]);

  it("resolves a string index to its source", () => {
    expect(resolveCitation(byIndex, "2")).toEqual({
      index: 2,
      source: source(2),
    });
  });

  it("resolves a numeric index", () => {
    expect(resolveCitation(byIndex, 1)?.source.id).toBe("id-1");
  });

  it("returns null for an out-of-range index (hallucinated marker)", () => {
    expect(resolveCitation(byIndex, "9")).toBeNull();
  });

  it("returns null for non-integer or missing values", () => {
    expect(resolveCitation(byIndex, undefined)).toBeNull();
    expect(resolveCitation(byIndex, "abc")).toBeNull();
    expect(resolveCitation(byIndex, "1.5")).toBeNull();
  });
});

describe("buildSourceIndex", () => {
  it("keys sources by their 1-based index", () => {
    const map = buildSourceIndex([source(1), source(2)]);
    expect(map.get(1)?.id).toBe("id-1");
    expect(map.get(2)?.id).toBe("id-2");
    expect(map.size).toBe(2);
  });
});
