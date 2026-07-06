import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { embedMany, gateway } from "ai";
import { z } from "zod";
import { chunkText } from "@/lib/rag/chunker";
import { contentHash } from "@/lib/rag/hash";
import { logSecurityEvent } from "@/lib/security/audit-log";

const EMBEDDING_MODEL = gateway.textEmbeddingModel(
  "openai/text-embedding-3-small"
);

const ALLOWED_SOURCES = [
  "blog",
  "substack",
  "evie",
  "instagram",
  "knowledge_base",
  "book",
] as const;

const MAX_CONTENT_BYTES = 512_000;
const MAX_TITLE_LENGTH = 200;

const ingestSchema = z.object({
  content: z.string().min(1).max(MAX_CONTENT_BYTES),
  source: z.enum(ALLOWED_SOURCES),
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

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
  if (!isAuthorized(request.headers.get("x-ingest-secret"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logSecurityEvent("ingest_rejected", { reason: "invalid_json" });
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    logSecurityEvent("ingest_rejected", { reason: "validation_failed" });
    return Response.json({ error: "Invalid ingest payload" }, { status: 400 });
  }

  const { content, source, title } = parsed.data;

  const chunks = chunkText(content, { maxTokens: 600, overlapTokens: 75 });
  const hashes = chunks.map((c) => contentHash(c));

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
        { error: "Insert failed", inserted },
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
