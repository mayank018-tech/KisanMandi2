import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Composer from '../components/community/Composer';
import PostCard from '../components/community/PostCard';
import { listPosts, subscribeToPostsRealtime } from '../features/community/api';

export default function Community() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listPosts(20);
        setPosts(data || []);
      } catch (err) {
        console.error('Failed to load posts', err);
      }
      setLoading(false);
    })();

    const subscription = subscribeToPostsRealtime((payload: any) => {
      if (payload.eventType === 'INSERT') {
        console.log('New post:', payload.new);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-20">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">{t('community') || 'Community'}</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {user && (
          <div className="mb-6">
            <Composer onPost={(p) => setPosts((s) => [p, ...s])} />
          </div>
        )}

        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
          {loading ? (
            <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500">
              No posts yet — be the first to share!
            </div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
}
