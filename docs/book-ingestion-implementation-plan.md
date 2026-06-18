# Book Ingestion Implementation Plan

> Companion to [`book-ingestion-architecture-review.md`](./book-ingestion-architecture-review.md).
> The review is the *blueprint*; this is the *build order* to get it shipped.

## Status Snapshot

The chatbot is built and shipped (v3.2.0, rebranded). The RAG foundation works for text
sources. None of the architecture review's 7 recommendations are implemented yet — that is
the remaining work.

| Area | Current state | File |
|------|---------------|------|
| Schema | `vector(1536)`, ivfflat cosine index, vector-only `match_content_chunks` RPC. `source` enum lacks `book`. No `metadata`/`fts`. | `supabase/migrations/001_initial.sql` |
| Retrieval | Embeds only latest message, vector-only, top-6, threshold 0.3. Source label is `title (source)`. | `lib/rag/retrieval.ts` |
| Ingestion | `scripts/ingest.ts` (paragraph chunker, sha256). Duplicate word-based chunker + weak djb2 hash in the API route. | `scripts/ingest.ts`, `app/(chat)/api/ingest/route.ts` |
| Prompt | Strict grounded prompt; mentions the book as a *recommendation* but has no book-citation/source-formatting rules. | `lib/ai/prompts.ts` |
| Book PDF | **Not in repo.** Lives at `~/Downloads/Was It Something I Said_watermarked.pdf` (320 pp, ~89k words, extracts cleanly). | — |

## Decisions Locked

