-- Stores the AI verdict per session photo so the check can run in the
-- background after upload and the parent sees flags later.
--
-- Family-app trust model: the verdict is written through SECURITY DEFINER
-- RPCs by the signed-in user's own server action, so a technically savvy
-- child could call record_image_check directly and mark a photo "study".

alter table public.session_images
  add column check_status text check (check_status in ('study', 'not-study', 'error', 'limited')),
  add column check_confidence real,
  add column check_reason text,
  add column checked_at timestamptz;

-- Records a verdict for one photo. Allowed for the photo's owner (background
-- check after upload) or an approved parent of the owner (manual check).
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
      checked_at = now()
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

grant execute on function public.record_image_check(text, text, real, text) to authenticated;

-- Called by a child's upload: spends up to p_wanted checks from the allowance
-- of the linked parent who turned on "require photos" (else the oldest approved
-- parent). Returns 0 when the child has no approved parent or the parent's
-- daily cap (30) is used up.
create or replace function public.reserve_upload_checks(p_wanted integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child uuid := (select auth.uid());
  v_parent uuid;
  v_limit constant integer := 30;
  v_day date := (now() at time zone 'utc')::date;
  v_used integer;
  v_granted integer;
begin
  if v_child is null then
    raise exception 'Not authenticated';
  end if;

  select l.parent_id into v_parent
  from public.parent_child_links l
  where l.child_id = v_child and l.status = 'approved'
  order by l.require_photos desc, l.created_at asc
  limit 1;

  if v_parent is null then
    return 0;
  end if;

  insert into public.content_check_usage (user_id, day, used)
  values (v_parent, v_day, 0)
  on conflict (user_id, day) do nothing;

  select u.used into v_used
  from public.content_check_usage u
  where u.user_id = v_parent and u.day = v_day
  for update;

  v_granted := greatest(0, least(coalesce(p_wanted, 0), v_limit - v_used));

  update public.content_check_usage u
  set used = u.used + v_granted
  where u.user_id = v_parent and u.day = v_day;

  return v_granted;
end;
$$;

grant execute on function public.reserve_upload_checks(integer) to authenticated;
