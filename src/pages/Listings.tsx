import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, MapPin, MoreVertical, Pencil, Phone, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import SafeImage from '../components/common/SafeImage';
import { createOffer } from '../features/offers/api';
import { useToastStore } from '../stores/toastStore';
import { navigateTo } from '../lib/navigation';

type ListingRow = any;

const DEFAULT_OFFER = {
  offerPrice: '',
  quantity: '',
  message: '',
};

export default function Listings() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const pushToast = useToastStore((state) => state.pushToast);

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListingRow | null>(null);
  const [detailTarget, setDetailTarget] = useState<ListingRow | null>(null);
  const [offerTarget, setOfferTarget] = useState<ListingRow | null>(null);
  const [offerForm, setOfferForm] = useState(DEFAULT_OFFER);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [editTarget, setEditTarget] = useState<ListingRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const isOwner = useCallback(
    (listing: ListingRow) => Boolean(profile?.id && listing.farmer_id === profile.id),
    [profile?.id]
  );

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crop_listings')
        .select(`
          *,
          listing_images(*),
          user_profiles!farmer_id(id, full_name, mobile_number, district, state)
        `)
        .order('created_at', { ascending: false })
        .limit(120);
      if (error) throw error;
      setListings((data || []) as ListingRow[]);
    } catch (err) {
      console.error('Failed to load listings', err);
      pushToast(t('loadingListings', 'Loading listings failed'), 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast, t]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const emptyState = useMemo(
    () => (
      <div className="rounded-xl border border-[var(--km-border)] bg-white p-10 text-center text-sm text-[var(--km-muted)]">
        {t('noData', 'No data found')}
      </div>
    ),
    [t]
  );

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      const { error } = await supabase.from('crop_listings').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setListings((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      pushToast(t('listingDeletedSuccessfully', 'Listing deleted successfully'), 'success');
    } catch (err) {
      console.error('Delete listing failed', err);
      pushToast('Failed to delete listing', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget?.id) return;
    setSavingEdit(true);
    try {
      const payload = {
        crop_name: editTarget.crop_name,
        quantity: Number(editTarget.quantity || 0),
        unit: editTarget.unit || 'kg',
        expected_price: Number(editTarget.expected_price || 0),
        location: editTarget.location,
        description: editTarget.description || null,
        status: editTarget.status || 'active',
      };

      const { data, error } = await supabase
        .from('crop_listings')
        .update(payload)
        .eq('id', editTarget.id)
        .select('*')
        .single();
      if (error) throw error;

      setListings((prev) => prev.map((item) => (item.id === editTarget.id ? { ...item, ...data } : item)));
      setEditTarget(null);
      pushToast(t('listingUpdated', 'Listing updated successfully!'), 'success');
    } catch (err) {
      console.error('Update listing failed', err);
      pushToast('Failed to update listing', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const openOfferModal = (listing: ListingRow) => {
    setOfferTarget(listing);
    setOfferForm({
      offerPrice: String(listing.expected_price || ''),
      quantity: String(listing.quantity || ''),
      message: '',
    });
  };

  const handleSendOffer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!offerTarget || !profile?.id) return;
    setSendingOffer(true);
    try {
      await createOffer({
        listingId: offerTarget.id,
        buyerId: profile.id,
        sellerId: offerTarget.farmer_id,
        price: Number(offerForm.offerPrice || 0),
        quantity: Number(offerForm.quantity || 0),
        message: offerForm.message,
      });
      pushToast(t('offerSentSuccessfully', 'Offer sent successfully!'), 'success');
      setOfferTarget(null);
      setOfferForm(DEFAULT_OFFER);
    } catch (err) {
      console.error('Offer send failed', err);
      pushToast('Unable to send offer', 'error');
    } finally {
      setSendingOffer(false);
    }
  };

  return (
    <div className="km-page">
      <div className="km-container">
        <section className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--km-text)]">{t('listings', 'Listings')}</h2>
          <div className="flex gap-2">
            {profile?.role === 'farmer' && (
              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className="km-btn km-btn-green text-sm"
              >
                {t('addListing', 'Add Listing')}
              </button>
            )}
            <button type="button" onClick={() => void loadListings()} className="km-btn km-btn-neutral text-sm">
              Refresh
            </button>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-xl border border-[var(--km-border)] bg-white" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          emptyState
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => {
              const cover = listing.listing_images?.[0]?.url || listing.photo_url;
              const owner = isOwner(listing);
              return (
                <article key={listing.id} className="overflow-hidden rounded-xl border border-[var(--km-border)] bg-white shadow-[var(--km-shadow-sm)]">
                  <div className="relative h-44 bg-slate-100">
                    {cover ? (
                      <SafeImage src={cover} alt={listing.crop_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--km-muted)]">{t('noImage', 'No image')}</div>
                    )}

                    {owner && (
                      <div className="absolute right-2 top-2">
                        <button
                          type="button"
                          onClick={() => setMenuOpenFor((prev) => (prev === listing.id ? null : listing.id))}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[var(--km-text)] shadow"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {menuOpenFor === listing.id && (
                          <div className="absolute right-0 mt-1 w-40 rounded-lg border border-[var(--km-border)] bg-white p-1 shadow-[var(--km-shadow-md)]">
                            <button
                              type="button"
                              onClick={() => {
                                setEditTarget({ ...listing });
                                setMenuOpenFor(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50"
                            >
                              <Pencil className="h-4 w-4" />
                              {t('edit', 'Edit Listing')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(listing);
                                setMenuOpenFor(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('delete', 'Delete Listing')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-[var(--km-text)]">{listing.crop_name}</h3>
                      <span className="km-badge">{listing.status}</span>
                    </div>
                    <p className="text-lg font-bold text-[var(--km-text)]">Rs {listing.expected_price}/{listing.unit}</p>
                    <p className="text-sm text-[var(--km-muted)]">
                      {t('quantity', 'Quantity')}: {listing.quantity} {listing.unit}
                    </p>
                    <p className="inline-flex items-center gap-1 text-sm text-[var(--km-muted)]">
                      <MapPin className="h-4 w-4" />
                      {listing.location}
                    </p>

                    <button
                      type="button"
                      onClick={() => setDetailTarget(listing)}
                      className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--km-primary)] text-sm font-semibold text-white transition hover:brightness-95"
                    >
                      <Eye className="h-4 w-4" />
                      {t('viewDetails', 'View Details')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-[var(--km-shadow-lg)]">
            <h3 className="text-lg font-semibold text-[var(--km-text)]">{t('deleteListingTitle', 'Delete Listing?')}</h3>
            <p className="mt-2 text-sm text-[var(--km-muted)]">{t('deleteListingMessage', 'This action cannot be undone.')}</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="km-btn km-btn-neutral flex-1">
                {t('cancel', 'Cancel')}
              </button>
              <button type="button" onClick={() => void handleDelete()} className="km-btn flex-1 bg-rose-600 hover:bg-rose-700">
                {t('delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-[var(--km-shadow-lg)]">
            <h3 className="text-lg font-semibold text-[var(--km-text)]">{t('edit', 'Edit Listing')}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="km-input"
                value={editTarget.crop_name || ''}
                onChange={(e) => setEditTarget((prev: any) => ({ ...prev, crop_name: e.target.value }))}
                placeholder={t('cropName', 'Crop name')}
              />
              <input
                type="number"
                className="km-input"
                value={editTarget.quantity ?? ''}
                onChange={(e) => setEditTarget((prev: any) => ({ ...prev, quantity: e.target.value }))}
                placeholder={t('quantity', 'Quantity')}
              />
              <input
                type="number"
                className="km-input"
                value={editTarget.expected_price ?? ''}
                onChange={(e) => setEditTarget((prev: any) => ({ ...prev, expected_price: e.target.value }))}
                placeholder={t('expectedPrice', 'Expected price')}
              />
              <input
                className="km-input"
                value={editTarget.unit || 'kg'}
                onChange={(e) => setEditTarget((prev: any) => ({ ...prev, unit: e.target.value }))}
                placeholder="Unit"
              />
              <input
                className="km-input md:col-span-2"
                value={editTarget.location || ''}
                onChange={(e) => setEditTarget((prev: any) => ({ ...prev, location: e.target.value }))}
                placeholder={t('location', 'Location')}
              />
              <textarea
                rows={3}
                className="km-input md:col-span-2"
                value={editTarget.description || ''}
                onChange={(e) => setEditTarget((prev: any) => ({ ...prev, description: e.target.value }))}
                placeholder={t('description', 'Description')}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setEditTarget(null)} className="km-btn km-btn-neutral flex-1">
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEdit()}
                disabled={savingEdit}
                className="km-btn km-btn-green flex-1 disabled:opacity-60"
              >
                {savingEdit ? t('loading', 'Saving...') : t('save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-[var(--km-shadow-lg)]">
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
              <div className="h-72 bg-slate-100 md:h-full">
                <SafeImage
                  src={detailTarget.listing_images?.[0]?.url || detailTarget.photo_url}
                  alt={detailTarget.crop_name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-3 p-5">
                <h3 className="text-xl font-semibold text-[var(--km-text)]">{detailTarget.crop_name}</h3>
                <div className="km-pill w-fit">
                  Rs {detailTarget.expected_price}/{detailTarget.unit}
                </div>
                <p className="text-sm text-[var(--km-muted)]">
                  {t('quantity', 'Quantity')}: {detailTarget.quantity} {detailTarget.unit}
                </p>
                <p className="text-sm text-[var(--km-muted)]">
                  {t('location', 'Location')}: {detailTarget.location}
                </p>
                <p className="text-sm text-[var(--km-muted)]">
                  {t('farmer', 'Farmer')}: {detailTarget.user_profiles?.full_name || '-'}
                </p>
                <p className="text-sm text-[var(--km-muted)]">
                  {t('district', 'District')}: {detailTarget.user_profiles?.district || '-'} | {t('state', 'State')}:{' '}
                  {detailTarget.user_profiles?.state || '-'}
                </p>
                {detailTarget.description && (
                  <p className="text-sm leading-6 text-[var(--km-text)]">{detailTarget.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <a
                    href={`tel:${detailTarget.contact_number}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--km-border)] text-sm font-medium"
                  >
                    <Phone className="h-4 w-4" />
                    {t('contact', 'Contact')}
                  </a>
                  {!isOwner(detailTarget) && detailTarget.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => openOfferModal(detailTarget)}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--km-primary)] text-sm font-semibold text-white"
                    >
                      {t('makeOffer', 'Make Offer')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-200 text-sm font-semibold text-slate-500"
                    >
                      {t('status', 'Status')}: {detailTarget.status}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="mt-1 text-xs font-semibold text-[var(--km-muted)] hover:text-[var(--km-text)]"
                >
                  {t('cancel', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {offerTarget && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-[var(--km-shadow-lg)]">
            <h3 className="text-lg font-semibold text-[var(--km-text)]">{t('makeOffer', 'Make Offer')}</h3>
            <p className="mt-1 text-sm text-[var(--km-muted)]">{offerTarget.crop_name}</p>
            <form className="mt-4 space-y-3" onSubmit={handleSendOffer}>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--km-muted)]">Offer Price</label>
                <input
                  required
                  type="number"
                  value={offerForm.offerPrice}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, offerPrice: e.target.value }))}
                  className="km-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--km-muted)]">{t('quantity', 'Quantity')}</label>
                <input
                  required
                  type="number"
                  value={offerForm.quantity}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="km-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--km-muted)]">{t('message', 'Message')}</label>
                <textarea
                  rows={3}
                  value={offerForm.message}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, message: e.target.value }))}
                  className="km-input"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOfferTarget(null)} className="km-btn km-btn-neutral flex-1">
                  {t('cancel', 'Cancel')}
                </button>
                <button type="submit" disabled={sendingOffer} className="km-btn km-btn-green flex-1 disabled:opacity-60">
                  {sendingOffer ? t('loading', 'Sending...') : t('submit', 'Submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
