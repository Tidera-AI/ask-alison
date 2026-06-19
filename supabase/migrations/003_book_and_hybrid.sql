-- Phase 1: Book source + hybrid (RRF) search.
-- Additive only — existing rows and the original match_content_chunks RPC keep working.

-- 1. Allow the `book` source. The inline check constraint from 001 is named
--    content_chunk_source_check by Postgres convention; drop + re-add it.
alter table public.content_chunk
  drop constraint if exists content_chunk_source_check;

alter table public.content_chunk
  add constraint content_chunk_source_check
  check (source in (
    'blog', 'substack', 'evie', 'instagram', 'knowledge_base', 'book'
  ));

-- 2. Structured metadata (book_title, author, chapter_number, chapter_title,
--    section_title, page_start, page_end, chunk_index, authority_tier,
--    content_version, is_retrievable). Defaults to {} so existing rows are valid.
alter table public.content_chunk
  add column if not exists metadata jsonb not null default '{}';

-- 3. Full-text search vector over the clean display content + GIN index.
alter table public.content_chunk
  add column if not exists fts tsvector
  generated always as (to_tsvector('english', content)) stored;

create index if not exists idx_content_chunk_fts
  on public.content_chunk using gin (fts);

-- 4. Hybrid retrieval via Reciprocal Rank Fusion (RRF).
--    Keeps the existing cosine `<=>` operator for consistency with the
--    ivfflat (vector_cosine_ops) index and text-embedding-3-small embeddings.
--    Filters on is_retrievable (null/absent => retrievable) and an optional
--    source allow-list, inside BOTH the full-text and semantic CTEs.
create or replace function match_content_chunks_hybrid(
  query_text text,
  query_embedding vector(1536),
  match_count int default 8,
  full_text_weight float default 1,
  semantic_weight float default 1,
  rrf_k int default 50,
  source_filter text[] default null
)
returns table (
  id uuid,
  content text,
  source text,
  title text,
  url text,
  topic text,
  metadata jsonb,
  similarity float,
  rrf_score float
)
language sql
stable
as $$
with full_text as (
  select
    cc.id,
    row_number() over (
      order by ts_rank_cd(cc.fts, websearch_to_tsquery('english', query_text)) desc
    ) as rank_ix
  from content_chunk cc
  where query_text is not null
    and query_text <> ''
    and cc.fts @@ websearch_to_tsquery('english', query_text)
    and (source_filter is null or cc.source = any (source_filter))
    and coalesce((cc.metadata ->> 'is_retrievable')::boolean, true)
  order by rank_ix
  limit least(match_count, 30) * 2
),
semantic as (
  select
    cc.id,
    row_number() over (order by cc.embedding <=> query_embedding) as rank_ix
  from content_chunk cc
  where (source_filter is null or cc.source = any (source_filter))
    and coalesce((cc.metadata ->> 'is_retrievable')::boolean, true)
  order by rank_ix
  limit least(match_count, 30) * 2
)
select
  cc.id,
  cc.content,
  cc.source,
  cc.title,
  cc.url,
  cc.topic,
  cc.metadata,
  1 - (cc.embedding <=> query_embedding) as similarity,
  coalesce(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight
    + coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight as rrf_score
from full_text
full outer join semantic on full_text.id = semantic.id
join content_chunk cc on cc.id = coalesce(full_text.id, semantic.id)
order by rrf_score desc
limit least(match_count, 30);
$$;

-- 5. Retrieval analytics: which chunks were actually surfaced + their scores.
--    Separate event table so the existing chat_analytics shape is untouched.
create table if not exists public.retrieval_analytics (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chat(id) on delete cascade,
  query_text text not null,
  rewritten_query text,
  chunk_ids uuid[] not null default '{}',
  scores jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists idx_retrieval_analytics_created_at
  on public.retrieval_analytics(created_at);
