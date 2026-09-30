-- Vocabulary saved from the extension / web app. One row per (user, word); deletes are soft (tombstones) so they sync.
create table public.words (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 500),
  text_key    text generated always as (lower(text)) stored,
  translation text not null check (char_length(translation) <= 2000),
  source_lang text,
  context     text check (char_length(context) <= 600),
  url         text check (char_length(url) <= 2000),
  definition  jsonb,
  -- Review state (Leitner boxes today; columns are generic enough for FSRS later)
  box         int  not null default 0 check (box between 0 and 10),
  due         timestamptz not null default now(),
  reps        int  not null default 0,
  lapses      int  not null default 0,
  -- updated_at: client clock, used for last-write-wins. synced_at: server clock, used for incremental pulls.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  synced_at   timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (user_id, text_key)
);

create index words_user_synced_idx on public.words (user_id, synced_at);
create index words_user_due_idx on public.words (user_id, due) where deleted_at is null;

create table public.review_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word_id     uuid not null references public.words (id) on delete cascade,
  known       boolean not null,
  reviewed_at timestamptz not null default now()
);

create index review_logs_user_time_idx on public.review_logs (user_id, reviewed_at desc);
create index review_logs_word_idx on public.review_logs (word_id);

-- Server-side clock for incremental sync.
create function public.set_synced_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

create trigger words_set_synced_at
before insert or update on public.words
for each row execute function public.set_synced_at();

-- Row Level Security: every user only sees and changes their own rows.
alter table public.words enable row level security;
alter table public.review_logs enable row level security;

create policy "words: select own" on public.words
  for select to authenticated using (user_id = (select auth.uid()));
create policy "words: insert own" on public.words
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "words: update own" on public.words
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "words: delete own" on public.words
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "review_logs: select own" on public.review_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "review_logs: insert own" on public.review_logs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.words w where w.id = word_id and w.user_id = (select auth.uid()))
  );
create policy "review_logs: delete own" on public.review_logs
  for delete to authenticated using (user_id = (select auth.uid()));
