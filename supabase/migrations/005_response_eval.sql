-- Async response-quality eval.
--
-- After a book-grounded answer finishes streaming, a cheap model scores it
-- against the chunks that were actually retrieved:
--   * faithfulness — are the answer's claims supported by the sources?
--   * relevance    — does the answer address the user's question?
--
-- Runs off the user's hot path (best-effort, after the response is sent), so a
-- failed or skipped eval just leaves the scores null. Kept as a separate
-- append-only event table so the existing chat_analytics / retrieval_analytics
-- shapes are untouched, consistent with migration 003.
create table if not exists public.response_analytics (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chat(id) on delete cascade,
  message_id uuid references public.message(id) on delete cascade,
  question text not null,
  faithfulness real,
  relevance real,
  chunks_evaluated integer not null default 0,
  model text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_response_analytics_created_at
  on public.response_analytics(created_at);

create index if not exists idx_response_analytics_chat_id
  on public.response_analytics(chat_id);
