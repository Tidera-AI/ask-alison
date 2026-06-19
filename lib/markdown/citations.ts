import type { ChatSource } from "@/lib/rag/format";

// Pure helpers backing the inline-citation renderer. Kept out of the React
// component so the index→source resolution can be unit-tested in the node env.

export function buildSourceIndex(
  sources: ChatSource[]
): Map<number, ChatSource> {
  return new Map(sources.map((source) => [source.index, source]));
}

export interface ResolvedCitation {
  index: number;
  source: ChatSource;
}

// Resolve a raw `data-index` value (from the rehype-produced <cite> node) to its
// source. Returns null for missing/non-integer indices or numbers that don't
// match a source, so a hallucinated [9] renders as literal text instead.
export function resolveCitation(
  byIndex: Map<number, ChatSource>,
  raw: string | number | undefined
): ResolvedCitation | null {
  // Strings must be pure digits — parseInt would otherwise coerce "1.5" to 1.
  let index: number;
  if (typeof raw === "string") {
    if (!/^\d+$/.test(raw)) {
      return null;
    }
    index = Number.parseInt(raw, 10);
  } else if (typeof raw === "number") {
    index = raw;
  } else {
    return null;
  }

  if (!Number.isInteger(index)) {
    return null;
  }
  const source = byIndex.get(index);
  return source ? { index, source } : null;
}
