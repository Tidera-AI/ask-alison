// Structure-aware chunker for the book corpus.
//
// Unlike the generic paragraph chunker (`chunker.ts`), this operates on
// pre-segmented sections so chapter/section metadata travels with each chunk
// and Q&A pairs are never split across a chunk boundary. The PDF parsing and
// cleaning live in `scripts/ingest-book.ts`; this module is pure and testable.

export interface BookSection {
  chapterNumber: number | null;
  chapterTitle: string | null;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  text: string;
}

export interface BookChunk {
  content: string;
  chapterNumber: number | null;
  chapterTitle: string | null;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  chunkIndex: number;
}

export interface BookChunkOptions {
  maxTokens: number;
  minTokens: number;
  overlapTokens: number;
}

export const DEFAULT_BOOK_CHUNK_OPTIONS: BookChunkOptions = {
  maxTokens: 700,
  minTokens: 450,
  overlapTokens: 75,
};

// Matches the estimator used elsewhere in the RAG pipeline (chunker.ts).
export function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

const QUESTION_MARKER = /^\s*(?:Q|Question)\s*[:.)]/i;

interface ContentUnit {
  text: string;
  atomic: boolean; // Q&A pairs are atomic: never split unless alone they exceed max.
}

// Split a section into units: Q&A pairs (question + following answer paragraphs)
// stay together; everything else becomes a plain paragraph unit.
export function splitIntoUnits(text: string): ContentUnit[] {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const units: ContentUnit[] = [];
  let pending: string[] | null = null;

  const flushPending = () => {
    if (pending && pending.length > 0) {
      units.push({ text: pending.join("\n\n"), atomic: true });
    }
    pending = null;
  };

  for (const paragraph of paragraphs) {
    if (QUESTION_MARKER.test(paragraph)) {
      flushPending();
      pending = [paragraph];
      continue;
    }

    if (pending) {
      pending.push(paragraph);
      continue;
    }

    units.push({ text: paragraph, atomic: false });
  }

  flushPending();
  return units;
}

function splitSentences(text: string): string[] {
  return (
    text
      .match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)
      ?.map((s) => s.trim())
      .filter(Boolean) ?? [text]
  );
}

// Pack units into chunks up to maxTokens, carrying ~overlapTokens of trailing
// text into the next chunk. A unit larger than maxTokens is sentence-split
// (unless atomic — a long Q&A pair is emitted whole to preserve the pair).
function packUnits(units: ContentUnit[], options: BookChunkOptions): string[] {
  const { maxTokens, overlapTokens } = options;
  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    chunks.push(current.join("\n\n"));
    if (overlapTokens > 0) {
      const carried: string[] = [];
      let carriedTokens = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const t = estimateTokens(current[i]);
        // Stop once the budget is exceeded. If even the last unit alone is
        // larger than the overlap budget, carry nothing — carrying it would
        // double a full unit into the next chunk.
        if (carriedTokens + t > overlapTokens) {
          break;
        }
        carried.unshift(current[i]);
        carriedTokens += t;
      }
      current = carried;
      currentTokens = carriedTokens;
    } else {
      current = [];
      currentTokens = 0;
    }
  };

  const addPiece = (piece: string) => {
    const tokens = estimateTokens(piece);
    if (currentTokens + tokens > maxTokens && current.length > 0) {
      flush();
    }
    current.push(piece);
    currentTokens += tokens;
  };

  for (const unit of units) {
    const unitTokens = estimateTokens(unit.text);

    if (unitTokens <= maxTokens || unit.atomic) {
      // Fits, or atomic Q&A pair we refuse to split.
      if (currentTokens + unitTokens > maxTokens && current.length > 0) {
        flush();
      }
      current.push(unit.text);
      currentTokens += unitTokens;
      continue;
    }

    // Oversized non-atomic paragraph: split by sentence.
    for (const sentence of splitSentences(unit.text)) {
      addPiece(sentence);
    }
  }

  if (current.length > 0) {
    chunks.push(current.join("\n\n"));
  }

  return chunks;
}

// Chunk a single section into one or more content strings.
export function chunkSection(
  section: BookSection,
  options: BookChunkOptions = DEFAULT_BOOK_CHUNK_OPTIONS
): string[] {
  const text = section.text.trim();
  if (!text) {
    return [];
  }
  if (estimateTokens(text) <= options.maxTokens) {
    return [text];
  }
  return packUnits(splitIntoUnits(text), options);
}

// Coalesce consecutive small chunks within the same chapter up toward
// minTokens, without crossing maxTokens. The structure-aware splitter (and the
// section-heading heuristic) can over-segment a chapter into many tiny chunks;
// this restores chunks of a useful retrieval size. The earlier chunk's
// section_title is kept and the page span is widened across the merge.
function mergeSmallChunks(
  chunks: BookChunk[],
  options: BookChunkOptions
): BookChunk[] {
  const { minTokens, maxTokens } = options;
  const merged: BookChunk[] = [];

  for (const chunk of chunks) {
    const prev = merged.at(-1);
    const combinedTokens = prev
      ? estimateTokens(`${prev.content}\n\n${chunk.content}`)
      : 0;

    const canMerge =
      prev !== undefined &&
      prev.chapterNumber === chunk.chapterNumber &&
      estimateTokens(prev.content) < minTokens &&
      combinedTokens <= maxTokens;

    if (canMerge) {
      merged[merged.length - 1] = {
        ...prev,
        content: `${prev.content}\n\n${chunk.content}`,
        sectionTitle: prev.sectionTitle ?? chunk.sectionTitle,
        pageStart: prev.pageStart ?? chunk.pageStart,
        pageEnd: chunk.pageEnd ?? prev.pageEnd,
      };
      continue;
    }

    merged.push(chunk);
  }

  // Reassign a contiguous, stable global index after merging.
  return merged.map((chunk, chunkIndex) => ({ ...chunk, chunkIndex }));
}

// Chunk the whole book, carrying chapter/section/page metadata onto each chunk
// and assigning a global, stable chunk index.
export function chunkBook(
  sections: BookSection[],
  options: BookChunkOptions = DEFAULT_BOOK_CHUNK_OPTIONS
): BookChunk[] {
  const chunks: BookChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    for (const content of chunkSection(section, options)) {
      chunks.push({
        content,
        chapterNumber: section.chapterNumber,
        chapterTitle: section.chapterTitle,
        sectionTitle: section.sectionTitle,
        pageStart: section.pageStart,
        pageEnd: section.pageEnd,
        chunkIndex,
      });
      chunkIndex += 1;
    }
  }

  return mergeSmallChunks(chunks, options);
}

// Anthropic-style contextual header prepended to a chunk BEFORE embedding
// (improves hybrid retrieval). Stored separately from the clean display text.
export function buildContextualHeader(
  chunk: Pick<BookChunk, "chapterNumber" | "chapterTitle" | "sectionTitle">,
  bookTitle: string
): string {
  const parts: string[] = [`From ${bookTitle}`];
  if (chunk.chapterNumber !== null) {
    const label = chunk.chapterTitle
      ? `Chapter ${chunk.chapterNumber}, "${chunk.chapterTitle}"`
      : `Chapter ${chunk.chapterNumber}`;
    parts.push(label);
  } else if (chunk.chapterTitle) {
    parts.push(chunk.chapterTitle);
  }
  if (chunk.sectionTitle) {
    parts.push(`on ${chunk.sectionTitle}`);
  }
  return `${parts.join(", ")}.`;
}
