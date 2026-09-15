-- Simplify parent/child linking: this is for internal/family use, not a
-- consumer product, so requiring the child to separately approve a
-- request is unnecessary friction. A parent entering/scanning a valid
-- child code now links immediately (status = 'approved').

drop policy "links_insert_as_parent" on public.parent_child_links;
create policy "links_insert_as_parent"
  on public.parent_child_links for insert
  to authenticated
  with check (
    (select auth.uid()) = parent_id
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'parent')
  );

-- A parent can remove a link at any time now (not just while pending).
drop policy "links_delete_as_parent" on public.parent_child_links;
create policy "links_delete_as_parent"
  on public.parent_child_links for delete
  to authenticated
  using ((select auth.uid()) = parent_id);

-- Also return email now that linking grants immediate access anyway —
-- the UI shows the child's email, not their (often-default "Guest")
-- display name.
drop function public.resolve_child_code(text);

create function public.resolve_child_code(p_code text)
returns table (id uuid, display_name text, email text)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.display_name, u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.child_code = upper(p_code) and p.role = 'child';
$$;

grant execute on function public.resolve_child_code(text) to authenticated;
