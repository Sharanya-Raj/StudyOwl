-- Create table for storing document embeddings
create table if not exists public.document_embeddings (
    id uuid primary key,
    user_id uuid references public.profiles(id) on delete cascade,
    document_id uuid not null,
    chunk_text text not null,
    embedding float8[],
    created_at timestamptz default now()
);

-- Index for fast search by document
create index if not exists idx_document_embeddings_document_id on public.document_embeddings(document_id);
-- Index for user
create index if not exists idx_document_embeddings_user_id on public.document_embeddings(user_id);