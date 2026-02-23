import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { KeyRound } from 'lucide-react';

export default function ForgetPassword() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="km-page flex items-center justify-center px-4 py-6">
      <div className="km-card mx-auto w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--km-primary)]">{t('appName')}</h1>
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
          <KeyRound className="h-8 w-8 text-[var(--km-primary)]" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">{t('resetPassword')}</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            Password reset link sent to your email!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 text-base sm:text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="km-btn km-btn-green w-full py-3 text-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '...' : t('resetPassword')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a 
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/login');
              window.location.reload();
            }}
            className="font-semibold text-[var(--km-primary)] hover:underline"
          >
            {t('login')}
          </a>
        </div>
      </div>
    </div>
  );
}
