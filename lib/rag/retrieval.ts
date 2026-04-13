import { supabase } from "../db/supabase";
import { generateEmbedding } from "./embeddings";

export interface RetrievedChunk {
  id: string;
  content: string;
  source: string;
  title: string;
  url: string | null;
  topic: string | null;
  similarity: number;
}

export async function retrieveRelevantChunks(
  query: string,
  topK = 6
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_content_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK,
    match_threshold: 0.3,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }

  return data ?? [];
}

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant content found in Alison's published writings.";
  }

  return chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}: ${chunk.title} (${chunk.source})]:\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}
