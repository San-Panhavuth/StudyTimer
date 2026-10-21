-- Lets a parent dismiss an AI flag ("Reviewed"). A fresh AI verdict clears the
-- dismissal so a re-check can flag the photo again.

alter table public.session_images add column reviewed_at timestamptz;

create or replace function public.mark_session_images_reviewed(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.session_images i
  set reviewed_at = now()
  where i.session_id = p_session_id
    and i.check_status = 'not-study'
    and exists (
      select 1 from public.parent_child_links l
      where l.child_id = i.user_id
        and l.parent_id = (select auth.uid())
        and l.status = 'approved'
    );
end;
$$;

grant execute on function public.mark_session_images_reviewed(uuid) to authenticated;

create or replace function public.record_image_check(
  p_storage_path text,
  p_status text,
  p_confidence real,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.session_images i
  set check_status = p_status,
      check_confidence = p_confidence,
      check_reason = left(coalesce(p_reason, ''), 300),
      checked_at = now(),
      reviewed_at = null
  where i.storage_path = p_storage_path
    and (
      i.user_id = (select auth.uid())
      or exists (
        select 1 from public.parent_child_links l
        where l.child_id = i.user_id
          and l.parent_id = (select auth.uid())
          and l.status = 'approved'
      )
    );
end;
$$;
