import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export default function Profile() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [target, setTarget] = useState<any>(null);
  const userId = new URLSearchParams(window.location.search).get('user');

  useEffect(() => {
    const load = async () => {
      const id = userId || profile?.id;
      if (!id) return;
      const { data } = await supabase.from('user_profiles').select('*').eq('id', id).maybeSingle();
      setTarget(data);
    };
    void load();
  }, [profile?.id, userId]);

  return (
    <div className="km-page">
      <div className="km-container">
        <section className="km-card">
          <div className="mb-4 h-20 w-20 rounded-full bg-slate-200" />
          <h2 className="text-xl font-semibold text-[var(--km-text)]">{target?.full_name || t('loading', 'Loading...')}</h2>
          <p className="mt-1 text-sm text-[var(--km-muted)]">
            {target?.role || t('member', 'Member')}
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--km-muted)]">
            {t('userInformation', 'User Information')}
          </p>
          <p className="mt-2 text-sm text-[var(--km-muted)]">
            <span className="font-medium text-[var(--km-text)]">{t('role', 'Role')}: </span>
            {target?.role || t('member', 'Member')}
          </p>
          <p className="mt-2 text-sm text-[var(--km-muted)]">
            <span className="font-medium text-[var(--km-text)]">{t('location', 'Location')}: </span>
            {[target?.village, target?.district, target?.state].filter(Boolean).join(', ')}
          </p>
          <p className="mt-2 text-sm text-[var(--km-muted)]">
            <span className="font-medium text-[var(--km-text)]">{t('mobileNumber', 'Mobile Number')}: </span>
            {target?.mobile_number || '-'}
          </p>
          <p className="mt-2 text-sm text-[var(--km-muted)]">
            <span className="font-medium text-[var(--km-text)]">{t('email', 'Email')}: </span>
            {target?.email || '-'}
          </p>
        </section>
      </div>
    </div>
  );
}
