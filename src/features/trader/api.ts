import { supabase } from '../../lib/supabase';

export async function fetchAllListings(
  cropName?: string,
  minPrice?: number,
  maxPrice?: number,
  location?: string,
  limit = 20,
  offset = 0
) {
  let query = supabase
    .from('crop_listings')
    .select(`*, listing_images(*), user_profiles:farmer_id(full_name, mobile_number, state, district)`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (cropName) {
    query = query.ilike('crop_name', `%${cropName}%`);
  }

  if (minPrice) {
    query = query.gte('expected_price', minPrice);
  }

  if (maxPrice) {
    query = query.lte('expected_price', maxPrice);
  }

  if (location) {
    query = query.ilike('location', `%${location}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getTraderBookmarks(userId: string) {
  const { data, error } = await supabase
    .from('saves')
    .select('listing_id, crop_listings(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function isListingSaved(userId: string, listingId: string) {
  const { data, error } = await supabase
    .from('saves')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}
