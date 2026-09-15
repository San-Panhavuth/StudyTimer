-- Parent/Child accounts: role on profiles, a short shareable child_code,
-- a parent_child_links table (parent-initiated, child-approved), an RPC to
-- resolve a code without exposing the profiles table broadly, and extra
-- RLS policies letting an approved parent read their child's sessions.

-- ---------------------------------------------------------------------------
-- profiles: role + child_code
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column role text not null default 'child' check (role in ('child', 'parent'));

alter table public.profiles
  add column child_code text unique;

create or replace function public.generate_child_code()
returns text
language sql
volatile
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

-- ---------------------------------------------------------------------------
-- parent_child_links
-- ---------------------------------------------------------------------------
create table public.parent_child_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users (id) on delete cascade,
  child_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (parent_id, child_id),
  check (parent_id <> child_id)
);

create index parent_child_links_parent_idx on public.parent_child_links (parent_id);
create index parent_child_links_child_idx on public.parent_child_links (child_id);

alter table public.parent_child_links enable row level security;

-- Parent can see the links they created (any status).
create policy "links_select_as_parent"
  on public.parent_child_links for select
  to authenticated
  using ((select auth.uid()) = parent_id);

-- Child can see requests aimed at them (any status) — this is how the
-- in-app "X wants to link as your parent" banner is populated.
create policy "links_select_as_child"
  on public.parent_child_links for select
  to authenticated
  using ((select auth.uid()) = child_id);

-- Only a parent-role account can create a request, always starting pending.
create policy "links_insert_as_parent"
  on public.parent_child_links for insert
  to authenticated
  with check (
    (select auth.uid()) = parent_id
    and status = 'pending'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'parent')
  );

-- Only the child can respond (approve/reject) to a request aimed at them.
create policy "links_update_as_child"
  on public.parent_child_links for update
  to authenticated
  using ((select auth.uid()) = child_id)
  with check ((select auth.uid()) = child_id);

-- A parent can withdraw their own still-pending request.
create policy "links_delete_as_parent"
  on public.parent_child_links for delete
  to authenticated
  using ((select auth.uid()) = parent_id and status = 'pending');

-- ---------------------------------------------------------------------------
-- resolve_child_code: look up a child's id + display name by their short
-- code, without granting broad SELECT access to public.profiles. Any
-- authenticated user can call this (needed to validate a code before
-- creating a link request), but it only ever returns one exact match.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_child_code(p_code text)
returns table (id uuid, display_name text)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.display_name
  from public.profiles p
  where p.child_code = upper(p_code) and p.role = 'child';
$$;

grant execute on function public.resolve_child_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- sessions: let an approved parent read their child's sessions too
-- ---------------------------------------------------------------------------
create policy "sessions_select_as_approved_parent"
  on public.sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.parent_child_links l
      where l.child_id = sessions.user_id
        and l.parent_id = (select auth.uid())
        and l.status = 'approved'
    )
  );

-- ---------------------------------------------------------------------------
-- backfill: give every existing profile a child_code (harmless for parent
-- accounts, only surfaced in the UI for child accounts)
-- ---------------------------------------------------------------------------
update public.profiles set child_code = public.generate_child_code() where child_code is null;

-- ---------------------------------------------------------------------------
-- new-user bootstrap: also store role, and generate a child_code
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'role' = 'parent' then 'parent'
    else 'child'
  end;

  insert into public.profiles (id, display_name, role, child_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Guest'),
    v_role,
    public.generate_child_code()
  );

  if v_role = 'child' then
    insert into public.subjects (user_id, name)
    select new.id, s.name
    from unnest(array[
      'Khmer', 'English', 'Physics', 'Biology', 'Chemistry',
      'Earth Science', 'Morality & Civics', 'Math', 'IT', 'Extra'
    ]) as s(name);
  end if;

  return new;
end;
$$;
