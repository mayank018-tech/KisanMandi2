import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { likePost, unlikePost, addComment, fetchComments, followUser, unfollowUser, savePost, unsavePost } from '../../features/community/api';

export default function PostCard({ post }: { post: any }) {
  const { profile } = useAuth();
  const [liked, setLiked] = useState<boolean>(() => {
    try {
      return Array.isArray(post.post_likes) && post.post_likes.some((l: any) => l.user_id === profile?.id);
    } catch {
      return false;
    }
  });
  const [likesCount, setLikesCount] = useState<number>(() => (post.post_likes ? post.post_likes.length : 0));
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>(post.post_comments || []);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [following, setFollowing] = useState<boolean>(() => false);
  const [saved, setSaved] = useState<boolean>(() => false);

  const postedImages = useMemo(() => post.post_images || [], [post.post_images]);

  const handleLike = async () => {
    if (!profile) return alert('Please login to like posts');
    // optimistic
    setLiked((s) => !s);
    setLikesCount((c) => (liked ? c - 1 : c + 1));

    try {
      if (!liked) {
        await likePost(post.id, profile.id);
      } else {
        await unlikePost(post.id, profile.id);
      }
    } catch (err) {
      // revert on error
      setLiked((s) => !s);
      setLikesCount((c) => (liked ? c + 1 : c - 1));
      console.error('Like failed', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return alert('Login to comment');
    if (!commentText.trim()) return;
    setCommentLoading(true);
    const temp = { id: `temp-${Date.now()}`, user_id: profile.id, content: commentText, created_at: 'just now', user: profile };
    setComments((s) => [...s, temp]);
    setCommentText('');
    try {
      const { data, error } = await addComment(post.id, profile.id, temp.content);
      if (error) throw error;
      // replace temp with real comment
      setComments((s) => s.map((c) => (c.id === temp.id ? data : c)));
    } catch (err) {
      console.error('Comment failed', err);
      setComments((s) => s.filter((c) => c.id !== temp.id));
      alert('Failed to add comment');
    }
    setCommentLoading(false);
  };

  const openComments = async () => {
    setShowComments((s) => !s);
    if (!showComments) {
      try {
        const { data } = await fetchComments(post.id);
        if (data) setComments(data);
      } catch (err) {
        console.error('Failed to fetch comments', err);
      }
    }
  };

  const handleFollow = async () => {
    if (!profile) return alert('Login to follow');
    setFollowing((s) => !s);
    try {
      if (!following) {
        await followUser(profile.id, post.author_id);
      } else {
        await unfollowUser(profile.id, post.author_id);
      }
    } catch (err) {
      setFollowing((s) => !s);
      console.error('Follow failed', err);
    }
  };

  const handleSave = async () => {
    if (!profile) return alert('Login to save');
    setSaved((s) => !s);
    try {
      if (!saved) {
        await savePost(profile.id, post.id);
      } else {
        await unsavePost(profile.id, post.id);
      }
    } catch (err) {
      setSaved((s) => !s);
      console.error('Save failed', err);
    }
  };

  return (
    <article className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-3 mb-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div>
            <div className="font-semibold">{post.user_profiles?.full_name || post.author_name || 'User'}</div>
            <div className="text-xs text-gray-500">{post.created_at || 'just now'}</div>
          </div>
        </div>
        <button
          onClick={handleFollow}
          className={`px-3 py-1 text-sm rounded ${
            following ? 'bg-green-200 text-green-800' : 'bg-green-600 text-white'
          }`}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>

      <div className="text-gray-800 mb-3">{post.content}</div>

      {postedImages.length > 0 && (
        <div className={`grid gap-2 mb-3 ${postedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {postedImages.map((img: any, i: number) => (
            <img key={i} src={img.url} alt={`post-${i}`} className="w-full h-40 object-cover rounded" />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded ${liked ? 'bg-green-100 text-green-700' : 'text-gray-600'}`}>
              👍
            </span>
            <span>{likesCount}</span>
          </button>
          <button onClick={openComments} className="flex items-center gap-2">💬 <span>{comments.length}</span></button>
          <button onClick={handleSave} className="flex items-center gap-2">
            <span>{saved ? '🔖' : '🔕'}</span> Save
          </button>
        </div>
        <div className="text-xs">Nearby</div>
      </div>

      {showComments && (
        <div className="mt-4">
          <div className="space-y-2 mb-3">
            {comments.map((c: any) => (
              <div key={c.id} className="p-2 bg-gray-50 rounded">
                <div className="text-sm font-semibold">{c.user_profiles?.full_name || c.user_id}</div>
                <div className="text-sm text-gray-700">{c.content}</div>
                <div className="text-xs text-gray-400">{c.created_at}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
              placeholder="Write a comment..."
            />
            <button disabled={commentLoading} className="bg-green-600 text-white px-4 py-2 rounded">
              {commentLoading ? '...' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
