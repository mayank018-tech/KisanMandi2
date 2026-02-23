-- Fix profile visibility for app joins/login and allow safe message read receipts

-- -----------------------------------------
-- user_profiles: allow authenticated profile joins
-- -----------------------------------------
DROP POLICY IF EXISTS "Authenticated can read basic profiles" ON public.user_profiles;
CREATE POLICY "Authenticated can read basic profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- -----------------------------------------
-- Mobile->email lookup via security definer RPC
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.get_login_email_by_mobile(p_mobile text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  email_value text;
BEGIN
  normalized := regexp_replace(COALESCE(p_mobile, ''), '\D', '', 'g');
  IF normalized = '' THEN
    RETURN NULL;
  END IF;

  SELECT up.email
  INTO email_value
  FROM public.user_profiles up
  WHERE up.mobile_number = normalized
     OR up.mobile_number LIKE '%' || normalized
  ORDER BY CASE WHEN up.mobile_number = normalized THEN 0 ELSE 1 END
  LIMIT 1;

  RETURN email_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_login_email_by_mobile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_login_email_by_mobile(text) TO anon, authenticated;

-- -----------------------------------------
-- messages: allow participants to set read_at, but not edit content unless sender
-- -----------------------------------------
DROP POLICY IF EXISTS "Participants can mark messages as read" ON public.messages;
CREATE POLICY "Participants can mark messages as read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_message_update_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.sender_id <> auth.uid() THEN
    IF NEW.content IS DISTINCT FROM OLD.content
      OR NEW.attachments IS DISTINCT FROM OLD.attachments
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
      OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
      OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
    THEN
      RAISE EXCEPTION 'Only sender can edit message content';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_enforce_update_rules ON public.messages;
CREATE TRIGGER trg_messages_enforce_update_rules
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_update_rules();
