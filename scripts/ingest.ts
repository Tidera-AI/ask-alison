import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { embedMany } from "ai";
import { chunkText } from "../lib/rag/chunker";

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env
  .SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const EMBEDDING_MODEL = "openai/text-embedding-3-small";

interface ContentSource {
  file: string;
  source: "blog" | "substack" | "evie" | "instagram" | "knowledge_base";
  title: string;
}

const CONTENT_DIR = resolve(process.env.CONTENT_DIR ?? "./content");

const sources: ContentSource[] = [
  {
    file: "blog-text-extracted.txt",
    source: "blog",
    title: "Elevate Etiquette Blog",
  },
  { file: "evie_posts_combined.md", source: "evie", title: "Evie Magazine" },
  {
    file: "substack_posts.md",
    source: "substack",
    title: "Substack Newsletter",
  },
  {
    file: "elevateetiquette_captions_all.txt",
    source: "instagram",
    title: "Instagram",
  },
  {
    file: "alison_knowledge_basev3.md",
    source: "knowledge_base",
    title: "Knowledge Base",
  },
];

function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(
      `  Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}...`
    );
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: batch,
    });
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

async function ingest() {
  console.log("Starting content ingestion...\n");

  let totalChunks = 0;
  let skippedChunks = 0;
  let newChunks = 0;

  for (const { file, source, title } of sources) {
    const filePath = resolve(CONTENT_DIR, file);
    let text: string;

    try {
      text = readFileSync(filePath, "utf-8");
    } catch {
      console.warn(`Skipping ${file} — file not found at ${filePath}`);
      continue;
    }

    console.log(`Processing ${file} (${source})...`);
    const wordCount = text.split(/\s+/).length;
    console.log(`  ${wordCount.toLocaleString()} words`);

    const chunks = chunkText(text, { maxTokens: 600, overlapTokens: 75 });
    console.log(`  ${chunks.length} chunks`);
    totalChunks += chunks.length;

    const hashes = chunks.map((c) => contentHash(c));
    const { data: existing } = await supabase
      .from("content_chunk")
      .select("content_hash")
      .in("content_hash", hashes);

    const existingHashes = new Set((existing ?? []).map((e) => e.content_hash));
    const newIndices = hashes
      .map((h, i) => (existingHashes.has(h) ? -1 : i))
      .filter((i) => i >= 0);

    skippedChunks += chunks.length - newIndices.length;

    if (newIndices.length === 0) {
      console.log("  All chunks already ingested, skipping.\n");
      continue;
    }

    console.log(`  ${newIndices.length} new chunks to embed...`);

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

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase.from("content_chunk").insert(batch);
      if (error) {
        console.error(`  Error inserting batch: ${error.message}`);
      }
    }

    newChunks += newIndices.length;
    console.log(`  Inserted ${newIndices.length} chunks.\n`);
  }

  console.log("--- Ingestion Complete ---");
  console.log(`Total chunks processed: ${totalChunks}`);
  console.log(`New chunks inserted: ${newChunks}`);
  console.log(`Skipped (already exist): ${skippedChunks}`);
}

ingest().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
