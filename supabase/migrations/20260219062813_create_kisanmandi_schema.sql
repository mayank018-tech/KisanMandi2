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