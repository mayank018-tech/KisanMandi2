import { supabase } from '../../lib/supabase';

export async function submitRating(farmerId: string, rating: number, comment: string, raterId: string) {
  const { data, error } = await supabase
    .from('ratings')
    .insert([{ farmer_id: farmerId, rating, comment, rater_id: raterId }])
    .select();

  if (error) throw error;
  return data;
}

export async function getFarmerStats(farmerId: string) {
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select('rating')
    .eq('farmer_id', farmerId);

  if (error) throw error;

  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('id')
    .eq('farmer_id', farmerId)
    .eq('status', 'completed');

  if (dealsError) throw dealsError;

  const avgRating = ratings && ratings.length > 0 
    ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : 0;

  return {
    averageRating: parseFloat(avgRating as string),
    totalRatings: ratings?.length || 0,
    completedDeals: deals?.length || 0,
    isVerified: parseFloat(avgRating as string) >= 4.0 && (ratings?.length || 0) >= 5,
  };
}

export async function getFarmerRatings(farmerId: string, limit = 5, offset = 0) {
  const { data, error } = await supabase
    .from('ratings')
    .select(`id, rating, comment, created_at, user_profiles:rater_id(full_name, avatar_url)`)
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

export async function hasUserRatedFarmer(userId: string, farmerId: string) {
  const { data, error } = await supabase
    .from('ratings')
    .select('id')
    .eq('farmer_id', farmerId)
    .eq('rater_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}
