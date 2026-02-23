import { useLanguage } from '../contexts/LanguageContext';
import { MessageSquare, Users, Home, LogOut } from 'lucide-react';

export default function Navbar({
  title,
  onLogout,
  userName,
  showNav = true,
}: {
  title: string;
  onLogout?: () => void;
  userName?: string;
  showNav?: boolean;
}) {
  const { language, setLanguage } = useLanguage();

  const navItems = [
    { label: 'Home', href: '/farmer-dashboard', icon: Home },
    { label: 'Community', href: '/community', icon: Users },
    { label: 'Messages', href: '/chat', icon: MessageSquare },
  ];

  return (
    <header className="km-topbar">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
          {userName && <p className="km-topbar-muted text-sm">{userName}</p>}
        </div>

        {showNav && (
          <nav className="hidden md:flex items-center gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', item.href);
                    window.location.reload();
                  }}
                  className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm transition hover:bg-white/25"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'gu')}
            className="rounded-lg border border-white/40 bg-white/15 px-3 py-2 text-sm text-white"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="gu">ગુજરાતી</option>
          </select>
          {onLogout && (
            <button
              onClick={onLogout}
              className="km-btn km-btn-orange text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
