  -- Fix chat send failures caused by notification trigger RLS checks.
  -- Trigger functions write to notifications for other users, so they must run as definer.

  create or replace function public.notify_on_new_message()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
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

  create or replace function public.notify_on_new_offer()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
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
