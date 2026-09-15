-- Helper RPCs for the parent/child approval UI. Both are SECURITY DEFINER
-- so they can join auth.users for the email address (not otherwise
-- exposed via the REST API), but each is scoped to rows the caller is
-- actually a party to — never a general profiles/users browse.

create or replace function public.get_pending_link_requests()
returns table (link_id uuid, parent_id uuid, parent_email text, parent_display_name text, created_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select l.id, l.parent_id, u.email, p.display_name, l.created_at
  from public.parent_child_links l
  join auth.users u on u.id = l.parent_id
  join public.profiles p on p.id = l.parent_id
  where l.child_id = (select auth.uid()) and l.status = 'pending'
  order by l.created_at desc;
$$;

grant execute on function public.get_pending_link_requests() to authenticated;

create or replace function public.get_linked_children()
returns table (link_id uuid, child_id uuid, child_email text, child_display_name text, status text, created_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select l.id, l.child_id, u.email, p.display_name, l.status, l.created_at
  from public.parent_child_links l
  join auth.users u on u.id = l.child_id
  join public.profiles p on p.id = l.child_id
  where l.parent_id = (select auth.uid())
  order by l.created_at desc;
$$;

grant execute on function public.get_linked_children() to authenticated;
