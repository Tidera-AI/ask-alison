-- Enable pgvector extension
create extension if not exists vector;

-- Anonymous users (cookie-based sessions)
create table public.user (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Chat conversations
create table public.chat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create index idx_chat_user_id on public.chat(user_id);

-- Messages within conversations
create table public.message (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chat(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_message_chat_id on public.message(chat_id);

-- RAG content chunks with embeddings
create table public.content_chunk (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536) not null,
  source text not null check (source in ('blog', 'substack', 'evie', 'instagram', 'knowledge_base')),
  title text not null,
  url text,
  topic text,
  word_count integer not null,
  content_hash text not null unique,
  created_at timestamptz not null default now()
);

-- pgvector index for similarity search
create index idx_content_chunk_embedding on public.content_chunk
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Analytics: what people ask
create table public.chat_analytics (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chat(id) on delete cascade,
  user_question text not null,
  topics_matched text[] not null default '{}',
  chunks_used integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_chat_analytics_created_at on public.chat_analytics(created_at);

-- Similarity search function for RAG retrieval
create or replace function match_content_chunks(
  query_embedding vector(1536),
  match_count int default 6,
  match_threshold float default 0.3
)
returns table (
  id uuid,
  content text,
  source text,
  title text,
  url text,
  topic text,
  similarity float
)
language sql stable
as $$
  select
    content_chunk.id,
    content_chunk.content,
    content_chunk.source,
    content_chunk.title,
    content_chunk.url,
    content_chunk.topic,
    1 - (content_chunk.embedding <=> query_embedding) as similarity
  from content_chunk
  where 1 - (content_chunk.embedding <=> query_embedding) > match_threshold
  order by content_chunk.embedding <=> query_embedding
  limit match_count;
$$;
