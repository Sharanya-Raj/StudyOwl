-- Study Sessions Table for StudyOwl

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  title text not null,
  description text,
  status text not null check (status in ('scheduled', 'live', 'completed')) default 'scheduled',
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_admin_id_idx on public.sessions (admin_id);
create index if not exists sessions_status_idx on public.sessions (status);
