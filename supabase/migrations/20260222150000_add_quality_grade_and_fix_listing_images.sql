-- Add quality_grade to crop_listings (if not exists)
ALTER TABLE crop_listings
ADD COLUMN IF NOT EXISTS quality_grade text DEFAULT 'A' CHECK (quality_grade IN ('A', 'B', 'C'));

-- Enable RLS on listing_images if not already enabled
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listing_images
DROP POLICY IF EXISTS "Anyone can view listing images" ON listing_images;
CREATE POLICY "Anyone can view listing images"
  ON listing_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Farmers can upload images for their listings" ON listing_images;
CREATE POLICY "Farmers can upload images for their listings"
  ON listing_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crop_listings
      WHERE crop_listings.id = listing_images.listing_id
      AND crop_listings.farmer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Farmers can delete their images" ON listing_images;
CREATE POLICY "Farmers can delete their images"
  ON listing_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM crop_listings
      WHERE crop_listings.id = listing_images.listing_id
      AND crop_listings.farmer_id = auth.uid()
    )
  );

-- enable RLS then allow authenticated users to insert/select their own posts (public visible)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'posts' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated can insert their posts" ON public.posts;
    CREATE POLICY "Authenticated can insert their posts"
      ON public.posts FOR INSERT
      TO authenticated
      WITH CHECK (author_id = auth.uid());

    DROP POLICY IF EXISTS "Public can read public posts or owner posts" ON public.posts;
    CREATE POLICY "Public can read public posts or owner posts"
      ON public.posts FOR SELECT
      TO authenticated, anon
      USING (visibility = 'public' OR author_id = auth.uid());

    DROP POLICY IF EXISTS "Owner can update own posts" ON public.posts;
    CREATE POLICY "Owner can update own posts"
      ON public.posts FOR UPDATE
      TO authenticated
      USING (author_id = auth.uid())
      WITH CHECK (author_id = auth.uid());

    DROP POLICY IF EXISTS "Owner can delete own posts" ON public.posts;
    CREATE POLICY "Owner can delete own posts"
      ON public.posts FOR DELETE
      TO authenticated
      USING (author_id = auth.uid());
  END IF;
END $$;

-- post_images: allow insert where the referenced post belongs to auth.uid()
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'post_images' AND relnamespace = 'public'::regnamespace) THEN
    ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone can view post images" ON public.post_images;
    CREATE POLICY "Anyone can view post images"
      ON public.post_images FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Authors can insert images for their posts" ON public.post_images;
    CREATE POLICY "Authors can insert images for their posts"
      ON public.post_images FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.posts p WHERE p.id = post_images.post_id AND p.author_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Authors can delete own post images" ON public.post_images;
    CREATE POLICY "Authors can delete own post images"
      ON public.post_images FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.posts p WHERE p.id = post_images.post_id AND p.author_id = auth.uid()
        )
      );
  END IF;
END $$;
