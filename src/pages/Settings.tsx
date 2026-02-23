import { useLanguage } from '../contexts/LanguageContext';

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="km-page">
      <div className="km-container">
        <section className="km-card max-w-xl">
          <h2 className="text-xl font-semibold">{t('settings', 'Settings')}</h2>
          <div className="mt-4">
            <label className="mb-2 block text-sm text-[var(--km-muted)]">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'gu')}
              className="w-full rounded-lg border border-[var(--km-border)] px-3 py-2"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="gu">Gujarati</option>
            </select>
          </div>
        </section>
      </div>
    </div>
  );
}
