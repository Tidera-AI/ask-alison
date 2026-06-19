-- Persist the RAG citations surfaced beneath each assistant answer so the
-- "Used N sources" panel, inline [n] markers, and the graceful "no context"
-- notice all survive a page reload.
--
-- Semantics of the column:
--   NULL  -> legacy message (predates this feature) or a user message
--   '[]'  -> assistant answered with no retrieved context (graceful refusal)
--   [..]  -> ordered, 1-based sources matching the inline [n] markers
--
-- Stored as jsonb so the serialized ChatSource[] round-trips without a join.

alter table public.message
  add column if not exists sources jsonb;
