import { supabase } from "../db/supabase";
import { generateEmbedding } from "./embeddings";
import {
  type ChunkMetadata,
  DEFAULT_MIN_SIMILARITY,
  filterByRelevance,
  type RetrievedChunk,
} from "./format";

export type { ChatSource, ChunkMetadata, RetrievedChunk } from "./format";
export {
  chunkSourceLabel,
  chunksToSources,
  filterByRelevance,
  formatChunksForPrompt,
  hasBookSource,
} from "./format";

// Raw row shape returned by the match_content_chunks_hybrid RPC.
interface HybridRow {
  id: string;
  content: string;
  source: string;
  title: string;
  url: string | null;
  topic: string | null;
  metadata: ChunkMetadata | null;
  similarity: number;
  rrf_score: number;
}

export interface RetrieveOptions {
  /** How many candidates to ask the RPC for (we send the best `topK` onward). */
  matchCount?: number;
  /** How many of the fused candidates to keep for the prompt. */
  topK?: number;
  sourceFilter?: string[] | null;
  rrfK?: number;
  /** Cosine-similarity floor; below it a chunk is treated as off-topic. */
  minSimilarity?: number;
}

const DEFAULT_MATCH_COUNT = 12;
const DEFAULT_TOP_K = 8;

export async function retrieveRelevantChunks(
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const {
    matchCount = DEFAULT_MATCH_COUNT,
    topK = DEFAULT_TOP_K,
    sourceFilter = null,
    rrfK = 50,
    minSimilarity = DEFAULT_MIN_SIMILARITY,
  } = options;

  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_content_chunks_hybrid", {
    query_text: query,
    query_embedding: queryEmbedding,
    match_count: matchCount,
    rrf_k: rrfK,
    source_filter: sourceFilter,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  const rows = (data ?? []) as HybridRow[];
  const chunks = rows.map((row) => ({
    id: row.id,
    content: row.content,
    source: row.source,
    title: row.title,
    url: row.url,
    topic: row.topic,
    metadata: row.metadata ?? {},
    similarity: row.similarity,
    rrfScore: row.rrf_score,
  }));

  // Apply the relevance floor before trimming so we keep up to `topK`
  // genuinely-relevant chunks; an all-off-topic query yields [].
  return filterByRelevance(chunks, minSimilarity).slice(0, topK);
}
