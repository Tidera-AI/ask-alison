import { createHash } from "node:crypto";

// Canonical content hash for dedup across the RAG pipeline. sha256, truncated
// to 16 hex chars to match the rows written by scripts/ingest.ts.
export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}
