import { useEffect, useState } from 'react';
import { Home, Users, MessageSquare, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface MobileBottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole?: string;
}

export default function MobileBottomNav({
  currentPage,
  onNavigate,
  userRole,
}: MobileBottomNavProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [unreadChats, setUnreadChats] = useState(0);
  const isActive = (page: string) => currentPage === page;
  const listingsLabel = userRole === 'farmer' ? t('listings', 'Listings') : t('listings', 'Listings');

  const navItems = [
    {
      id: 'dashboard',
      label: t('dashboard', 'Home'),
      icon: Home,
      show: true,
    },
    {
      id: 'community',
      label: t('community', 'Community'),
      icon: Users,
      show: true,
    },
    {
      id: 'chat',
      label: t('chat', 'Chat'),
      icon: MessageSquare,
      show: true,
    },
    {
      id: 'listings',
      label: listingsLabel,
      icon: ShoppingBag,
      show: true,
    },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  useEffect(() => {
    if (!profile?.id) return;

    const loadUnread = async () => {
      try {
        let conversationIds: string[] = [];
        const withHidden = await supabase
          .from('conversation_participants')
          .select('conversation_id, hidden_at')
          .eq('user_id', profile.id);

        if (!withHidden.error) {
          conversationIds = (withHidden.data || [])
            .filter((row: any) => !row.hidden_at)
            .map((row: any) => row.conversation_id as string);
        } else {
          const fallback = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', profile.id);
          if (fallback.error) throw fallback.error;
          conversationIds = (fallback.data || []).map((row: any) => row.conversation_id as string);
        }

        if (!conversationIds.length) {
          setUnreadChats(0);
          return;
        }

        const { count, error } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .is('read_at', null)
          .neq('sender_id', profile.id);
        if (error) throw error;
        setUnreadChats(count || 0);
      } catch (err) {
        console.error('Failed to load unread chat count', err);
      }
    };

    void loadUnread();
    const refresh = window.setInterval(() => void loadUnread(), 30000);

    const channel = supabase
      .channel(`mobile-chat-unread:${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void loadUnread();
      })
      .subscribe();

    return () => {
      window.clearInterval(refresh);
      void channel.unsubscribe();
    };
  }, [profile?.id]);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--km-border)] bg-[var(--km-surface)] shadow-lg">
        <nav className="flex items-center justify-around h-16 md:h-20 px-2 md:px-6">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition md:px-4 ${
                  active
                    ? 'bg-[var(--km-primary-soft)] text-[var(--km-primary)]'
                    : 'text-[var(--km-muted)] hover:bg-slate-100 hover:text-[var(--km-text)]'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
                <span className="text-xs md:text-sm font-medium">{item.label}</span>
                {item.id === 'chat' && unreadChats > 0 && (
                  <span className="absolute -mt-7 ml-8 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadChats}
                  </span>
                )}
              </button>
            );
          })}

        </nav>
      </div>

      {/* Spacing to prevent content overlap */}
      <div className="h-16 md:h-20" />
    </>
  );
}
