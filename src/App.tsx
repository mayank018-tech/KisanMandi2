import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import MobileBottomNav from './components/MobileBottomNav';
import AppHeader from './components/AppHeader';
import ToastViewport from './components/common/ToastViewport';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgetPassword = lazy(() => import('./pages/ForgetPassword'));
const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'));
const MandiPrices = lazy(() => import('./pages/MandiPrices'));
const Community = lazy(() => import('./pages/Community'));
const Chat = lazy(() => import('./pages/Chat'));
const TraderDashboard = lazy(() => import('./pages/TraderDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const MyNetwork = lazy(() => import('./pages/MyNetwork'));
const ListingHistory = lazy(() => import('./pages/ListingHistory'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const Settings = lazy(() => import('./pages/Settings'));
const Listings = lazy(() => import('./pages/Listings'));

function PageLoader({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl font-semibold">{label}</div>
    </div>
  );
}

export default function App() {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const loadingLabel = t('loading', 'Loading...');
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
    return <PageLoader label={loadingLabel} />;
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader label={loadingLabel} />}>
        {currentPage === 'signup' ? <Signup /> : currentPage === 'forgot-password' ? <ForgetPassword /> : <Login />}
      </Suspense>
    );
  }

  const renderPage = () => {
    if (!profile) return <PageLoader label={loadingLabel} />;

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
      <Suspense fallback={<PageLoader label={loadingLabel} />}>
        {renderPage()}
      </Suspense>
      <MobileBottomNav currentPage={currentPage} onNavigate={handleNavigate} userRole={profile?.role} />
      <ToastViewport />
    </>
  );
}
