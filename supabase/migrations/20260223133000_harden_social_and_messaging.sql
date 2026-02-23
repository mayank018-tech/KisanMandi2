-- Harden social/messaging schema, policies, and performance indexes

-- ------------------------------
-- Table hardening
-- ------------------------------
ALTER TABLE IF EXISTS public.posts
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE IF EXISTS public.post_comments
  ADD COLUMN IF NOT EXISTS request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'offer', 'message', 'system')),
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ------------------------------
-- Indexes
-- ------------------------------
CREATE INDEX IF NOT EXISTS idx_posts_feed ON public.posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created_at ON public.posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created_at ON public.post_comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_post_comments_request ON public.post_comments (user_id, request_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_post_comments_user_request ON public.post_comments (user_id, request_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_user ON public.post_likes (post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_listing_status_created ON public.crop_listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants (user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- ------------------------------
-- RLS enable
-- ------------------------------
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------
-- Policies: posts
-- ------------------------------
DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
CREATE POLICY "Anyone can read posts"
  ON public.posts FOR SELECT
  TO authenticated, anon
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can create own posts" ON public.posts;
CREATE POLICY "Users can create own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- ------------------------------
-- Policies: likes
-- ------------------------------
DROP POLICY IF EXISTS "Anyone can read likes" ON public.post_likes;
CREATE POLICY "Anyone can read likes"
  ON public.post_likes FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Users can like as self" ON public.post_likes;
CREATE POLICY "Users can like as self"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can unlike as self" ON public.post_likes;
CREATE POLICY "Users can unlike as self"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------
-- Policies: comments
-- ------------------------------
DROP POLICY IF EXISTS "Anyone can read comments" ON public.post_comments;
CREATE POLICY "Anyone can read comments"
  ON public.post_comments FOR SELECT
  TO authenticated, anon
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can comment as self" ON public.post_comments;
CREATE POLICY "Users can comment as self"
  ON public.post_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.deleted_at IS NULL)
  );

DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
CREATE POLICY "Users can update own comments"
  ON public.post_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own comments" ON public.post_comments;
CREATE POLICY "Users can delete own comments"
  ON public.post_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------
-- Policies: follows
-- ------------------------------
DROP POLICY IF EXISTS "Users can read follows" ON public.follows;
CREATE POLICY "Users can read follows"
  ON public.follows FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can follow as self" ON public.follows;
CREATE POLICY "Users can follow as self"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can unfollow as self" ON public.follows;
CREATE POLICY "Users can unfollow as self"
  ON public.follows FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- ------------------------------
-- Policies: saves
-- ------------------------------
DROP POLICY IF EXISTS "Users can read own saves" ON public.saves;
CREATE POLICY "Users can read own saves"
  ON public.saves FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can save as self" ON public.saves;
CREATE POLICY "Users can save as self"
  ON public.saves FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can unsave as self" ON public.saves;
CREATE POLICY "Users can unsave as self"
  ON public.saves FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------
-- Policies: conversations and messages
-- ------------------------------
DROP POLICY IF EXISTS "Participants can read conversations" ON public.conversations;
CREATE POLICY "Participants can read conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated can create conversations" ON public.conversations;
CREATE POLICY "Authenticated can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Participants can read participant rows" ON public.conversation_participants;
CREATE POLICY "Participants can read participant rows"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can join themselves" ON public.conversation_participants;
CREATE POLICY "Users can join themselves"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Participants can read messages" ON public.messages;
CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can send messages as self" ON public.messages;
CREATE POLICY "Participants can send messages as self"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Senders can update own messages" ON public.messages;
CREATE POLICY "Senders can update own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Senders can delete own messages" ON public.messages;
CREATE POLICY "Senders can delete own messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- ------------------------------
-- Policies: notifications
-- ------------------------------
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------
-- Trigger helpers
-- ------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_conversation_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message = COALESCE(NEW.content, last_message),
    last_activity_at = timezone('utc', now())
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_touch_updated_at ON public.posts;
CREATE TRIGGER trg_posts_touch_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_post_comments_touch_updated_at ON public.post_comments;
CREATE TRIGGER trg_post_comments_touch_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_messages_touch_updated_at ON public.messages;
CREATE TRIGGER trg_messages_touch_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_post_likes_sync_count ON public.post_likes;
CREATE TRIGGER trg_post_likes_sync_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_like_count();

DROP TRIGGER IF EXISTS trg_post_comments_sync_count ON public.post_comments;
CREATE TRIGGER trg_post_comments_sync_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_comment_count();

DROP TRIGGER IF EXISTS trg_messages_update_conversation ON public.messages;
CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_activity();
