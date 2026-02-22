import { supabase } from '../../lib/supabase';

export async function uploadPostImage(userId: string, file: File) {
  const timestamp = Date.now();
  const path = `${userId}/${timestamp}_${file.name.replace(/\s+/g, '_')}`;

  const bucket = 'posts';

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function createPost(userId: string, content: string, images: string[], lat?: number, lng?: number) {
  const post = {
    author_id: userId,
    content,
    location_lat: lat || null,
    location_lng: lng || null,
  } as any;

  const { data, error } = await supabase.from('posts').insert([post]).select().single();

  if (error) throw error;

  if (images && images.length > 0) {
    const imageRows = images.map((url, i) => ({ post_id: data.id, url, ordering: i }));
    const { error: imgError } = await supabase.from('post_images').insert(imageRows);
    if (imgError) throw imgError;
  }

  // Return the created post with images
  const { data: postWithImages, error: fetchError } = await supabase
    .from('posts')
    .select(`*, post_images(*)`)
    .eq('id', data.id)
    .single();

  if (fetchError) throw fetchError;
  return postWithImages;
}

export async function listPosts(limit = 20, since?: string) {
  // Simple listing by recency. Nearby sorting will be added later.
  const query = supabase
    .from('posts')
    .select(
      `*, post_images(url), post_likes(id,user_id), post_comments(id), user_profiles:author_id(user_profiles!inner(*))`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (since) query.gt('created_at', since);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function likePost(postId: string, userId: string) {
  const { data, error } = await supabase.from('post_likes').insert([
    { post_id: postId, user_id: userId },
  ]);
  return { data, error };
}

export async function unlikePost(postId: string, userId: string) {
  const { data, error } = await supabase
    .from('post_likes')
    .delete()
    .match({ post_id: postId, user_id: userId });
  return { data, error };
}

export async function addComment(postId: string, userId: string, content: string) {
  const { data, error } = await supabase.from('post_comments').insert([
    { post_id: postId, user_id: userId, content },
  ]).select('*').single();
  return { data, error };
}

export async function fetchComments(postId: string, limit = 50) {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*, user_profiles: user_id(user_profiles!inner(*))')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return { data, error };
}

export async function followUser(followerId: string, followingId: string) {
  const { data, error } = await supabase.from('follows').insert([
    { follower_id: followerId, following_id: followingId },
  ]);
  return { data, error };
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { data, error } = await supabase
    .from('follows')
    .delete()
    .match({ follower_id: followerId, following_id: followingId });
  return { data, error };
}

export async function savePost(userId: string, listingId: string) {
  const { data, error } = await supabase.from('saves').insert([
    { user_id: userId, listing_id: listingId },
  ]);
  return { data, error };
}

export async function unsavePost(userId: string, listingId: string) {
  const { data, error } = await supabase
    .from('saves')
    .delete()
    .match({ user_id: userId, listing_id: listingId });
  return { data, error };
}

export function subscribeToPostsRealtime(callback: (payload: any) => void) {
  return supabase
    .channel('posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, callback)
    .subscribe();
}

export function subscribeToLikesRealtime(callback: (payload: any) => void) {
  return supabase
    .channel('likes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, callback)
    .subscribe();
}
