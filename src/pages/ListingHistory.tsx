import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { listPosts, deletePost, updatePost } from '../features/community/api';
import SafeImage from '../components/common/SafeImage';

export default function ListingHistory() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const load = async () => {
      const posts = await listPosts({ limit: 100 });
      setItems((posts || []).filter((post) => post.author_id === profile?.id));
    };
    void load();
  }, [profile?.id]);

  return (
    <div className="km-page">
      <div className="km-container">
        <section className="km-card">
          <h2 className="text-xl font-semibold">{t('listingHistory', 'Listing History')}</h2>
          <div className="mt-4 space-y-3">
            {items.map((post) => (
              <article key={post.id} className="rounded-lg border border-[var(--km-border)] bg-white p-4">
                {editingId === post.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-full rounded-lg border border-[var(--km-border)] p-2"
                    />
                    <div className="flex gap-2">
                      <button
                        className="km-btn km-btn-green"
                        onClick={async () => {
                          const updated = await updatePost(post.id, draft);
                          setItems((prev) => prev.map((item) => (item.id === post.id ? { ...item, ...updated } : item)));
                          setEditingId(null);
                        }}
                      >
                        {t('save', 'Save')}
                      </button>
                      <button className="km-btn km-btn-neutral" onClick={() => setEditingId(null)}>
                        {t('cancel', 'Cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{post.content}</p>
                    {post.post_images?.[0]?.url && (
                      <SafeImage src={post.post_images[0].url} className="mt-3 h-44 w-full rounded-lg object-cover" />
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        className="km-btn km-btn-blue text-sm"
                        onClick={() => {
                          setEditingId(post.id);
                          setDraft(post.content || '');
                        }}
                      >
                        {t('edit', 'Edit')}
                      </button>
                      <button
                        className="km-btn km-btn-orange text-sm"
                        onClick={async () => {
                          if (!window.confirm(t('confirmDeletePost', 'Delete this post?'))) return;
                          await deletePost(post.id);
                          setItems((prev) => prev.filter((item) => item.id !== post.id));
                        }}
                      >
                        {t('delete', 'Delete')}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
