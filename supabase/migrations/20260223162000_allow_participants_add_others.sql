-- Allow a conversation participant to add other users to the same conversation.
-- This is required for 1:1 chat creation from client code (self row first, target row second).

drop policy if exists "Participants can add participants" on public.conversation_participants;
create policy "Participants can add participants"
  on public.conversation_participants
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
    )
  );
