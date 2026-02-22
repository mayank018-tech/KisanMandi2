import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
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

export default function App() {
  const { user, profile, loading } = useAuth();
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('userId');
      handleNavigate('login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  // Community and Chat are accessible when logged in
  if (currentPage === 'community') {
    return (
      <>
        <Community />
        <MobileBottomNav
          currentPage={currentPage}
          onNavigate={handleNavigate}
          userRole={profile?.role}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (currentPage === 'chat') {
    return (
      <>
        <Chat />
        <MobileBottomNav
          currentPage={currentPage}
          onNavigate={handleNavigate}
          userRole={profile?.role}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (currentPage === 'trader-dashboard' || currentPage === 'browse-listings' || currentPage === 'listings') {
    return (
      <>
        <TraderDashboard />
        <MobileBottomNav
          currentPage="listings"
          onNavigate={handleNavigate}
          userRole={profile?.role}
          onLogout={handleLogout}
        />
      </>
    );
  }

  // If not logged in, show login/signup/forgot password pages
  if (!user) {
    if (currentPage === 'signup') {
      return <Signup />;
    }
    if (currentPage === 'forgot-password') {
      return <ForgetPassword />;
    }
    return <Login />;
  }

  // If logged in, show dashboard based on role
  if (currentPage === 'mandi-prices') {
    return (
      <>
        <MandiPrices />
        <MobileBottomNav
          currentPage={currentPage}
          onNavigate={handleNavigate}
          userRole={profile?.role}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (profile?.role === 'farmer' && (currentPage === 'dashboard' || currentPage === 'farmer-dashboard' || currentPage === '')) {
    return (
      <>
        <FarmerDashboard />
        <MobileBottomNav
          currentPage="dashboard"
          onNavigate={handleNavigate}
          userRole={profile?.role}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (profile?.role === 'buyer' && (currentPage === 'dashboard' || currentPage === 'buyer-dashboard' || currentPage === '')) {
    return (
      <>
        <BuyerDashboard />
        <MobileBottomNav
          currentPage="dashboard"
          onNavigate={handleNavigate}
          userRole={profile?.role}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (profile?.role === 'farmer') {
    return (
      <>
        <FarmerDashboard />
        <MobileBottomNav
          currentPage="dashboard"
          onNavigate={handleNavigate}
          userRole={profile?.role}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (profile?.role === 'buyer') {
    return (
      <>
        <BuyerDashboard />
        <MobileBottomNav
          currentPage="dashboard"
          onNavigate={handleNavigate}
          userRole={profile?.role}
          onLogout={handleLogout}
        />
      </>
    );
  }

  // Default to login if no role
  return <Login />;
}
