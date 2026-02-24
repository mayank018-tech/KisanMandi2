import { useEffect, useMemo, useState } from 'react';
import { Camera, PencilLine } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import SafeImage from '../components/common/SafeImage';
import { useToastStore } from '../stores/toastStore';

type ProfileForm = {
  full_name: string;
  mobile_number: string;
  address: string;
  role: 'farmer' | 'buyer';
  bio: string;
  state: string;
  district: string;
  village: string;
  avatar_url: string;
};

const EMPTY_FORM: ProfileForm = {
  full_name: '',
  mobile_number: '',
  address: '',
  role: 'farmer',
  bio: '',
  state: '',
  district: '',
  village: '',
  avatar_url: '',
};

export default function Profile() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const pushToast = useToastStore((state) => state.pushToast);
  const [target, setTarget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const userId = new URLSearchParams(window.location.search).get('user');

  const isOwnProfile = useMemo(() => {
    if (!profile?.id) return false;
    return !userId || userId === profile.id;
  }, [profile?.id, userId]);

  useEffect(() => {
    const load = async () => {
      const id = userId || profile?.id;
      if (!id) return;
      setLoading(true);
      const { data } = await supabase.from('user_profiles').select('*').eq('id', id).maybeSingle();
      setTarget(data);
      setLoading(false);
    };
    void load();
  }, [profile?.id, userId]);

  useEffect(() => {
    if (!target) return;
    setForm({
      full_name: target.full_name || '',
      mobile_number: target.mobile_number || '',
      address: target.address || '',
      role: target.role || 'farmer',
      bio: target.bio || '',
      state: target.state || '',
      district: target.district || '',
      village: target.village || '',
      avatar_url: target.avatar_url || '',
    });
  }, [target]);

  const handleAvatarUpload = async (file: File) => {
    if (!profile?.id) return;
    setUploadingAvatar(true);
    try {
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
      const ext = safeName.split('.').pop() || 'jpg';
      const path = `avatars/${profile.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('listings')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type || 'image/jpeg' });
      if (error) throw error;

      const { data } = supabase.storage.from('listings').getPublicUrl(path);
      setForm((prev) => ({ ...prev, avatar_url: data.publicUrl }));
      pushToast('Profile image uploaded', 'success');
    } catch (err) {
      console.error('Avatar upload failed', err);
      pushToast('Unable to upload profile image', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id || !isOwnProfile) return;
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        mobile_number: form.mobile_number.trim(),
        address: form.address.trim() || null,
        role: form.role,
        bio: form.bio.trim() || null,
        state: form.state.trim(),
        district: form.district.trim(),
        village: form.village.trim(),
        avatar_url: form.avatar_url || null,
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .update(payload as any)
        .eq('id', profile.id)
        .select('*')
        .single();
      if (error) throw error;

      setTarget(data);
      setEditing(false);
      pushToast('Profile updated successfully', 'success');
    } catch (err) {
      console.error('Profile update failed', err);
      pushToast('Unable to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="km-page">
        <div className="km-container">
          <section className="km-card animate-pulse">
            <div className="h-20 w-20 rounded-full bg-slate-200" />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="km-page">
      <div className="km-container">
        <section className="km-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full bg-slate-200">
                <SafeImage src={editing ? form.avatar_url : target?.avatar_url} className="h-full w-full object-cover" />
                {editing && isOwnProfile && (
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/35 text-white">
                    <Camera className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAvatar}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleAvatarUpload(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <h2 className="text-xl font-semibold text-[var(--km-text)]">
                  {editing ? form.full_name || t('name', 'Name') : target?.full_name || t('loading', 'Loading...')}
                </h2>
                <p className="mt-1 text-sm text-[var(--km-muted)]">
                  {target?.role ? t(target.role, target.role) : t('member', 'Member')}
                </p>
              </div>
            </div>

            {isOwnProfile && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--km-border)] px-3 py-2 text-sm font-semibold text-[var(--km-text)]"
              >
                <PencilLine className="h-4 w-4" />
                Edit Profile
              </button>
            )}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--km-muted)]">
            {t('userInformation', 'User Information')}
          </p>

          {!editing ? (
            <>
              <p className="mt-2 text-sm text-[var(--km-muted)]">
                <span className="font-medium text-[var(--km-text)]">{t('name', 'Name')}: </span>
                {target?.full_name || '-'}
              </p>
              <p className="mt-2 text-sm text-[var(--km-muted)]">
                <span className="font-medium text-[var(--km-text)]">{t('role', 'Role')}: </span>
                {target?.role ? t(target.role, target.role) : t('member', 'Member')}
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
              <p className="mt-2 text-sm text-[var(--km-muted)]">
                <span className="font-medium text-[var(--km-text)]">Address: </span>
                {target?.address || '-'}
              </p>
              <p className="mt-2 text-sm text-[var(--km-muted)]">
                <span className="font-medium text-[var(--km-text)]">Bio: </span>
                {target?.bio || '-'}
              </p>
            </>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="km-input"
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder={t('name', 'Name')}
              />
              <input
                className="km-input"
                value={form.mobile_number}
                onChange={(e) => setForm((prev) => ({ ...prev, mobile_number: e.target.value }))}
                placeholder={t('mobileNumber', 'Mobile Number')}
              />
              <select
                className="km-input"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as 'farmer' | 'buyer' }))}
              >
                <option value="farmer">{t('farmer', 'Farmer')}</option>
                <option value="buyer">{t('buyer', 'Trader')}</option>
              </select>
              <input
                className="km-input"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
              />
              <input
                className="km-input"
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                placeholder={t('state', 'State')}
              />
              <input
                className="km-input"
                value={form.district}
                onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))}
                placeholder={t('district', 'District')}
              />
              <input
                className="km-input md:col-span-2"
                value={form.village}
                onChange={(e) => setForm((prev) => ({ ...prev, village: e.target.value }))}
                placeholder={t('village', 'Village')}
              />
              <textarea
                rows={4}
                className="km-input md:col-span-2"
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Bio"
              />
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="km-btn km-btn-neutral flex-1"
                  disabled={saving}
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  className="km-btn km-btn-green flex-1 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? t('loading', 'Saving...') : t('save', 'Save')}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

