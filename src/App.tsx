import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgetPassword from './pages/ForgetPassword';
import FarmerDashboard from './pages/FarmerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import MandiPrices from './pages/MandiPrices';
import Community from './pages/Community';
import Chat from './pages/Chat';
import TraderDashboard from './pages/TraderDashboard';
import MobileBottomNav from './components/MobileBottomNav';
import AppHeader from './components/AppHeader';
import Profile from './pages/Profile';
import MyNetwork from './pages/MyNetwork';
import ListingHistory from './pages/ListingHistory';
import NotificationsPage from './pages/NotificationsPage';
import Settings from './pages/Settings';
import ToastViewport from './components/common/ToastViewport';
import Listings from './pages/Listings';

export default function App() {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const role = (profile?.role || '').toLowerCase();
  const isFarmer = role === 'farmer';
  const isTrader = role === 'buyer' || role === 'trader';
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const path = window.location.pathname;
    return path.slice(1) || 'login';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPage(path.slice(1) || 'login');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.history.pushState(null, '', `/${page}`);
  };

  const pageTitle = useMemo(() => {
    const map: Record<string, { title: string; subtitle: string }> = {
      dashboard: { title: t('dashboard', 'Dashboard'), subtitle: t('manageMarketplaceActivity', 'Manage your marketplace activity') },
      'farmer-dashboard': { title: `${t('farmer', 'Farmer')} ${t('dashboard', 'Dashboard')}`, subtitle: t('manageListingsOffers', 'Manage your listings and offers') },
      'buyer-dashboard': { title: `${t('buyer', 'Trader')} ${t('dashboard', 'Dashboard')}`, subtitle: t('findCropsSendOffers', 'Find crops and send offers') },
      community: { title: t('community', 'Community'), subtitle: t('postsCommentsUpdates', 'Posts, comments and crop updates') },
      chat: { title: t('messages', 'Messages'), subtitle: t('talkToUsers', 'Talk to farmers and traders') },
      listings: { title: t('listings', 'Listings'), subtitle: t('browseMarketplaceListings', 'Browse marketplace listings') },
      'trader-dashboard': { title: t('listings', 'Listings'), subtitle: t('browseMarketplaceListings', 'Browse marketplace listings') },
      'mandi-prices': { title: t('mandiPrices', 'Mandi Prices'), subtitle: t('dailyRatesTrends', 'Daily rates and trends') },
      profile: { title: t('profile', 'Profile'), subtitle: t('accountInformation', 'Account information') },
      'my-network': { title: t('myNetwork', 'My Network'), subtitle: t('growConnections', 'Grow your connections') },
      'listing-history': { title: t('listingHistory', 'Listing History'), subtitle: t('recentPostActivity', 'Your recent post activity') },
      notifications: { title: t('notifications', 'Notifications'), subtitle: t('unreadRecentUpdates', 'Unread and recent updates') },
      settings: { title: t('settings', 'Settings'), subtitle: t('languagePreferences', 'Language and preferences') },
    };
    return map[currentPage] || { title: t('appName', 'KisanMandi'), subtitle: t('agricultureSocialMarketplace', 'Agriculture social marketplace') };
  }, [currentPage, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    if (currentPage === 'signup') return <Signup />;
    if (currentPage === 'forgot-password') return <ForgetPassword />;
    return <Login />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">{t('loading', 'Loading...')}</div>
      </div>
    );
  }

  const renderPage = () => {
    if (currentPage === 'community') return <Community />;
    if (currentPage === 'chat') return <Chat />;
    if (currentPage === 'trader-dashboard' || currentPage === 'browse-listings') return <TraderDashboard />;
    if (currentPage === 'listings') return <Listings />;
    if (currentPage === 'mandi-prices') return <MandiPrices />;
    if (currentPage === 'profile') return <Profile />;
    if (currentPage === 'my-network') return <MyNetwork />;
    if (currentPage === 'listing-history') return <ListingHistory />;
    if (currentPage === 'notifications') return <NotificationsPage />;
    if (currentPage === 'settings') return <Settings />;

    if (isFarmer && (currentPage === 'dashboard' || currentPage === 'farmer-dashboard' || currentPage === '')) {
      return <FarmerDashboard />;
    }

    if (isTrader && (currentPage === 'dashboard' || currentPage === 'buyer-dashboard' || currentPage === '')) {
      return <BuyerDashboard />;
    }

    if (isFarmer) return <FarmerDashboard />;
    if (isTrader) return <BuyerDashboard />;
    return <FarmerDashboard />;
  };

  return (
    <>
      <AppHeader title={pageTitle.title} subtitle={pageTitle.subtitle} />
      {renderPage()}
      <MobileBottomNav currentPage={currentPage} onNavigate={handleNavigate} userRole={profile?.role} />
      <ToastViewport />
    </>
  );
}
