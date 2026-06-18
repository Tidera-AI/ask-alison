// Pure formatting + types for retrieved chunks. Kept free of the supabase
// client so it can be unit-tested without DB env vars.

export interface ChunkMetadata {
  book_title?: string;
  author?: string;
  chapter_number?: number | null;
  chapter_title?: string | null;
  section_title?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  chunk_index?: number;
  authority_tier?: string;
  content_version?: string;
  is_retrievable?: boolean;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  source: string;
  title: string;
  url: string | null;
  topic: string | null;
  metadata: ChunkMetadata;
  similarity: number;
  rrfScore: number;
}

function pageLabel(meta: ChunkMetadata): string | null {
  if (meta.page_start == null) {
    return null;
  }
  if (meta.page_end != null && meta.page_end !== meta.page_start) {
    return `pp. ${meta.page_start}–${meta.page_end}`;
  }
  return `p. ${meta.page_start}`;
}

// Rich, human-readable source label. Book chunks cite chapter + pages;
// everything else keeps the simple "Title (source)" form.
export function chunkSourceLabel(chunk: RetrievedChunk): string {
  if (chunk.source !== "book") {
    return `${chunk.title} (${chunk.source})`;
  }

  const meta = chunk.metadata;
  const bookTitle = meta.book_title ?? chunk.title;
  const parts: string[] = [bookTitle];

  if (meta.chapter_number != null) {
    parts.push(
      meta.chapter_title
        ? `Ch. ${meta.chapter_number} "${meta.chapter_title}"`
        : `Ch. ${meta.chapter_number}`
    );
  } else if (meta.chapter_title) {
    parts.push(meta.chapter_title);
  }

  const pages = pageLabel(meta);
  if (pages) {
    parts.push(pages);
  }

  return parts.join(", ");
}

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant content found in Alison's published writings.";
  }

  return chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunkSourceLabel(chunk)}]:\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}

export function hasBookSource(chunks: RetrievedChunk[]): boolean {
  return chunks.some((chunk) => chunk.source === "book");
}

// Default cosine-similarity floor below which a chunk is treated as off-topic.
// Relevant text-embedding-3-small matches sit ~0.3–0.6; off-topic ~0.05–0.15.
export const DEFAULT_MIN_SIMILARITY = 0.2;

// Drop chunks whose semantic similarity is below the floor. Hybrid (RRF)
// retrieval otherwise always returns the top-N rows regardless of relevance,
// which would silently defeat the "admit when context is insufficient" rule.
// Returning [] here lets formatChunksForPrompt emit its no-context fallback.
export function filterByRelevance(
  chunks: RetrievedChunk[],
  minSimilarity: number = DEFAULT_MIN_SIMILARITY
): RetrievedChunk[] {
  return chunks.filter((chunk) => chunk.similarity >= minSimilarity);
}
