import React, { useMemo, useState } from 'react';
import { MessageSquare, Share2, ThumbsUp, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { addComment, deletePost, fetchComments, likePost, unlikePost } from '../../features/community/api';
import SafeImage from '../common/SafeImage';
import { navigateTo } from '../../lib/navigation';

type PostCardProps = {
  post: any;
  onDeleted?: (postId: string) => void;
};

function formatTimeAgo(value?: string) {
  if (!value) return 'now';
  const ts = new Date(value).getTime();
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function roleLabel(role?: string | null) {
  if (!role) return 'Member';
  if (role.toLowerCase() === 'buyer') return 'Trader';
  return role[0].toUpperCase() + role.slice(1).toLowerCase();
}

export default function PostCard({ post, onDeleted }: PostCardProps) {
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [liked, setLiked] = useState<boolean>(() => {
    if (!Array.isArray(post.post_likes) || !profile?.id) return false;
    return post.post_likes.some((like: any) => like.user_id === profile.id);
  });
  const [likesCount, setLikesCount] = useState<number>(() => {
    if (typeof post.like_count === 'number') return post.like_count;
    if (Array.isArray(post.post_likes)) return post.post_likes.length;
    return 0;
  });
  const [commentCount, setCommentCount] = useState<number>(() => {
    if (typeof post.comment_count === 'number') return post.comment_count;
    if (Array.isArray(post.post_comments)) return post.post_comments.length;
    return 0;
  });

  const [showComments, setShowComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const postedImages = useMemo(() => post.post_images || [], [post.post_images]);
  const location = [post.user_profiles?.district, post.user_profiles?.state].filter(Boolean).join(', ');
  const isOwner = profile?.id === post.author_id;

  const handleLike = async () => {
    if (!profile) return;

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));

    try {
      if (nextLiked) {
        await likePost(post.id, profile.id);
      } else {
        await unlikePost(post.id, profile.id);
      }
    } catch (err) {
      setLiked(!nextLiked);
      setLikesCount((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
      console.error('Like failed', err);
    }
  };

  const toggleComments = async () => {
    const nextOpen = !showComments;
    setShowComments(nextOpen);

    if (nextOpen && !commentsLoaded) {
      try {
        const { data, error } = await fetchComments(post.id);
        if (error) throw error;
        setComments(data || []);
        setCommentsLoaded(true);
      } catch (err) {
        console.error('Failed to fetch comments', err);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || commentLoading) return;

    const content = commentText.trim();
    if (!content) return;

    const requestId = crypto.randomUUID();
    const tempId = `temp-${requestId}`;
    const optimisticComment = {
      id: tempId,
      request_id: requestId,
      post_id: post.id,
      user_id: profile.id,
      content,
      created_at: new Date().toISOString(),
      user_profiles: {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role,
        district: profile.district,
        state: profile.state,
      },
    };

    setCommentLoading(true);
    setCommentText('');
    setComments((prev) => [...prev, optimisticComment]);
    setCommentCount((count) => count + 1);

    try {
      const { data, error } = await addComment(post.id, profile.id, content, requestId);
      if (error) throw error;

      setComments((prev) =>
        prev.map((comment) => (comment.id === tempId ? (data || optimisticComment) : comment))
      );
    } catch (err) {
      setComments((prev) => prev.filter((comment) => comment.id !== tempId));
      setCommentCount((count) => Math.max(0, count - 1));
      console.error('Comment failed', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('confirmDeletePost', 'Delete this post?'))) return;
    await deletePost(post.id);
    onDeleted?.(post.id);
  };

  return (
    <article className="rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-4 shadow-[var(--km-shadow-sm)] transition hover:shadow-[var(--km-shadow-md)]">
      <header className="mb-3 flex items-start justify-between gap-3">
        <button className="flex items-start gap-3 text-left" onClick={() => navigateTo(`profile?user=${post.author_id}`)}>
          <div className="h-11 w-11 overflow-hidden rounded-full bg-slate-200">
            <SafeImage className="h-full w-full object-cover" src={post.user_profiles?.avatar_url} />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--km-text)]">{post.user_profiles?.full_name || t('appName', 'KisanMandi')}</div>
            <div className="text-xs text-[var(--km-muted)]">
              {roleLabel(post.user_profiles?.role)}
              {location ? ` | ${location}` : ''}
            </div>
            <div className="text-xs text-[var(--km-muted)]">{formatTimeAgo(post.created_at)}</div>
          </div>
        </button>

        {isOwner && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg p-2 text-[var(--km-muted)] transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="mb-4 whitespace-pre-wrap text-sm leading-6 text-[var(--km-text)]">{post.content}</div>

      {postedImages.length > 0 && (
        <div className={`mb-4 grid gap-2 ${postedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {postedImages.map((img: any, idx: number) => (
            <SafeImage
              key={`${post.id}-image-${idx}`}
              src={img.url}
              alt="Post"
              loading="lazy"
              className="h-48 w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between border-y border-[var(--km-border)] py-2">
        <span className="text-xs text-[var(--km-muted)]">{likesCount} likes</span>
        <span className="text-xs text-[var(--km-muted)]">{commentCount} comments</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleLike}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm transition ${
            liked
              ? 'bg-[var(--km-primary-soft)] text-[var(--km-primary)]'
              : 'text-[var(--km-muted)] hover:bg-slate-100'
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          {t('like', 'Like')}
        </button>

        <button
          type="button"
          onClick={toggleComments}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm text-[var(--km-muted)] transition hover:bg-slate-100"
        >
          <MessageSquare className="h-4 w-4" />
          {t('comment', 'Comment')}
        </button>

        <button
          type="button"
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm text-[var(--km-muted)] transition hover:bg-slate-100"
        >
          <Share2 className="h-4 w-4" />
          {t('share', 'Share')}
        </button>
      </div>

      {showComments && (
        <section className="mt-4 border-t border-[var(--km-border)] pt-4">
          <div className="mb-3 space-y-2">
            {comments.length === 0 ? (
              <p className="text-sm text-[var(--km-muted)]">{t('noCommentsYet', 'No comments yet.')}</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-[var(--km-text)]">
                    {comment.user_profiles?.full_name || t('profile', 'User')}
                  </div>
                  <div className="mt-1 text-sm text-[var(--km-text)]">{comment.content}</div>
                  <div className="mt-1 text-xs text-[var(--km-muted)]">{formatTimeAgo(comment.created_at)}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="h-10 flex-1 rounded-lg border border-[var(--km-border)] px-3 text-sm outline-none transition focus:border-[var(--km-primary)]"
              placeholder={t('writeComment', 'Write a comment...')}
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={commentLoading || !commentText.trim()}
              className="h-10 rounded-lg bg-[var(--km-primary)] px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {commentLoading ? 'Sending...' : t('send', 'Send')}
            </button>
          </form>
        </section>
      )}
    </article>
  );
}
