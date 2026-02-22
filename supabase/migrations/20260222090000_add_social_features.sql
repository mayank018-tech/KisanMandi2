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
