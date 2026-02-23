import { supabase } from '../../lib/supabase';

export async function uploadListingImage(userId: string, listingId: string, file: File) {
  const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  const ext = safeName.split('.').pop() || 'jpg';
  const unique = (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const path = `${userId}/${listingId}/${unique}.${ext}`;
  const bucket = 'listings';

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true, // avoid failures on name collisions
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function addListingImages(listingId: string, urls: string[]) {
  if (!urls.length) return;
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
