-- Enforce unique private conversation per user pair

alter table if exists public.conversations
  add column if not exists conversation_key text;

-- Backfill keys only for clean 1:1 conversations and skip conflicting duplicates.
with conversation_pairs as (
  select
    cp.conversation_id,
    min(cp.user_id)::text as user_a,
    max(cp.user_id)::text as user_b,
    count(*) as participant_count
  from public.conversation_participants cp
  group by cp.conversation_id
),
eligible as (
  select
    p.conversation_id,
    p.user_a || ':' || p.user_b as key_value
  from conversation_pairs p
  where p.participant_count = 2
)
update public.conversations c
set conversation_key = e.key_value
from eligible e
where c.id = e.conversation_id
  and c.conversation_key is null
  and not exists (
    select 1
    from public.conversations c2
    where c2.conversation_key = e.key_value
      and c2.id <> c.id
  );

create unique index if not exists uq_conversations_conversation_key
  on public.conversations (conversation_key)
  where conversation_key is not null;
