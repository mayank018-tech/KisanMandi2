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
