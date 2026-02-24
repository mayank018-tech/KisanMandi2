-- Marketplace v2: structured offers, payments, chat pin/delete, and profile edit fields

-- ------------------------------
-- Offers: professional lifecycle + conversation link
-- ------------------------------
alter table if exists public.offers
  add column if not exists quantity numeric not null default 1 check (quantity > 0),
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.offers'::regclass
      and conname = 'offers_status_check'
  ) then
    alter table public.offers drop constraint offers_status_check;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.offers'::regclass
      and conname = 'offers_status_check'
  ) then
    alter table public.offers
      add constraint offers_status_check
      check (status in ('pending', 'accepted', 'rejected', 'expired', 'completed'));
  end if;
end$$;

create index if not exists idx_offers_listing_status_created
  on public.offers (listing_id, status, created_at desc);

create index if not exists idx_offers_conversation_created
  on public.offers (conversation_id, created_at desc)
  where conversation_id is not null;

-- ------------------------------
-- Payments
-- ------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  payer_id uuid not null references public.user_profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  status text not null default 'submitted'
    check (status in ('pending', 'submitted', 'verified', 'failed')),
  transaction_ref text,
  screenshot_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_payments_offer_status_created
  on public.payments (offer_id, status, created_at desc);

create index if not exists idx_payments_payer_created
  on public.payments (payer_id, created_at desc);

alter table if exists public.payments enable row level security;

drop policy if exists "Offer participants can read payments" on public.payments;
create policy "Offer participants can read payments"
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1
      from public.offers o
      where o.id = payments.offer_id
        and (o.buyer_id = auth.uid() or o.farmer_id = auth.uid())
    )
  );

drop policy if exists "Buyer can create payment for own offer" on public.payments;
create policy "Buyer can create payment for own offer"
  on public.payments for insert
  to authenticated
  with check (
    payer_id = auth.uid()
    and exists (
      select 1
      from public.offers o
      where o.id = payments.offer_id
        and o.buyer_id = auth.uid()
    )
  );

drop policy if exists "Offer participants can update payments" on public.payments;
create policy "Offer participants can update payments"
  on public.payments for update
  to authenticated
  using (
    exists (
      select 1
      from public.offers o
      where o.id = payments.offer_id
        and (o.buyer_id = auth.uid() or o.farmer_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.offers o
      where o.id = payments.offer_id
        and (o.buyer_id = auth.uid() or o.farmer_id = auth.uid())
    )
  );

-- ------------------------------
-- Chat: pin, soft delete, structured messages
-- ------------------------------
alter table if exists public.conversation_participants
  add column if not exists is_pinned boolean not null default false,
  add column if not exists hidden_at timestamptz;

create index if not exists idx_conv_participants_user_pin
  on public.conversation_participants (user_id, is_pinned, joined_at desc)
  where hidden_at is null;

create index if not exists idx_conv_participants_user_hidden
  on public.conversation_participants (user_id, hidden_at);

drop policy if exists "Participants can update own participant row" on public.conversation_participants;
create policy "Participants can update own participant row"
  on public.conversation_participants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table if exists public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists offer_id uuid references public.offers(id) on delete set null,
  add column if not exists delivered_at timestamptz,
  add column if not exists seen_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.messages'::regclass
      and conname = 'messages_message_type_check'
  ) then
    alter table public.messages
      add constraint messages_message_type_check
      check (message_type in ('text', 'offer', 'system', 'payment'));
  end if;
end$$;

update public.messages
set delivered_at = coalesce(delivered_at, created_at)
where delivered_at is null;

update public.messages
set seen_at = coalesce(seen_at, read_at)
where seen_at is null
  and read_at is not null;

create index if not exists idx_messages_offer
  on public.messages (offer_id, created_at desc)
  where offer_id is not null;

create index if not exists idx_messages_conversation_delivered
  on public.messages (conversation_id, delivered_at, seen_at, created_at desc);

alter table if exists public.conversations
  add column if not exists last_message_type text not null default 'text';

