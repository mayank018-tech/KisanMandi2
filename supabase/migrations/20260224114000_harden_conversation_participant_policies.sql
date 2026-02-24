-- Harden conversation/chat policies for reliable private chat creation

alter table if exists public.conversations enable row level security;
alter table if exists public.conversation_participants enable row level security;
alter table if exists public.messages enable row level security;

-- Helper to avoid recursive RLS checks on conversation_participants
create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = p_user_id
  );
$$;

revoke all on function public.is_conversation_participant(uuid, uuid) from public;
grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;

-- Conversations
drop policy if exists "Authenticated can create conversations" on public.conversations;
create policy "Authenticated can create conversations"
  on public.conversations
  for insert
  to authenticated
  with check (true);

drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can read conversations"
  on public.conversations
  for select
  to authenticated
  using (public.is_conversation_participant(conversations.id, auth.uid()));

drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
  on public.conversations
  for update
  to authenticated
  using (public.is_conversation_participant(conversations.id, auth.uid()))
  with check (public.is_conversation_participant(conversations.id, auth.uid()));

-- Conversation participants
drop policy if exists "Participants can read participant rows" on public.conversation_participants;
create policy "Participants can read participant rows"
  on public.conversation_participants
  for select
  to authenticated
  using (public.is_conversation_participant(conversation_participants.conversation_id, auth.uid()));

drop policy if exists "Users can join themselves" on public.conversation_participants;
create policy "Users can join themselves"
  on public.conversation_participants
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Participants can add participants" on public.conversation_participants;
create policy "Participants can add participants"
  on public.conversation_participants
  for insert
  to authenticated
  with check (public.is_conversation_participant(conversation_participants.conversation_id, auth.uid()));

-- Messages
drop policy if exists "Participants can read messages" on public.messages;
create policy "Participants can read messages"
  on public.messages
  for select
  to authenticated
  using (public.is_conversation_participant(messages.conversation_id, auth.uid()));

drop policy if exists "Participants can send messages as self" on public.messages;
create policy "Participants can send messages as self"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(messages.conversation_id, auth.uid())
  );
