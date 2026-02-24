import { useEffect, useMemo, useState } from 'react';
import { Bell, History, LogOut, Menu, Settings, UserCircle2, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { navigateTo } from '../lib/navigation';
import { supabase } from '../lib/supabase';
import {
  listMyNotifications,
  markNotificationRead,
  unreadNotificationCount,
} from '../features/notifications/api';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function AppHeader({ title, subtitle }: AppHeaderProps) {
  const { profile, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const menuItems = useMemo(
    () => [
      { id: 'settings', label: t('settings', 'Settings'), icon: Settings },
      { id: 'listing-history', label: t('listingHistory', 'Listing History'), icon: History },
      { id: 'my-network', label: t('myNetwork', 'My Network'), icon: Users },
      { id: 'notifications', label: t('notifications', 'Notifications'), icon: Bell },
    ],
    [t]
  );

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) return;
      try {
        const [items, count] = await Promise.all([
          listMyNotifications(profile.id, 10),
          unreadNotificationCount(profile.id),
        ]);
        setNotifications(items);
        setUnread(count);
      } catch (err) {
        console.error('Failed loading notifications', err);
      }
    };
    void load();
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`header-notifications:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        async () => {
          try {
            const [items, count] = await Promise.all([
              listMyNotifications(profile.id, 10),
              unreadNotificationCount(profile.id),
            ]);
            setNotifications(items);
            setUnread(count);
          } catch (err) {
            console.error('Failed syncing notifications', err);
          }
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [profile?.id]);

  return (
    <header className="km-topbar sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold md:text-2xl">{title}</h1>
          {subtitle && <p className="km-topbar-muted truncate text-xs md:text-sm">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label={t('language', 'Language')}
            title={t('language', 'Language')}
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'gu')}
            className="rounded-lg border border-[var(--km-border)] bg-white px-3 py-2 text-xs text-gray-800 shadow-sm md:text-sm"
          >
            <option value="en">{t('langEnglish', 'English')}</option>
            <option value="hi">{t('langHindi', 'हिंदी')}</option>
            <option value="gu">{t('langGujarati', 'ગુજરાતી')}</option>
          </select>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-lg bg-white/15 p-2 transition hover:bg-white/25"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold">
                  {unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[var(--km-border)] bg-white p-2 text-[var(--km-text)] shadow-[var(--km-shadow-md)]">
                <div className="px-2 py-1 text-sm font-semibold">{t('notifications', 'Notifications')}</div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-[var(--km-muted)]">
                      {t('noNotifications', 'No notifications yet')}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={async () => {
                          if (!profile?.id) return;
                          await markNotificationRead(n.id, profile.id);
                          setNotifications((prev) =>
                            prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
                          );
                          setUnread((count) => Math.max(0, n.is_read ? count : count - 1));
                        }}
                        className={`w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50 ${
                          n.is_read ? 'text-[var(--km-muted)]' : 'font-medium'
                        }`}
                      >
                        <div className="text-sm">{n.title}</div>
                        {n.body && <div className="text-xs text-[var(--km-muted)]">{n.body}</div>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigateTo('profile')}
            className="rounded-lg bg-white/15 p-2 transition hover:bg-white/25"
          >
            <UserCircle2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg bg-white/15 p-2 transition hover:bg-white/25"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/20 bg-white/10 backdrop-blur">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-2 px-4 py-3 md:grid-cols-5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigateTo(item.id);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm hover:bg-white/25"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={async () => {
                setMenuOpen(false);
                await signOut();
                navigateTo('login');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500/80 px-3 py-2 text-sm hover:bg-orange-500"
            >
              <LogOut className="h-4 w-4" />
              {t('logout', 'Logout')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
