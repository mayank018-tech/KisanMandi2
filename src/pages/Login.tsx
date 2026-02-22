import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(mobileNumber, password);

    if (error) {
      setError(error.message);
    } else {
      // Redirect to dashboard on success
      window.history.pushState({}, '', '/buyer-dashboard');
      window.location.reload();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md sm:max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-green-700">{t('appName')}</h1>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'gu')}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="gu">ગુજરાતી</option>
          </select>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <LogIn className="w-8 h-8 text-green-600" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">{t('login')}</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('mobileNumber')}
            </label>
            <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="9876543210"
              className="w-full px-4 py-3 text-base sm:text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-base sm:text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : t('login')}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <a
            href="/forgot-password"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/forgot-password');
              window.location.reload();
            }}
            className="block text-green-600 hover:text-green-700 font-medium"
          >
            {t('forgotPassword')}
          </a>
          <p className="text-gray-600">
            {t('dontHaveAccount')}{' '}
            <a 
              href="/signup"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/signup');
                window.location.reload();
              }}
              className="text-green-600 hover:text-green-700 font-semibold"
            >
              {t('signup')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
