import { Home, Users, MessageSquare, ShoppingBag, LogOut } from 'lucide-react';

interface MobileBottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole?: string;
  onLogout?: () => void;
}

export default function MobileBottomNav({
  currentPage,
  onNavigate,
  userRole,
  onLogout,
}: MobileBottomNavProps) {
  const isActive = (page: string) => currentPage === page;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: Home,
      show: true,
    },
    {
      id: 'community',
      label: 'Community',
      icon: Users,
      show: true,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      show: true,
    },
    {
      id: 'listings',
      label: userRole === 'farmer' ? 'Listings' : 'Browse',
      icon: ShoppingBag,
      show: true,
    },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-40">
        <nav className="flex items-center justify-around h-16">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition ${
                  active
                    ? 'text-blue-600 border-t-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Logout button (visible on mobile) */}
          <button
            onClick={onLogout}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-gray-600 hover:text-red-600 transition"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-medium">Exit</span>
          </button>
        </nav>
      </div>

      {/* Spacing to prevent content overlap on mobile only */}
      <div className="h-16 md:hidden" />
    </>
  );
}
