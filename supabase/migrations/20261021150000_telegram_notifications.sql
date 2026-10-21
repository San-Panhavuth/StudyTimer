-- Telegram notifications: a parent puts their Parent ID (the short code in
-- their profile menu) into a Telegram chat or group that has the bot, with
-- `/setAccount <ID>`. From then on, every session a linked child saves is
-- announced to that chat.

create table public.telegram_chats (
  parent_id uuid not null references auth.users (id) on delete cascade,
  chat_id bigint not null,
  linked_at timestamptz not null default now(),
  primary key (parent_id, chat_id)
);

alter table public.telegram_chats enable row level security;
-- No policies and no grants to API roles: only the security-definer
-- functions below touch this table.

-- Webhook (no user session, so callable by anon): link a chat to the parent
-- who owns this code. The webhook route has already verified the request
-- came from Telegram.
create or replace function public.link_telegram_chat(p_code text, p_chat_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent uuid;
begin
  select p.id into v_parent
  from public.profiles p
  where p.child_code = upper(trim(p_code)) and p.role = 'parent';

  if v_parent is null then
    return false;
  end if;

  insert into public.telegram_chats (parent_id, chat_id)
  values (v_parent, p_chat_id)
  on conflict do nothing;

  return true;
end;
$$;

revoke all on function public.link_telegram_chat(text, bigint) from public;
grant usage on schema public to anon;
grant execute on function public.link_telegram_chat(text, bigint) to anon, authenticated;

-- Webhook: stop sending to a chat (`/stop`).
create or replace function public.unlink_telegram_chat(p_chat_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.telegram_chats where chat_id = p_chat_id;
$$;

revoke all on function public.unlink_telegram_chat(bigint) from public;
grant execute on function public.unlink_telegram_chat(bigint) to anon, authenticated;

-- Child: distinct chat ids of the approved parents linked to the caller.
create or replace function public.get_parent_telegram_chats()
returns table (chat_id bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select distinct c.chat_id
  from public.parent_child_links l
  join public.telegram_chats c on c.parent_id = l.parent_id
  where l.child_id = (select auth.uid())
    and l.status = 'approved';
$$;

revoke all on function public.get_parent_telegram_chats() from public, anon;
grant execute on function public.get_parent_telegram_chats() to authenticated;
