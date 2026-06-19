import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { embedMany, gateway } from "ai";
import { chunkText } from "@/lib/rag/chunker";
import { contentHash } from "@/lib/rag/hash";

const EMBEDDING_MODEL = gateway.textEmbeddingModel(
  "openai/text-embedding-3-small"
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

// Constant-time comparison against the dedicated INGEST_SECRET. Avoids both
// timing leaks and the previous practice of reusing the service-role key.
function isAuthorized(provided: string | null): boolean {
  const expected = process.env.INGEST_SECRET;
  if (!expected || !provided) {
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const batchSize = 50;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: batch,
    });
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

export async function POST(request: Request) {
  // Require the dedicated INGEST_SECRET via header (constant-time compare).
  if (!isAuthorized(request.headers.get("x-ingest-secret"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content, source, title } = body as {
    content: string;
    source: string;
    title: string;
  };

  if (!content || !source || !title) {
    return Response.json(
      { error: "Missing content, source, or title" },
      { status: 400 }
    );
  }

  const chunks = chunkText(content, { maxTokens: 600, overlapTokens: 75 });
  const hashes = chunks.map((c) => contentHash(c));

  // Check which chunks already exist
  const { data: existing } = await supabase
    .from("content_chunk")
    .select("content_hash")
    .in("content_hash", hashes);

  const existingHashes = new Set((existing ?? []).map((e) => e.content_hash));
  const newIndices = hashes
    .map((h, i) => (existingHashes.has(h) ? -1 : i))
    .filter((i) => i >= 0);

  if (newIndices.length === 0) {
    return Response.json({
      message: "All chunks already ingested",
      chunks: chunks.length,
      new: 0,
    });
  }

  const newTexts = newIndices.map((i) => chunks[i]);
  const embeddings = await embedBatch(newTexts);

  const rows = newIndices.map((chunkIdx, embIdx) => ({
    content: chunks[chunkIdx],
    embedding: JSON.stringify(embeddings[embIdx]),
    source,
    title,
    url: null,
    topic: null,
    word_count: chunks[chunkIdx].split(/\s+/).length,
    content_hash: hashes[chunkIdx],
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from("content_chunk").insert(batch);
    if (error) {
      return Response.json(
        { error: `Insert failed: ${error.message}`, inserted },
        { status: 500 }
      );
    }
    inserted += batch.length;
  }

  return Response.json({
    message: `Ingested ${source}`,
    chunks: chunks.length,
    new: newIndices.length,
    inserted,
  });
}
