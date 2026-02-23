import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { followUser, unfollowUser } from '../features/community/api';
import { navigateTo } from '../lib/navigation';
import { useAppUiStore } from '../stores/appUiStore';

export default function MyNetwork() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
   const [startingChatId, setStartingChatId] = useState<string | null>(null);
  const setSelectedConversationId = useAppUiStore((s) => s.setSelectedConversationId);

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
                  <button
                    type="button"
                    onClick={() => void startConversation(user)}
                    className="mt-2 w-full rounded-lg border border-[var(--km-border)] px-3 py-1.5 text-sm font-semibold text-[var(--km-primary)] hover:bg-[var(--km-primary-soft)]"
                    disabled={startingChatId === user.id}
                  >
                    {startingChatId === user.id ? t('loading', 'Loading...') : t('chat', 'Chat')}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );

  async function startConversation(target: { id: string; full_name?: string }) {
    if (!profile?.id) return;
    setStartingChatId(target.id);
    try {
      // Check for existing 1:1 conversation
      const { data: existing, error: existingError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', profile.id);
      if (existingError) throw existingError;
      let conversationId: string | null = null;
      if (existing?.length) {
        const convIds = existing.map((r) => r.conversation_id);
        const { data: match } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', target.id)
          .in('conversation_id', convIds)
          .limit(1);
        if (match && match.length > 0) {
          conversationId = match[0].conversation_id;
        }
      }

      if (!conversationId) {
        const subject = `${profile.full_name || t('chat', 'Chat')} & ${target.full_name || t('chat', 'Chat')}`;
        const { data: conv, error: convErr } = await supabase
          .from('conversations')
          .insert({ subject })
          .select('id')
          .single();
        if (convErr) throw convErr;
        conversationId = conv.id;

        const participants = [
          { conversation_id: conversationId, user_id: profile.id },
          { conversation_id: conversationId, user_id: target.id },
        ];
        const { error: partErr } = await supabase.from('conversation_participants').insert(participants);
        if (partErr) throw partErr;
      }

      setSelectedConversationId(conversationId);
      navigateTo('chat');
    } catch (err) {
      console.error('Failed to start conversation', err);
    } finally {
      setStartingChatId(null);
    }
  }
}
