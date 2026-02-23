import { useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Composer from '../components/community/Composer';
import PostCard from '../components/community/PostCard';
import { createPost, listPosts, subscribeToPostsRealtime, uploadPostImage, type CommunityPost } from '../features/community/api';

const FEED_LIMIT = 10;
const FEED_QUERY_KEY = ['community-feed'];

type FeedPage = {
  items: CommunityPost[];
  nextCursor: string | null;
};

export default function Community() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const feedQuery = useInfiniteQuery<FeedPage>({
    queryKey: FEED_QUERY_KEY,
    queryFn: async ({ pageParam }) => {
      const posts = await listPosts({
        limit: FEED_LIMIT,
        before: typeof pageParam === 'string' ? pageParam : undefined,
      });

      return {
        items: posts,
        nextCursor: posts.length < FEED_LIMIT ? null : posts[posts.length - 1]?.created_at ?? null,
      };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: 60_000,
  });

  const createPostMutation = useMutation({
    mutationFn: async ({ content, files }: { content: string; files: File[] }) => {
      if (!profile?.id) throw new Error('Missing profile');

      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadPostImage(profile.id, file);
        uploadedUrls.push(url);
      }

      return createPost(profile.id, content, uploadedUrls);
    },
    onMutate: async ({ content, files }) => {
      if (!profile?.id) return;

      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
      const previous = queryClient.getQueryData(FEED_QUERY_KEY);
      const tempId = `temp-${Date.now()}`;

      const optimisticPost: CommunityPost = {
        id: tempId,
        author_id: profile.id,
        content,
        created_at: new Date().toISOString(),
        like_count: 0,
        comment_count: 0,
        post_likes: [],
        post_images: files.map((file, idx) => ({ url: URL.createObjectURL(file), ordering: idx })),
        user_profiles: {
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
          district: profile.district,
          state: profile.state,
        },
      };

      queryClient.setQueryData(FEED_QUERY_KEY, (oldData: any) => {
        if (!oldData?.pages?.length) {
          return {
            pageParams: [undefined],
            pages: [{ items: [optimisticPost], nextCursor: null }],
          };
        }

        const [first, ...rest] = oldData.pages;
        return {
          ...oldData,
          pages: [{ ...first, items: [optimisticPost, ...(first.items || [])] }, ...rest],
        };
      });

      return { previous, tempId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FEED_QUERY_KEY, context.previous);
      }
    },
    onSuccess: (serverPost, _variables, context) => {
      queryClient.setQueryData(FEED_QUERY_KEY, (oldData: any) => {
        if (!oldData?.pages?.length) return oldData;

        const [first, ...rest] = oldData.pages;
        return {
          ...oldData,
          pages: [
            {
              ...first,
              items: (first.items || []).map((post: CommunityPost) =>
                post.id === context?.tempId ? serverPost : post
              ),
            },
            ...rest,
          ],
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    },
  });

  const posts = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data?.pages]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
          void feedQuery.fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [feedQuery]);

  useEffect(() => {
    const subscription = subscribeToPostsRealtime(() => {
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-[var(--km-bg)] pb-16 md:pb-20">
      <header className="border-b border-[var(--km-border)] bg-[var(--km-surface)]">
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-4 py-4 md:px-6">
          <h1 className="text-xl font-semibold text-[var(--km-text)]">{t('community') || 'Community'}</h1>
          <span className="text-sm text-[var(--km-muted)]">Professional Kisan Network</span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-6 px-4 py-6 md:px-6 lg:grid-cols-[280px_minmax(0,680px)_320px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-5 shadow-[var(--km-shadow-sm)]">
            <div className="mb-3 h-14 w-14 rounded-full bg-slate-200" />
            <h2 className="text-base font-semibold text-[var(--km-text)]">{profile?.full_name || 'KisanMandi User'}</h2>
            <p className="mt-1 text-sm text-[var(--km-muted)]">
              {(profile?.role || 'Member').toUpperCase()} {profile?.district ? `- ${profile.district}` : ''}
            </p>
            <p className="mt-3 text-sm text-[var(--km-muted)]">
              Stay connected with farmers, traders, and mandi updates in one feed.
            </p>
          </div>
        </aside>

        <main>
          {user && (
            <div className="mb-5">
              <Composer
                isSubmitting={createPostMutation.isPending}
                onSubmit={({ content, files }) => createPostMutation.mutateAsync({ content, files })}
              />
            </div>
          )}

          <div className="space-y-4">
            {feedQuery.isLoading ? (
              <div className="rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-8 text-center text-[var(--km-muted)] shadow-[var(--km-shadow-sm)]">
                Loading feed...
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-8 text-center text-[var(--km-muted)] shadow-[var(--km-shadow-sm)]">
                No posts yet. Be the first to share.
              </div>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}

            {feedQuery.isFetchingNextPage && (
              <div className="rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-4 text-center text-sm text-[var(--km-muted)] shadow-[var(--km-shadow-sm)]">
                Loading more posts...
              </div>
            )}
            <div ref={sentinelRef} />
          </div>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <section className="rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-5 shadow-[var(--km-shadow-sm)]">
              <h3 className="text-sm font-semibold text-[var(--km-text)]">Trending Crops</h3>
              <div className="mt-3 space-y-2 text-sm text-[var(--km-muted)]">
                <div className="rounded-lg bg-slate-50 px-3 py-2">Wheat demand rising in North zone</div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">Groundnut arrivals up this week</div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">Cotton quality premium active</div>
              </div>
            </section>
            <section className="rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-5 shadow-[var(--km-shadow-sm)]">
              <h3 className="text-sm font-semibold text-[var(--km-text)]">Mandi Snapshot</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-[var(--km-muted)]">Wheat</span>
                  <span className="font-semibold text-[var(--km-text)]">Rs 2,350/qtl</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-[var(--km-muted)]">Cotton</span>
                  <span className="font-semibold text-[var(--km-text)]">Rs 6,180/qtl</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-[var(--km-muted)]">Maize</span>
                  <span className="font-semibold text-[var(--km-text)]">Rs 2,070/qtl</span>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
