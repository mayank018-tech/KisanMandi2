import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgetPassword from './pages/ForgetPassword';
import FarmerDashboard from './pages/FarmerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import MandiPrices from './pages/MandiPrices';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
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
    return <MandiPrices />;
  }

  if (profile?.role === 'farmer') {
    return <FarmerDashboard />;
  }

  if (profile?.role === 'buyer') {
    return <BuyerDashboard />;
  }

  // Default to login if no role
  return <Login />;
}
