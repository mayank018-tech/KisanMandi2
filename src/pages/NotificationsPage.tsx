import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { listMyNotifications, markNotificationRead } from '../features/notifications/api';

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) return;
      const data = await listMyNotifications(profile.id, 100);
      setItems(data);
    };
    void load();
  }, [profile?.id]);

  return (
    <div className="km-page">
      <div className="km-container">
        <section className="km-card">
          <h2 className="text-xl font-semibold">{t('notifications', 'Notifications')}</h2>
          <div className="mt-4 space-y-2">
            {items.map((n) => (
              <article key={n.id} className="rounded-lg border border-[var(--km-border)] bg-white p-3">
                <div className="font-medium">{n.title}</div>
                <div className="text-sm text-[var(--km-muted)]">{n.body}</div>
                {!n.is_read && (
                  <button
                    className="mt-2 rounded bg-[var(--km-primary)] px-2 py-1 text-xs text-white"
                    onClick={async () => {
                      if (!profile?.id) return;
                      await markNotificationRead(n.id, profile.id);
                      setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)));
                    }}
                  >
                    {t('markAsRead', 'Mark as read')}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
