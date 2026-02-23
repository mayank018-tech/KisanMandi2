-- Enable RLS and policies for post_comments to allow authenticated commenting
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'post_comments' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated can insert their comments" ON public.post_comments;
    CREATE POLICY "Authenticated can insert their comments"
      ON public.post_comments FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS "Public can read comments" ON public.post_comments;
    CREATE POLICY "Public can read comments"
      ON public.post_comments FOR SELECT
      TO authenticated, anon
      USING (true);

    DROP POLICY IF EXISTS "Owner can update own comments" ON public.post_comments;
    CREATE POLICY "Owner can update own comments"
      ON public.post_comments FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS "Owner can delete own comments" ON public.post_comments;
    CREATE POLICY "Owner can delete own comments"
      ON public.post_comments FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
