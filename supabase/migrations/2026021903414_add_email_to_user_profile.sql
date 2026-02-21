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