create or replace function public.sync_message_seen_at()
returns trigger
language plpgsql
as $$
begin
  if new.read_at is not null and (old.read_at is null or old.read_at is distinct from new.read_at) then
    new.seen_at := coalesce(new.seen_at, new.read_at);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_messages_sync_seen_at on public.messages;
create trigger trg_messages_sync_seen_at
  before update on public.messages
  for each row
  execute function public.sync_message_seen_at();

create or replace function public.update_conversation_activity()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set
    last_message = coalesce(new.content, last_message),
    last_message_type = coalesce(new.message_type, 'text'),
    last_activity_at = timezone('utc', now())
  where id = new.conversation_id;

  if new.delivered_at is null then
    update public.messages
    set delivered_at = timezone('utc', now())
    where id = new.id;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_message_update_rules()
returns trigger
language plpgsql
as $$
begin
  if old.sender_id <> auth.uid() then
    if new.content is distinct from old.content
      or new.attachments is distinct from old.attachments
      or new.deleted_at is distinct from old.deleted_at
      or new.sender_id is distinct from old.sender_id
      or new.conversation_id is distinct from old.conversation_id
      or new.offer_id is distinct from old.offer_id
      or new.message_type is distinct from old.message_type
    then
      raise exception 'Only sender can edit message content';
    end if;
  end if;

  return new;
end;
$$;

-- ------------------------------
-- Notification triggers for message/offer
-- ------------------------------
create or replace function public.notify_on_new_message()
returns trigger
language plpgsql
as $$
begin
  insert into public.notifications (user_id, type, entity_type, entity_id, title, body)
  select
    cp.user_id,
    'message',
    'conversation',
    new.conversation_id,
    'New message',
    case
      when new.message_type = 'offer' then 'You received a new offer in chat'
      else left(coalesce(new.content, 'You have a new message'), 180)
    end
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id
    and cp.hidden_at is null;

  return new;
end;
$$;

drop trigger if exists trg_messages_notify_on_insert on public.messages;
create trigger trg_messages_notify_on_insert
  after insert on public.messages
  for each row
  execute function public.notify_on_new_message();

create or replace function public.notify_on_new_offer()
returns trigger
language plpgsql
as $$
begin
  insert into public.notifications (user_id, type, entity_type, entity_id, title, body)
  values (
    new.farmer_id,
    'offer',
    'offer',
    new.id,
    'New Offer Received',
    'You received a new offer on your listing'
  );

  return new;
end;
$$;

drop trigger if exists trg_offers_notify_on_insert on public.offers;
create trigger trg_offers_notify_on_insert
  after insert on public.offers
  for each row
  execute function public.notify_on_new_offer();

-- ------------------------------
-- Profile edit fields
-- ------------------------------
alter table if exists public.user_profiles
  add column if not exists avatar_url text,
  add column if not exists address text,
  add column if not exists bio text;

-- ------------------------------
-- Offer policies refresh
-- ------------------------------
alter table if exists public.offers enable row level security;

drop policy if exists "Buyers can create offers" on public.offers;
drop policy if exists "Users can view their offers" on public.offers;
drop policy if exists "Farmers can update offer status" on public.offers;

drop policy if exists "Offer participants can view offers" on public.offers;
create policy "Offer participants can view offers"
  on public.offers for select
  to authenticated
  using (buyer_id = auth.uid() or farmer_id = auth.uid());

drop policy if exists "Buyers can create own offers" on public.offers;
create policy "Buyers can create own offers"
  on public.offers for insert
  to authenticated
  with check (buyer_id = auth.uid());

drop policy if exists "Offer participants can update offers" on public.offers;
create policy "Offer participants can update offers"
  on public.offers for update
  to authenticated
  using (buyer_id = auth.uid() or farmer_id = auth.uid())
  with check (buyer_id = auth.uid() or farmer_id = auth.uid());

drop trigger if exists trg_offers_touch_updated_at on public.offers;
create trigger trg_offers_touch_updated_at
  before update on public.offers
  for each row
  execute function public.touch_updated_at();

