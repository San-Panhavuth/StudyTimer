-- Session photos: a parent can require their child to attach up to 5 photos
-- when ending a study session. The requirement is per parent->child link.
-- Photos live in a private Storage bucket; session_images tracks which
-- objects belong to which session.

-- ---------------------------------------------------------------------------
-- parent_child_links: per-link toggle
-- ---------------------------------------------------------------------------
alter table public.parent_child_links
  add column require_photos boolean not null default false;

-- Parents have no UPDATE policy on links (only the child does), and RLS can't
-- restrict columns, so the toggle goes through a definer RPC that only ever
-- touches require_photos on the caller's own link.
create or replace function public.set_child_photo_requirement(p_link_id uuid, p_enabled boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.parent_child_links
  set require_photos = p_enabled
  where id = p_link_id and parent_id = (select auth.uid());
$$;

grant execute on function public.set_child_photo_requirement(uuid, boolean) to authenticated;

-- Return type changes (new column), so the function has to be dropped first.
drop function public.get_linked_children();

create function public.get_linked_children()
returns table (
  link_id uuid,
  child_id uuid,
  child_email text,
  child_display_name text,
  status text,
  created_at timestamptz,
  require_photos boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select l.id, l.child_id, u.email, p.display_name, l.status, l.created_at, l.require_photos
  from public.parent_child_links l
  join auth.users u on u.id = l.child_id
  join public.profiles p on p.id = l.child_id
  where l.parent_id = (select auth.uid())
  order by l.created_at desc;
$$;

grant execute on function public.get_linked_children() to authenticated;

-- ---------------------------------------------------------------------------
-- session_images
-- ---------------------------------------------------------------------------
create table public.session_images (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index session_images_session_idx on public.session_images (session_id);
create index session_images_user_idx on public.session_images (user_id);

alter table public.session_images enable row level security;

create policy "session_images_select_own"
  on public.session_images for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "session_images_insert_own"
  on public.session_images for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

create policy "session_images_delete_own"
  on public.session_images for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "session_images_select_as_approved_parent"
  on public.session_images for select
  to authenticated
  using (
    exists (
      select 1 from public.parent_child_links l
      where l.child_id = session_images.user_id
        and l.parent_id = (select auth.uid())
        and l.status = 'approved'
    )
  );

-- Hard cap of 5 photos per session, enforced in the DB so a modified client
-- can't skip the UI limit.
create or replace function public.enforce_session_image_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.session_images where session_id = new.session_id) >= 5 then
    raise exception 'A session can have at most 5 photos.';
  end if;
  return new;
end;
$$;

create trigger session_images_limit
  before insert on public.session_images
  for each row execute function public.enforce_session_image_limit();

-- ---------------------------------------------------------------------------
-- Storage: private bucket, objects at <user_id>/<session_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('session-photos', 'session-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "session_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'session-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "session_photos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'session-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "session_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'session-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "session_photos_select_as_approved_parent"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'session-photos'
    and exists (
      select 1 from public.parent_child_links l
      where l.child_id::text = (storage.foldername(name))[1]
        and l.parent_id = (select auth.uid())
        and l.status = 'approved'
    )
  );
