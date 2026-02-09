-- Supabase schema for StudyOwl matching.

create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key,
  name text,
  avatar_url text,
  courses text[],
  study_preferences jsonb,
  is_available boolean
);

alter table if exists public.profiles
  add column if not exists name text,
  add column if not exists avatar_url text,
  add column if not exists courses text[],
  add column if not exists study_preferences jsonb,
  add column if not exists is_available boolean;

create table if not exists public.user_embeddings (
  id uuid primary key,
  user_id uuid not null,
  source_field text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists user_embeddings_user_id_idx
  on public.user_embeddings (user_id, created_at desc);

create index if not exists user_embeddings_embedding_idx
  on public.user_embeddings using ivfflat (embedding vector_cosine_ops);

create or replace function public.match_available_users(
  query_embedding vector(1536),
  match_limit int default 25,
  filter_course text default null,
  filter_topic text default null,
  filter_style text default null,
  exclude_user_id uuid default null
)
returns table (
  user_id uuid,
  name text,
  avatar_url text,
  courses jsonb,
  study_preferences jsonb,
  is_available boolean,
  similarity_score float
)
language sql
stable
as $$
  with latest_embeddings as (
    select distinct on (user_id) user_id, embedding
    from public.user_embeddings
    order by user_id, created_at desc
  )
  select
    p.id as user_id,
    p.name,
    p.avatar_url,
    to_jsonb(p.courses) as courses,
    p.study_preferences,
    p.is_available,
    1 - (le.embedding <=> query_embedding) as similarity_score
  from public.profiles p
  join latest_embeddings le on le.user_id = p.id
  where p.is_available = true
    and (exclude_user_id is null or p.id <> exclude_user_id)
    and (filter_course is null or to_jsonb(p.courses) @> to_jsonb(array[filter_course]))
    and (filter_topic is null or p.study_preferences ->> 'topic' = filter_topic)
    and (filter_style is null or p.study_preferences ->> 'style' = filter_style)
  order by le.embedding <=> query_embedding
  limit match_limit;
$$;
