-- Lead capture: email stored on the anonymous session user row.
alter table public.user
  add column if not exists email text,
  add column if not exists email_timestamptz timestamptz;

create index if not exists idx_user_email on public.user (email)
  where email is not null;
