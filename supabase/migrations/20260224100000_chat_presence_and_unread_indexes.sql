-- Chat presence + unread performance hardening

-- ------------------------------
-- Presence fields on profiles
-- ------------------------------
alter table if exists public.user_profiles
  add column if not exists is_online boolean not null default false,
  add column if not exists last_seen_at timestamptz default timezone('utc', now());

create index if not exists idx_user_profiles_online_last_seen
  on public.user_profiles (is_online, last_seen_at desc);

-- ------------------------------
-- Message unread/query indexes
-- ------------------------------
create index if not exists idx_messages_unread_by_conversation
  on public.messages (conversation_id, created_at desc)
  where read_at is null;

create index if not exists idx_messages_conversation_read_at
  on public.messages (conversation_id, read_at, created_at desc);

-- ------------------------------
-- Conversation update policy
-- Needed for trigger-driven metadata updates on active conversations.
-- ------------------------------
drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
  on public.conversations
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  );

-- ------------------------------
-- Presence heartbeat RPC
-- ------------------------------
create or replace function public.touch_presence(p_is_online boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set
    is_online = p_is_online,
    last_seen_at = timezone('utc', now())
  where id = auth.uid();
end;
$$;

revoke all on function public.touch_presence(boolean) from public;
grant execute on function public.touch_presence(boolean) to authenticated;