- **"Update the rules" = the bot's response/source-handling rules** in `lib/ai/prompts.ts`
  (book citation format, source labels with chapter/page, synthesize-don't-quote).
- **Ingestion runs dry-run / staging-first.** Build the script to emit chunks + metadata for
  review (no DB writes), then ingest to a non-prod or clearly-versioned source before touching
  production. The review doc explicitly warns against direct production ingestion.

## Research Confirmations (Exa)

- **Supabase hybrid search + RRF** is the canonical pattern: `fts tsvector` generated column +
  GIN index, a vector CTE and a full-text CTE fused with `1/(rrf_k + rank)`. We keep the
  **cosine `<=>`** operator — the existing index and `text-embedding-3-small` embeddings are
  cosine, so switching to the doc's `<#>`/`vector_ip_ops` would break consistency. `rrf_k` 50–60.
- **Anthropic Contextual Retrieval**: prepend a 50–100 token chapter/section header to each
  chunk *before* embedding. Cuts retrieval failures ~49% with hybrid search. Cheap, high value.

---

## Phase 1 — Data model migration

New file: `supabase/migrations/003_book_and_hybrid.sql`. Additive only; existing rows keep working.

1. Add `book` to the `content_chunk.source` check constraint.
2. Add `metadata jsonb not null default '{}'` (book_title, author, chapter_number,
   chapter_title, section_title, page_start, page_end, chunk_index, authority_tier,
   content_version, is_retrievable).
3. Add `fts tsvector generated always as (to_tsvector('english', content)) stored` and
   `create index ... using gin(fts)`.
4. Add RPC `match_content_chunks_hybrid(query_text, query_embedding vector(1536),
   match_count int default 8, full_text_weight float default 1, semantic_weight float default 1,
   rrf_k int default 50, source_filter text[] default null)` — Supabase RRF pattern, **cosine
   `<=>`**, with `is_retrievable` + optional source filtering inside both CTEs. Returns content +
   metadata + scores.
5. Keep the old `match_content_chunks` RPC for rollback safety.

Pre-work: confirm deployed pgvector version (HNSW availability) and the live `content_chunk`
constraint before writing the migration.

## Phase 2 — Book ingestion script

New file: `scripts/ingest-book.ts`. Dry-run by default (writes chunks + metadata to
`tmp/book-chunks.json` for review); `--commit` flag to actually insert. Leaves `scripts/ingest.ts`
untouched.

- Extract with `pdftotext -layout` from the PDF (path as arg).
- **Capture page boundaries before cleaning** (for `page_start`/`page_end`), then strip the
  repeated watermark/footer/distribution lines and front matter.
- Detect chapter + section headings; keep Q&A pairs together; chunk to ~450–700 tokens, 60–90
  overlap (new structure-aware chunker in `lib/rag/book-chunker.ts`).
- Prepend an Anthropic-style contextual header before embedding (e.g. *"From Was It Something I
  Said?, Chapter 4, on workplace communication."*); store clean display text separately.
- sha256 hash of normalized content + version for idempotent re-runs; batch inserts.

## Phase 3 — Retrieval upgrade

File: `lib/rag/retrieval.ts` (+ chat route).

1. Call `match_content_chunks_hybrid` with both raw query text and embedding; retrieve ~12
   candidates, send best 6–8.
2. Add a lightweight **query-rewrite** step in the chat route so follow-ups ("what if it's my
   boss?") fold in recent conversation before embedding.
3. Rewrite `formatChunksForPrompt` to emit rich labels:
   `[Source 1: Was It Something I Said?, Ch. 3 "...", pp. 72–74]`.
4. Log retrieved chunk IDs + scores into analytics for traceability.

## Phase 4 — Prompt rules

File: `lib/ai/prompts.ts`.

- Synthesize guidance, don't over-quote.
- Cite the book naturally **when book chunks were actually retrieved** (not forced on non-book
  context).
- Keep the existing "admit when context is insufficient" rule.

## Phase 5 — Security fix

File: `app/(chat)/api/ingest/route.ts` (+ `scripts/ingest-remote.ts`, `.env.example`).

Replace the `SERVICE_ROLE_KEY.slice(-10)` auth with a dedicated `INGEST_SECRET`. The review doc
flags reusing the service key as an implied shared secret. Alternative: remove the public endpoint
and ingest only locally.

## Phase 6 — Eval + verify

Small `promptfoo` suite: 20–30 etiquette questions, follow-ups, source-conflict (book should
outrank lower-authority), and insufficient-context cases. Run a retrieval smoke test before
trusting the corpus. Add tests for the new chunker.

---

## Suggested Execution Order

```
Phase 1  →  Phase 2 (dry-run, review chunk output)  →  ingest to staging
        →  Phase 3  →  Phase 4  →  Phase 5  →  Phase 6
```

Start with **Phases 1 and 2** — they unblock everything, and the dry-run lets the chunk
extraction be eyeballed before any DB writes.

---

## Detailed Todo List

### Phase 0 — Pre-work / discovery
- [ ] Confirm deployed Supabase pgvector version (decide ivfflat vs HNSW for any new index).
- [ ] Dump the live `content_chunk` table definition + current `source` check constraint.
- [ ] Run `pdftotext -layout ~/Downloads/"Was It Something I Said_watermarked.pdf" tmp/book-raw.txt` and inspect output.
- [ ] Catalogue the exact repeated watermark / footer / distribution lines to strip.
- [ ] Identify the chapter-heading and section-heading patterns (regex-able?).
- [ ] Identify Q&A block patterns (question/answer markers) for pair-preservation.
- [ ] Note front-matter / back-matter ranges to exclude (TOC, acknowledgments, notes).
- [ ] Confirm `pdftotext` is installed (`which pdftotext`); document install if missing.
- [ ] Decide the staging target: separate Supabase project vs a clearly-versioned `content_version` in prod.

### Phase 1 — Data model migration (`supabase/migrations/003_book_and_hybrid.sql`)
- [ ] Drop + re-add `content_chunk.source` check constraint to include `book`.
- [ ] Add `metadata jsonb not null default '{}'` column.
- [ ] Add `fts tsvector generated always as (to_tsvector('english', content)) stored` column.
- [ ] Add `create index ... using gin(fts)`.
- [ ] (Optional) Add HNSW vector index if pgvector version supports it; else keep ivfflat.
- [ ] Write `match_content_chunks_hybrid(query_text, query_embedding, match_count=8, full_text_weight=1, semantic_weight=1, rrf_k=50, source_filter=null)` using cosine `<=>`.
- [ ]   → full-text CTE with `fts @@ websearch_to_tsquery(query_text)`, `is_retrievable` + source filter.
- [ ]   → semantic CTE with `embedding <=> query_embedding`, same filters.
- [ ]   → RRF fusion `1/(rrf_k + rank)`, return content + metadata + scores.
- [ ] Keep the existing `match_content_chunks` RPC intact for rollback.
- [ ] Add retrieval-analytics fields (chunk IDs + scores) to `chat_analytics` or a new event table.
- [ ] Test migration applies cleanly on a scratch DB; verify rollback path.

### Phase 2 — Book ingestion script (`scripts/ingest-book.ts` + `lib/rag/book-chunker.ts`)
- [ ] Create `lib/rag/book-chunker.ts`: chapter/section/Q&A-aware chunking (~450–700 tokens, 60–90 overlap).
- [ ] Unit tests for `book-chunker.ts` (chapter splits, Q&A kept together, token bounds, overlap).
- [ ] `scripts/ingest-book.ts`: accept PDF path + source/version metadata as args.
- [ ] Extract text via `pdftotext -layout` to a temp file.
- [ ] Capture page boundaries **before** cleaning (for `page_start` / `page_end`).
- [ ] Strip watermark/footer/distribution lines, page labels, and front/back matter.
- [ ] Detect chapter + section headings; attach to each chunk's metadata.
- [ ] Preserve Q&A pairs across chunk boundaries.
- [ ] Generate Anthropic-style contextual header per chunk; embed header+content, store clean display text separately.
- [ ] Compute sha256 hash of normalized content + version for idempotent re-runs.
- [ ] Dry-run mode (default): write chunks + metadata to `tmp/book-chunks.json`, no DB writes.
- [ ] `--commit` flag: batch-insert into `content_chunk` with full `metadata`, `source='book'`.
- [ ] Add `ingest:book` script to `package.json`.
- [ ] Review `tmp/book-chunks.json` output for extraction quality before any commit.

### Phase 2b — Staging ingestion
- [ ] Run `--commit` against the staging target.
- [ ] Spot-check inserted rows: metadata completeness, no watermark text, page ranges sane.
- [ ] Run a retrieval smoke test with 5–10 representative etiquette questions.

### Phase 3 — Retrieval upgrade (`lib/rag/retrieval.ts` + chat route)
- [ ] Point `retrieveRelevantChunks` at `match_content_chunks_hybrid` (pass raw text + embedding).
- [ ] Retrieve ~12 candidates; send best 6–8 to the prompt.
- [ ] Extend `RetrievedChunk` type with metadata fields (chapter, section, pages, source authority).
- [ ] Add query-rewrite step in the chat route: fold recent conversation into the retrieval query.
- [ ] Rewrite `formatChunksForPrompt` to emit rich labels (`Was It Something I Said?, Ch. 3 "...", pp. 72–74`).
- [ ] Log retrieved chunk IDs + similarity/RRF scores into analytics.
- [ ] Update / add tests for retrieval + formatting.

### Phase 4 — Prompt rules (`lib/ai/prompts.ts`)
- [ ] Add rule: synthesize guidance, don't over-quote source text.
- [ ] Add rule: cite the book naturally **only when book chunks were retrieved**.
- [ ] Add rule: don't force a book mention on non-book context.
- [ ] Keep the existing "admit when context is insufficient" rule.
- [ ] Verify the source-label format in the prompt matches `formatChunksForPrompt` output.

### Phase 5 — Security fix (`app/(chat)/api/ingest/route.ts`)
- [ ] Replace `SERVICE_ROLE_KEY.slice(-10)` auth with a dedicated `INGEST_SECRET`.
- [ ] Update `scripts/ingest-remote.ts` to send `INGEST_SECRET`.
- [ ] Add `INGEST_SECRET` to `.env.example` / `.env.local.example`.
- [ ] Decide: keep the public ingest endpoint (secured) or remove it in favor of local-only ingestion.
- [ ] Reconcile the duplicate chunker/hash in the API route with the canonical implementations.

### Phase 6 — Eval + verify
- [ ] Add `promptfoo` config + dependency.
- [ ] Write 20–30 realistic etiquette questions (retrieval + generation assertions).
- [ ] Add 5–10 follow-up questions requiring conversation-aware retrieval.
- [ ] Add 5 source-conflict questions (book should outrank lower-authority content).
- [ ] Add 5 insufficient-context questions (assistant should decline / redirect gracefully).
- [ ] Assert citations map to actually-retrieved chunk IDs.
- [ ] Run the suite; record a baseline; wire into CI if green.

### Wrap-up
- [ ] Update `README.md` / `AGENTS.md` with the book-ingestion workflow.
- [ ] Promote ingestion from staging to production once evals pass.
- [ ] Commit per phase with conventional-commit messages; open PR with test plan.
