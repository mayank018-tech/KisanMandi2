// React import not required with new JSX transform
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
    <header className="bg-green-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
          {userName && <p className="text-green-100 text-sm">{userName}</p>}
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
                  className="flex items-center gap-2 px-3 py-2 bg-green-700 rounded hover:bg-green-800 transition text-sm"
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
            className="px-3 py-2 bg-white text-gray-800 rounded text-sm"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="gu">ગુજરાતી</option>
          </select>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-green-700 px-4 py-2 rounded hover:bg-green-800 transition text-sm"
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
