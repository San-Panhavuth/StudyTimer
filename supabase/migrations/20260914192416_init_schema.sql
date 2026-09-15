-- Velea Rien: initial schema
-- profiles, subjects, sessions, active_session
-- Every table is owned per-user and protected with RLS.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Guest',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index subjects_user_id_idx on public.subjects (user_id);

alter table public.subjects enable row level security;

create policy "subjects_select_own"
  on public.subjects for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "subjects_insert_own"
  on public.subjects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "subjects_update_own"
  on public.subjects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "subjects_delete_own"
  on public.subjects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- sessions (completed study sessions)
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  subject_name text not null,
  start_ts timestamptz not null,
  end_ts timestamptz not null,
  study_seconds integer not null default 0 check (study_seconds >= 0),
  break_seconds integer not null default 0 check (break_seconds >= 0),
  created_at timestamptz not null default now(),
  check (end_ts >= start_ts)
);

create index sessions_user_id_idx on public.sessions (user_id);
create index sessions_user_start_idx on public.sessions (user_id, start_ts desc);
create index sessions_subject_id_idx on public.sessions (subject_id);

alter table public.sessions enable row level security;

create policy "sessions_select_own"
  on public.sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "sessions_insert_own"
  on public.sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "sessions_update_own"
  on public.sessions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "sessions_delete_own"
  on public.sessions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- active_session (at most one running/on-break timer per user)
-- ---------------------------------------------------------------------------
create table public.active_session (
  user_id uuid primary key references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  subject_name text not null,
  start_ts timestamptz not null,
  break_intervals jsonb not null default '[]'::jsonb,
  break_start timestamptz,
  status text not null default 'running' check (status in ('running', 'break')),
  updated_at timestamptz not null default now()
);

alter table public.active_session enable row level security;

create policy "active_session_select_own"
  on public.active_session for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "active_session_insert_own"
  on public.active_session for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "active_session_update_own"
  on public.active_session for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "active_session_delete_own"
  on public.active_session for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- new-user bootstrap: create profile + default subjects
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Guest'));

  insert into public.subjects (user_id, name)
  select new.id, s.name
  from unnest(array[
    'Khmer', 'English', 'Physics', 'Biology', 'Chemistry',
    'Earth Science', 'Morality & Civics', 'Math', 'IT', 'Extra'
  ]) as s(name);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
