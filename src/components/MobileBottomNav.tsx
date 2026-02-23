import { Home, Users, MessageSquare, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const isActive = (page: string) => currentPage === page;

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
      label: userRole === 'farmer' ? t('listings', 'Listings') : t('search', 'Browse'),
      icon: ShoppingBag,
      show: true,
    },
  ];

  const visibleItems = navItems.filter((item) => item.show);

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
                className={`flex flex-col items-center justify-center gap-1 py-2 px-2 md:px-4 transition rounded-lg ${
                  active
                    ? 'bg-[var(--km-primary-soft)] text-[var(--km-primary)]'
                    : 'text-[var(--km-muted)] hover:bg-slate-100 hover:text-[var(--km-text)]'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
                <span className="text-xs md:text-sm font-medium">{item.label}</span>
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
