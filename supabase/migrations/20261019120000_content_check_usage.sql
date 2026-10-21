-- Daily usage cap for the parent "Check content" AI photo review. Each photo
-- reviewed counts as 1. Rows are only reachable through the RPCs below (RLS is
-- on with no policies), and the cap lives here so a modified client can't
-- raise it.

create table public.content_check_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  used integer not null default 0 check (used >= 0),
  primary key (user_id, day)
);

alter table public.content_check_usage enable row level security;

create or replace function public.get_content_check_usage()
returns table (used integer, daily_limit integer)
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
           (select u.used from public.content_check_usage u
             where u.user_id = (select auth.uid()) and u.day = (now() at time zone 'utc')::date),
           0
         ),
         30;
$$;

grant execute on function public.get_content_check_usage() to authenticated;

-- Reserves up to p_wanted checks from today's allowance and says how many were
-- actually granted (0 once the cap is hit).
create or replace function public.consume_content_checks(p_wanted integer)
returns table (granted integer, used integer, daily_limit integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_limit constant integer := 30;
  v_day date := (now() at time zone 'utc')::date;
  v_used integer;
  v_granted integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.content_check_usage (user_id, day, used)
  values (v_uid, v_day, 0)
  on conflict (user_id, day) do nothing;

  -- Row lock serialises concurrent checks from the same parent.
  select u.used into v_used
  from public.content_check_usage u
  where u.user_id = v_uid and u.day = v_day
  for update;

  v_granted := greatest(0, least(coalesce(p_wanted, 0), v_limit - v_used));

  update public.content_check_usage u
  set used = u.used + v_granted
  where u.user_id = v_uid and u.day = v_day;

  return query select v_granted, v_used + v_granted, v_limit;
end;
$$;

grant execute on function public.consume_content_checks(integer) to authenticated;
