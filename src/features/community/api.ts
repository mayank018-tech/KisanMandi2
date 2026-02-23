import { supabase } from '../../lib/supabase';

export type CommunityPost = {
  id: string;
  author_id: string;
  content: string | null;
  created_at: string;
  like_count?: number | null;
  comment_count?: number | null;
  post_images?: Array<{ url: string; ordering?: number | null }>;
  post_likes?: Array<{ user_id: string }>;
  user_profiles?: {
    id: string;
    full_name: string;
    role?: string | null;
    state?: string | null;
    district?: string | null;
    village?: string | null;
  } | null;
};

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

  const { data, error } = await supabase
    .from('posts')
    .insert([post])
    .select(
      `
        id,
        author_id,
        content,
        created_at,
        like_count,
        comment_count,
        user_profiles!posts_author_id_fkey(id, full_name, role, state, district, village)
      `
    )
    .single();

  if (error) throw error;

  if (images && images.length > 0) {
    const imageRows = images.map((url, i) => ({ post_id: data.id, url, ordering: i }));
    const { error: imgError } = await supabase.from('post_images').insert(imageRows);
    if (imgError) throw imgError;
  }

  // Return the created post with images
  const { data: postWithImages, error: fetchError } = await supabase
    .from('posts')
    .select(
      `
        id,
        author_id,
        content,
        created_at,
        like_count,
        comment_count,
        post_images(url, ordering),
        post_likes(user_id),
        user_profiles!posts_author_id_fkey(id, full_name, role, state, district, village)
      `
    )
    .eq('id', data.id)
    .single();

  if (fetchError) throw fetchError;
  return postWithImages;
}

export async function listPosts(options?: { limit?: number; before?: string; since?: string }): Promise<CommunityPost[]> {
  const limit = options?.limit ?? 20;
  const query = supabase
    .from('posts')
    .select(
      `
        id,
        author_id,
        content,
        created_at,
        like_count,
        comment_count,
        post_images(url, ordering),
        post_likes(user_id),
        user_profiles!posts_author_id_fkey(id, full_name, role, state, district, village)
      `
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (options?.since) query.gt('created_at', options.since);
  if (options?.before) query.lt('created_at', options.before);

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

export async function addComment(postId: string, userId: string, content: string, requestId: string) {
  const { data, error } = await supabase
    .from('post_comments')
    .insert([{ post_id: postId, user_id: userId, content, request_id: requestId }])
    .select('id, post_id, user_id, content, request_id, created_at, user_profiles!post_comments_user_id_fkey(id, full_name, role, state, district, village)')
    .single();

  if (error && error.code === '23505') {
    const { data: existing } = await supabase
      .from('post_comments')
      .select('id, post_id, user_id, content, request_id, created_at, user_profiles!post_comments_user_id_fkey(id, full_name, role, state, district, village)')
      .eq('user_id', userId)
      .eq('request_id', requestId)
      .single();
    return { data: existing, error: null };
  }

  return { data, error };
}

export async function fetchComments(postId: string, limit = 50) {
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, post_id, user_id, content, request_id, created_at, user_profiles!post_comments_user_id_fkey(id, full_name, role, state, district, village)')
    .eq('post_id', postId)
    .is('deleted_at', null)
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, callback)
    .subscribe();
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function updatePost(postId: string, content: string) {
  const { data, error } = await supabase
    .from('posts')
    .update({ content })
    .eq('id', postId)
    .select(
      `
        id,
        author_id,
        content,
        created_at,
        like_count,
        comment_count,
        post_images(url, ordering),
        post_likes(user_id),
        user_profiles!posts_author_id_fkey(id, full_name, role, state, district, village)
      `
    )
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToLikesRealtime(callback: (payload: any) => void) {
  return supabase
    .channel('likes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, callback)
    .subscribe();
}
