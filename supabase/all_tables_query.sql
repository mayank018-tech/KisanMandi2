/*
  # KisanMandi Database Schema

  ## Overview
  This migration creates the complete database schema for the KisanMandi application,
  a platform connecting farmers and buyers for direct crop sales and mandi price information.

  ## 1. New Tables

  ### `user_profiles`
  Extended user profile information linked to auth.users
  - `id` (uuid, primary key) - References auth.users.id
  - `full_name` (text) - User's complete name
  - `mobile_number` (text, unique) - Contact number for login
  - `role` (text) - User role: 'farmer' or 'buyer'
  - `state` (text) - State location
  - `district` (text) - District location
  - `village` (text) - Village location
  - `language_preference` (text) - Preferred language (en/hi/gu)
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `crop_listings`
  Farmer's crop listings for sale
  - `id` (uuid, primary key) - Unique listing identifier
  - `farmer_id` (uuid) - References user_profiles.id
  - `crop_name` (text) - Name of the crop
  - `quantity` (numeric) - Quantity available (in kg/quintal)
  - `unit` (text) - Unit of measurement
  - `expected_price` (numeric) - Expected price per unit
  - `location` (text) - Specific location details
  - `contact_number` (text) - Contact number for this listing
  - `photo_url` (text, optional) - Photo of the crop
  - `description` (text, optional) - Additional details
  - `status` (text) - Status: 'active', 'sold', 'expired'
  - `created_at` (timestamptz) - Listing creation time
  - `updated_at` (timestamptz) - Last update time

  ### `offers`
  Buyer offers sent to farmers
  - `id` (uuid, primary key) - Unique offer identifier
  - `listing_id` (uuid) - References crop_listings.id
  - `buyer_id` (uuid) - References user_profiles.id
  - `farmer_id` (uuid) - References user_profiles.id
  - `offer_price` (numeric) - Offered price per unit
  - `message` (text) - Message from buyer to farmer
  - `status` (text) - Status: 'pending', 'accepted', 'rejected'
  - `created_at` (timestamptz) - Offer creation time

  ### `mandi_prices`
  Daily mandi (market) price information
  - `id` (uuid, primary key) - Unique price record identifier
  - `crop_name` (text) - Name of the crop
  - `state` (text) - State name
  - `district` (text) - District name
  - `mandi_name` (text) - Market name
  - `min_price` (numeric) - Minimum price
  - `max_price` (numeric) - Maximum price
  - `average_price` (numeric) - Average/modal price
  - `price_date` (date) - Date of price record
  - `created_at` (timestamptz) - Record creation time

  ## 2. Security
  - Enable RLS on all tables
  - Users can read their own profile
  - Users can update their own profile
  - Farmers can create, read, update, delete their own listings
  - Buyers can read all active listings
  - Buyers can create offers and read their own offers
  - Farmers can read offers for their listings
  - All authenticated users can read mandi prices

  ## 3. Indexes
  - Index on mobile_number for fast login lookups
  - Index on crop_listings.status for filtering active listings
  - Index on mandi_prices (crop_name, state, district, price_date) for efficient queries
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  mobile_number text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('farmer', 'buyer')),
  state text NOT NULL,
  district text NOT NULL,
  village text NOT NULL,
  language_preference text DEFAULT 'en' CHECK (language_preference IN ('en', 'hi', 'gu')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create crop_listings table
CREATE TABLE IF NOT EXISTS crop_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  crop_name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'kg',
  expected_price numeric NOT NULL CHECK (expected_price > 0),
  location text NOT NULL,
  contact_number text NOT NULL,
  photo_url text,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES crop_listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  offer_price numeric NOT NULL CHECK (offer_price > 0),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Create mandi_prices table
CREATE TABLE IF NOT EXISTS mandi_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name text NOT NULL,
  state text NOT NULL,
  district text NOT NULL,
  mandi_name text NOT NULL,
  min_price numeric NOT NULL CHECK (min_price >= 0),
  max_price numeric NOT NULL CHECK (max_price >= min_price),
  average_price numeric NOT NULL CHECK (average_price >= min_price AND average_price <= max_price),
  price_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_mobile ON user_profiles(mobile_number);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_crop_listings_status ON crop_listings(status);
CREATE INDEX IF NOT EXISTS idx_crop_listings_farmer ON crop_listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_crop_listings_crop_name ON crop_listings(crop_name);
CREATE INDEX IF NOT EXISTS idx_offers_listing ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_farmer ON offers(farmer_id);
CREATE INDEX IF NOT EXISTS idx_mandi_prices_search ON mandi_prices(crop_name, state, district, price_date);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandi_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for crop_listings
CREATE POLICY "Anyone can view active listings"
  ON crop_listings FOR SELECT
  TO authenticated
  USING (status = 'active' OR farmer_id = auth.uid());

CREATE POLICY "Farmers can create own listings"
  ON crop_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    farmer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'farmer')
  );

CREATE POLICY "Farmers can update own listings"
  ON crop_listings FOR UPDATE
  TO authenticated
  USING (farmer_id = auth.uid())
  WITH CHECK (farmer_id = auth.uid());

CREATE POLICY "Farmers can delete own listings"
  ON crop_listings FOR DELETE
  TO authenticated
  USING (farmer_id = auth.uid());

-- RLS Policies for offers
CREATE POLICY "Buyers can create offers"
  ON offers FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = auth.uid() AND
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'buyer')
  );

CREATE POLICY "Users can view their offers"
  ON offers FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid() OR farmer_id = auth.uid());

CREATE POLICY "Farmers can update offer status"
  ON offers FOR UPDATE
  TO authenticated
  USING (farmer_id = auth.uid())
  WITH CHECK (farmer_id = auth.uid());

-- RLS Policies for mandi_prices
CREATE POLICY "Anyone can view mandi prices"
  ON mandi_prices FOR SELECT
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crop_listings_updated_at
  BEFORE UPDATE ON crop_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

/*
  # Add email column to user_profiles

  ## Changes
  - Add email column to user_profiles table to enable mobile number login
  - The email is needed to map mobile numbers to Supabase auth users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email text UNIQUE;
  END IF;
END $$;

-- Migration: Add social feed, listings images, chat, deals, and ratings tables
-- Run with Supabase migrations

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text,
  location_lat double precision,
  location_lng double precision,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  updated_at timestamp with time zone DEFAULT timezone('utc', now()),
  visibility text DEFAULT 'public'
);

CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_location_idx ON posts (location_lat, location_lng);

-- Post images
CREATE TABLE IF NOT EXISTS post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  ordering int DEFAULT 0
);

-- Post likes
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE (post_id, user_id)
);

-- Post comments (supporting threaded comments via parent_comment_id)
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Follows (user follows another user)
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE (follower_id, following_id)
);

-- Listing images
CREATE TABLE IF NOT EXISTS listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES crop_listings(id) ON DELETE CASCADE,
  url text NOT NULL,
  ordering int DEFAULT 0
);

-- Saves / bookmarks for listings
CREATE TABLE IF NOT EXISTS saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES crop_listings(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE (user_id, listing_id)
);

-- Conversations and messages
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text,
  last_message text,
  last_activity_at timestamp with time zone DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT timezone('utc', now()),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text,
  attachments jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  read_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages (conversation_id, created_at DESC);

-- Deals and ratings
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES crop_listings(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  farmer_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES offers(id) ON DELETE SET NULL,
  status text DEFAULT 'initiated',
  completed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rated_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);


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

-- ------------------------------
-- Compatibility for current app queries
-- ------------------------------
-- user_profiles: current UI joins/query patterns need authenticated read access.
DROP POLICY IF EXISTS "Authenticated can read basic profiles" ON public.user_profiles;
CREATE POLICY "Authenticated can read basic profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Mobile-to-email lookup used in AuthContext sign-in flow.
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

-- Allow conversation participants to set read_at, while preventing non-senders
-- from editing content/attachments/deletion fields.
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


-- Create public storage bucket for listing images (idempotent, PG14-safe)
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('listings', 'listings', true)
  on conflict (id) do update set public = true;
end$$;

-- Allow public reads
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'public_read_listings_bucket') then
    create policy public_read_listings_bucket
    on storage.objects for select
    to public
    using (bucket_id = 'listings');
  end if;
end$$;

-- Allow authenticated users to upload to the bucket
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'auth_upload_listings_bucket') then
    create policy auth_upload_listings_bucket
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'listings');
  end if;
end$$;

-- Allow authenticated users to delete objects in the bucket
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'auth_delete_listings_bucket') then
    create policy auth_delete_listings_bucket
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'listings');
  end if;
end$$;


-- Align storage policies for listings bucket with multi-image uploads
-- Allows authenticated users (and service_role) to insert/select/delete objects in the listings bucket

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('listings', 'listings', true)
  on conflict (id) do update set public = true;
end$$;

-- Select policy (public)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'listings_public_select') then
    create policy listings_public_select
    on storage.objects for select
    to public
    using (bucket_id = 'listings');
  end if;
end$$;

-- Insert policy (authenticated + service role)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'listings_auth_insert') then
    create policy listings_auth_insert
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'listings');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'listings_service_insert') then
    create policy listings_service_insert
    on storage.objects for insert
    to service_role
    with check (bucket_id = 'listings');
  end if;
end$$;

-- Delete policy (authenticated + service role)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'listings_auth_delete') then
    create policy listings_auth_delete
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'listings');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'listings_service_delete') then
    create policy listings_service_delete
    on storage.objects for delete
    to service_role
    using (bucket_id = 'listings');
  end if;
end$$;


 

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


-- Chat presence + unread performance hardening

-- ------------------------------
-- Presence fields on profiles
-- ------------------------------
alter table if exists public.user_profiles
  add column if not exists is_online boolean not null default false,
  add column if not exists last_seen_at timestamptz default timezone('utc', now());

create index if not exists idx_user_profiles_online_last_seen
  on public.user_profiles (is_online, last_seen_at desc);

-- ------------------------------
-- Message unread/query indexes
-- ------------------------------
create index if not exists idx_messages_unread_by_conversation
  on public.messages (conversation_id, created_at desc)
  where read_at is null;

create index if not exists idx_messages_conversation_read_at
  on public.messages (conversation_id, read_at, created_at desc);

-- ------------------------------
-- Conversation update policy
-- Needed for trigger-driven metadata updates on active conversations.
-- ------------------------------
drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
  on public.conversations
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  );

-- ------------------------------
-- Presence heartbeat RPC
-- ------------------------------
create or replace function public.touch_presence(p_is_online boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set
    is_online = p_is_online,
    last_seen_at = timezone('utc', now())
  where id = auth.uid();
end;
$$;

revoke all on function public.touch_presence(boolean) from public;
grant execute on function public.touch_presence(boolean) to authenticated;


-- Enforce unique private conversation per user pair

alter table if exists public.conversations
  add column if not exists conversation_key text;

-- Backfill keys only for clean 1:1 conversations and skip conflicting duplicates.
with conversation_pairs as (
  select
    cp.conversation_id,
    min(cp.user_id::text) as user_a,
    max(cp.user_id::text) as user_b,
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


-- Seed default mandi prices for Gujarat markets.
-- Idempotent insert: avoids duplicates by crop/location/mandi/date.

with seed_data (crop_name, state, district, mandi_name, min_price, max_price, average_price, price_date) as (
  values
    ('Cotton', 'Gujarat', 'Rajkot', 'Rajkot Yard', 6480, 7220, 6860, current_date),
    ('Groundnut', 'Gujarat', 'Junagadh', 'Junagadh APMC', 5120, 5890, 5530, current_date),
    ('Wheat', 'Gujarat', 'Ahmedabad', 'Ahmedabad APMC', 2360, 2580, 2470, current_date),
    ('Maize', 'Gujarat', 'Dahod', 'Dahod Mandi', 1870, 2140, 2000, current_date),
    ('Bajra', 'Gujarat', 'Banaskantha', 'Palanpur APMC', 2140, 2410, 2270, current_date),
    ('Castor Seed', 'Gujarat', 'Mehsana', 'Unjha APMC', 5600, 6240, 5920, current_date),
    ('Cumin (Jeera)', 'Gujarat', 'Patan', 'Unjha APMC', 18000, 21300, 19600, current_date),
    ('Coriander', 'Gujarat', 'Rajkot', 'Gondal Mandi', 6400, 7420, 6890, current_date),
    ('Onion', 'Gujarat', 'Bhavnagar', 'Bhavnagar APMC', 1320, 2070, 1690, current_date),
    ('Potato', 'Gujarat', 'Sabarkantha', 'Himatnagar APMC', 980, 1520, 1240, current_date),
    ('Tomato', 'Gujarat', 'Surat', 'Surat APMC', 900, 1710, 1290, current_date),
    ('Chana', 'Gujarat', 'Amreli', 'Amreli Mandi', 5210, 5780, 5490, current_date),
    ('Mustard', 'Gujarat', 'Kheda', 'Nadiad APMC', 5360, 5970, 5660, current_date),
    ('Soybean', 'Gujarat', 'Vadodara', 'Vadodara APMC', 4020, 4590, 4310, current_date),
    ('Tur (Arhar)', 'Gujarat', 'Anand', 'Anand Mandi', 6480, 7220, 6850, current_date),

    ('Cotton', 'Gujarat', 'Amreli', 'Amreli APMC', 6390, 7090, 6720, current_date - 1),
    ('Groundnut', 'Gujarat', 'Rajkot', 'Rajkot Yard', 5070, 5830, 5470, current_date - 1),
    ('Wheat', 'Gujarat', 'Vadodara', 'Padra APMC', 2320, 2540, 2430, current_date - 1),
    ('Maize', 'Gujarat', 'Panchmahal', 'Godhra Mandi', 1820, 2100, 1950, current_date - 1),
    ('Bajra', 'Gujarat', 'Jamnagar', 'Jamnagar APMC', 2090, 2360, 2230, current_date - 1),
    ('Castor Seed', 'Gujarat', 'Banaskantha', 'Deesa APMC', 5520, 6170, 5860, current_date - 1),
    ('Cumin (Jeera)', 'Gujarat', 'Mehsana', 'Unjha APMC', 17650, 20800, 19120, current_date - 1),
    ('Coriander', 'Gujarat', 'Surendranagar', 'Surendranagar APMC', 6280, 7310, 6760, current_date - 1),
    ('Onion', 'Gujarat', 'Ahmedabad', 'Ahmedabad APMC', 1260, 1990, 1630, current_date - 1),
    ('Potato', 'Gujarat', 'Kheda', 'Nadiad APMC', 940, 1470, 1190, current_date - 1),
    ('Tomato', 'Gujarat', 'Navsari', 'Navsari APMC', 860, 1650, 1240, current_date - 1),
    ('Chana', 'Gujarat', 'Bhavnagar', 'Mahuva APMC', 5150, 5720, 5420, current_date - 1),
    ('Mustard', 'Gujarat', 'Patan', 'Siddhpur APMC', 5290, 5890, 5590, current_date - 1),
    ('Soybean', 'Gujarat', 'Bharuch', 'Bharuch Mandi', 3950, 4510, 4240, current_date - 1),
    ('Tur (Arhar)', 'Gujarat', 'Surat', 'Surat APMC', 6410, 7140, 6780, current_date - 1),

    ('Cotton', 'Gujarat', 'Surendranagar', 'Surendranagar APMC', 6310, 7010, 6650, current_date - 2),
    ('Groundnut', 'Gujarat', 'Porbandar', 'Porbandar Mandi', 4990, 5750, 5380, current_date - 2),
    ('Wheat', 'Gujarat', 'Mehsana', 'Visnagar APMC', 2290, 2510, 2400, current_date - 2),
    ('Maize', 'Gujarat', 'Aravalli', 'Modasa Mandi', 1790, 2060, 1920, current_date - 2),
    ('Bajra', 'Gujarat', 'Kutch', 'Bhuj APMC', 2050, 2320, 2190, current_date - 2),
    ('Castor Seed', 'Gujarat', 'Patan', 'Patan APMC', 5460, 6110, 5790, current_date - 2),
    ('Cumin (Jeera)', 'Gujarat', 'Banaskantha', 'Palanpur APMC', 17320, 20450, 18880, current_date - 2),
    ('Coriander', 'Gujarat', 'Jamnagar', 'Jamnagar APMC', 6190, 7210, 6690, current_date - 2),
    ('Onion', 'Gujarat', 'Rajkot', 'Gondal Mandi', 1210, 1930, 1570, current_date - 2),
    ('Potato', 'Gujarat', 'Anand', 'Anand Mandi', 910, 1420, 1160, current_date - 2),
    ('Tomato', 'Gujarat', 'Vadodara', 'Vadodara APMC', 830, 1590, 1190, current_date - 2),
    ('Chana', 'Gujarat', 'Junagadh', 'Junagadh APMC', 5090, 5650, 5350, current_date - 2),
    ('Mustard', 'Gujarat', 'Ahmedabad', 'Bavla APMC', 5230, 5820, 5520, current_date - 2),
    ('Soybean', 'Gujarat', 'Surendranagar', 'Limbdi APMC', 3890, 4440, 4160, current_date - 2),
    ('Tur (Arhar)', 'Gujarat', 'Bhavnagar', 'Bhavnagar APMC', 6350, 7070, 6710, current_date - 2)
)
insert into public.mandi_prices (
  crop_name,
  state,
  district,
  mandi_name,
  min_price,
  max_price,
  average_price,
  price_date
)
select
  s.crop_name,
  s.state,
  s.district,
  s.mandi_name,
  s.min_price,
  s.max_price,
  s.average_price,
  s.price_date
from seed_data s
where not exists (
  select 1
  from public.mandi_prices m
  where m.crop_name = s.crop_name
    and m.state = s.state
    and m.district = s.district
    and m.mandi_name = s.mandi_name
    and m.price_date = s.price_date
);



