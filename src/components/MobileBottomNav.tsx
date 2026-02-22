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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
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
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
                <span className="text-xs md:text-sm font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center gap-1 py-2 px-2 md:px-4 text-gray-600 hover:text-red-600 hover:bg-red-50 transition rounded-lg"
            title="Logout"
          >
            <LogOut className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-xs md:text-sm font-medium">Exit</span>
          </button>
        </nav>
      </div>

      {/* Spacing to prevent content overlap */}
      <div className="h-16 md:h-20" />
    </>
  );
}
