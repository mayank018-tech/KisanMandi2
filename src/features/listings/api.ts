import { supabase } from '../../lib/supabase';

export async function uploadListingImage(userId: string, listingId: string, file: File) {
  const timestamp = Date.now();
  const path = `${userId}/${listingId}/${timestamp}_${file.name.replace(/\s+/g, '_')}`;
  const bucket = 'listings';

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function addListingImages(listingId: string, urls: string[]) {
  const imageRows = urls.map((url, i) => ({ listing_id: listingId, url, ordering: i }));
  const { error } = await supabase.from('listing_images').insert(imageRows);
  if (error) throw error;
}

export async function getListingImages(listingId: string) {
  const { data, error } = await supabase
    .from('listing_images')
    .select('*')
    .eq('listing_id', listingId)
    .order('ordering', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function deleteListingImage(imageId: string) {
  const { error } = await supabase.from('listing_images').delete().eq('id', imageId);
  if (error) throw error;
}
