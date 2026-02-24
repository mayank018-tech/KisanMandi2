-- Reliable private chat creation/get for 1:1 messaging

alter table if exists public.conversations
  add column if not exists conversation_key text;

create or replace function public.create_or_get_private_conversation(p_target_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_conv uuid;
  v_key text;
  v_subject text;
begin
  v_me := auth.uid();

  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user is null then
    raise exception 'Target user is required';
  end if;

  if p_target_user = v_me then
    raise exception 'Cannot create conversation with self';
  end if;

  v_key := least(v_me::text, p_target_user::text) || ':' || greatest(v_me::text, p_target_user::text);

  -- Serialize per user-pair and avoid duplicate threads under concurrent clicks.
  perform pg_advisory_xact_lock(hashtext(v_key));

  -- Fast path when key already exists.
  select c.id
  into v_conv
  from public.conversations c
  where c.conversation_key = v_key
  limit 1;

  -- Backward-compat: find existing 1:1 conversation even if key is missing.
  if v_conv is null then
    select cp.conversation_id
    into v_conv
    from public.conversation_participants cp
    where cp.user_id in (v_me, p_target_user)
    group by cp.conversation_id
    having count(distinct cp.user_id) = 2
       and (
         select count(*)
         from public.conversation_participants cp2
         where cp2.conversation_id = cp.conversation_id
       ) = 2
    limit 1;

    if v_conv is not null then
      update public.conversations
      set conversation_key = coalesce(conversation_key, v_key)
      where id = v_conv;
    end if;
  end if;

  -- Create if not found.
  if v_conv is null then
    select up.full_name
    into v_subject
    from public.user_profiles up
    where up.id = p_target_user;

    insert into public.conversations (subject, conversation_key)
    values (coalesce(v_subject, 'Chat'), v_key)
    returning id into v_conv;
  end if;

  -- Ensure both participants exist.
  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conv, v_me)
  on conflict (conversation_id, user_id) do nothing;

  insert into public.conversation_participants (conversation_id, user_id)
  values (v_conv, p_target_user)
  on conflict (conversation_id, user_id) do nothing;

  return v_conv;
end;
$$;

revoke all on function public.create_or_get_private_conversation(uuid) from public;
grant execute on function public.create_or_get_private_conversation(uuid) to authenticated;
