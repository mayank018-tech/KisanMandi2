import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { followUser, unfollowUser } from '../features/community/api';
import { navigateTo } from '../lib/navigation';

export default function MyNetwork() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) return;
      const [allUsers, myFollows] = await Promise.all([
        supabase.from('user_profiles').select('*').neq('id', profile.id).limit(100),
        supabase.from('follows').select('following_id').eq('follower_id', profile.id),
      ]);
      setUsers(allUsers.data || []);
      setFollowing(new Set((myFollows.data || []).map((row: any) => row.following_id)));
    };
    void load();
  }, [profile?.id]);

  return (
    <div className="km-page">
      <div className="km-container">
        <section className="km-card">
          <h2 className="text-xl font-semibold">{t('myNetwork', 'My Network')}</h2>
          <p className="mt-1 text-sm text-[var(--km-muted)]">
            {t('connectionCount', 'Connections')}: {following.size}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {users.map((user) => {
              const isFollowing = following.has(user.id);
              return (
                <article key={user.id} className="rounded-lg border border-[var(--km-border)] bg-white p-4">
                  <button className="text-left" onClick={() => navigateTo(`profile?user=${user.id}`)}>
                    <div className="font-semibold">{user.full_name}</div>
                    <div className="text-sm text-[var(--km-muted)]">{user.role}</div>
                    <div className="text-xs text-[var(--km-muted)]">{[user.district, user.state].filter(Boolean).join(', ')}</div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!profile?.id) return;
                      setFollowing((prev) => {
                        const next = new Set(prev);
                        if (isFollowing) next.delete(user.id);
                        else next.add(user.id);
                        return next;
                      });
                      try {
                        if (isFollowing) await unfollowUser(profile.id, user.id);
                        else await followUser(profile.id, user.id);
                      } catch (err) {
                        console.error('Follow action failed', err);
                      }
                    }}
                    className={`mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${
                      isFollowing ? 'bg-[var(--km-accent-orange)]' : 'bg-[var(--km-primary)]'
                    }`}
                  >
                    {isFollowing ? t('unfollow', 'Unfollow') : t('follow', 'Follow')}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
