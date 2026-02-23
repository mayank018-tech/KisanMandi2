import { useEffect, useState } from 'react';
import { Bookmark, Filter, MapPin, MessageSquare, Phone, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { savePost, unsavePost } from '../features/community/api';
import FarmerProfile from '../components/FarmerProfile';
import SafeImage from '../components/common/SafeImage';

function getStatusLabel(status: string | undefined, t: (key: string, fallback?: string) => string) {
  if (status === 'sold') return t('sold', 'Sold');
  if (status === 'expired') return t('negotiating', 'Negotiating');
  return t('available', 'Available');
}

function getStatusClass(status?: string) {
  if (status === 'sold') return 'bg-rose-50 text-rose-700';
  if (status === 'expired') return 'bg-amber-50 text-amber-700';
  return 'bg-emerald-50 text-emerald-700';
}

export default function TraderDashboard() {
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [listings, setListings] = useState<any[]>([]);
  const [filteredListings, setFilteredListings] = useState<any[]>([]);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<Record<string, number>>({});
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);

  const [filters, setFilters] = useState({
    cropName: '',
    minPrice: '',
    maxPrice: '',
    location: '',
  });

  useEffect(() => {
    void loadListings();
    if (profile?.id) void loadBookmarks();
  }, [profile?.id]);

  useEffect(() => {
    applyFilters();
  }, [filters, listings]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crop_listings')
        .select(`
          *,
          listing_images(*),
          user_profiles!farmer_id(full_name, mobile_number, state, district)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Failed to load listings', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase.from('saves').select('listing_id').eq('user_id', profile.id);
      if (error) throw error;
      setBookmarked(new Set((data || []).map((row: any) => row.listing_id as string)));
    } catch (err) {
      console.error('Failed to load bookmarks', err);
    }
  };

  const applyFilters = () => {
    let result = [...listings];

    if (filters.cropName) {
      result = result.filter((listing) =>
        listing.crop_name.toLowerCase().includes(filters.cropName.toLowerCase())
      );
    }

    if (filters.minPrice) {
      result = result.filter((listing) => listing.expected_price >= Number(filters.minPrice));
    }

    if (filters.maxPrice) {
      result = result.filter((listing) => listing.expected_price <= Number(filters.maxPrice));
    }

    if (filters.location) {
      result = result.filter((listing) => listing.location.toLowerCase().includes(filters.location.toLowerCase()));
    }

    setFilteredListings(result);
  };

  const handleBookmark = async (listingId: string) => {
    if (!profile?.id) return;

    const currentlySaved = bookmarked.has(listingId);

    setBookmarked((prev) => {
      const next = new Set(prev);
      if (currentlySaved) next.delete(listingId);
      else next.add(listingId);
      return next;
    });

    try {
      if (currentlySaved) await unsavePost(profile.id, listingId);
      else await savePost(profile.id, listingId);
    } catch (err) {
      console.error('Bookmark update failed', err);
      setBookmarked((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.add(listingId);
        else next.delete(listingId);
        return next;
      });
    }
  };

  const nextImage = (listingId: string, totalImages: number) => {
    setSelectedImageIndex((prev) => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) + 1) % totalImages,
    }));
  };

  const prevImage = (listingId: string, totalImages: number) => {
    setSelectedImageIndex((prev) => ({
      ...prev,
      [listingId]: ((prev[listingId] || totalImages) - 1) % totalImages,
    }));
  };

  return (
    <div className="km-page">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <section className="mb-5 rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-4 shadow-[var(--km-shadow-sm)]">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--km-muted)]" />
              <input
                type="text"
                value={filters.cropName}
                onChange={(e) => setFilters({ ...filters, cropName: e.target.value })}
                placeholder={t('searchCrop', 'Search crop')}
                className="h-10 w-full rounded-lg border border-[var(--km-border)] pl-9 pr-3 text-sm outline-none focus:border-[var(--km-primary)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--km-border)] px-3 text-sm text-[var(--km-text)] hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              {t('filters', 'Filters')}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                placeholder={t('minPrice', 'Min Price')}
                className="h-10 rounded-lg border border-[var(--km-border)] px-3 text-sm outline-none focus:border-[var(--km-primary)]"
              />
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                placeholder={t('maxPrice', 'Max Price')}
                className="h-10 rounded-lg border border-[var(--km-border)] px-3 text-sm outline-none focus:border-[var(--km-primary)]"
              />
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                placeholder={t('location', 'Location')}
                className="h-10 rounded-lg border border-[var(--km-border)] px-3 text-sm outline-none focus:border-[var(--km-primary)]"
              />
            </div>
          )}
        </section>

        {loading ? (
          <div className="rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-8 text-center text-sm text-[var(--km-muted)]">
            {t('loadingListings', 'Loading listings...')}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] p-8 text-center text-sm text-[var(--km-muted)]">
            {t('noListingsForFilters', 'No listings found for current filters.')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((listing) => {
              const images = listing.listing_images || [];
              const currentIndex = selectedImageIndex[listing.id] || 0;
              const currentImage = images[currentIndex];

              return (
                <article
                  key={listing.id}
                  className="overflow-hidden rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] shadow-[var(--km-shadow-sm)] transition hover:shadow-[var(--km-shadow-md)]"
                >
                  <div className="relative h-48 bg-slate-100">
                    {currentImage ? (
                      <SafeImage src={currentImage.url} alt={listing.crop_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--km-muted)]">{t('noImage', 'No image')}</div>
                    )}

                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => prevImage(listing.id, images.length)}
                          className="absolute left-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
                        >
                          {'<'}
                        </button>
                        <button
                          type="button"
                          onClick={() => nextImage(listing.id, images.length)}
                          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
                        >
                          {'>'}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleBookmark(listing.id)}
                      className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                        bookmarked.has(listing.id) ? 'bg-[var(--km-primary)] text-white' : 'bg-white text-[var(--km-muted)]'
                      }`}
                    >
                      <Bookmark className="h-4 w-4" fill={bookmarked.has(listing.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-[var(--km-text)]">{listing.crop_name}</h3>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${getStatusClass(listing.status)}`}>
                        {getStatusLabel(listing.status, t)}
                      </span>
                    </div>

                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-lg font-bold text-[var(--km-text)]">Rs {listing.expected_price}/{listing.unit}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-[var(--km-muted)]">
                        {t('grade', 'Grade')} {(listing as any).quality_grade || 'N/A'}
                      </span>
                    </div>

                    <div className="mb-3 flex items-center gap-1 text-sm text-[var(--km-muted)]">
                      <MapPin className="h-4 w-4" />
                      <span>{listing.location}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFarmer({
                          id: listing.farmer_id,
                          name: listing.user_profiles?.full_name || t('unknownFarmer', 'Unknown Farmer'),
                          phone: listing.contact_number,
                          location: listing.location,
                        })
                      }
                      className="mb-3 text-sm font-medium text-[var(--km-primary)] hover:underline"
                    >
                      {listing.user_profiles?.full_name || t('unknownFarmer', 'Unknown Farmer')}
                    </button>

                    <div className="mb-4 text-sm text-[var(--km-muted)]">{listing.quantity} {listing.unit} {t('available', 'Available')}</div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${listing.contact_number}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--km-border)] text-sm font-medium text-[var(--km-text)] transition hover:bg-slate-50"
                      >
                        <Phone className="h-4 w-4" />
                        {t('contact', 'Contact')}
                      </a>
                      <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--km-primary)] text-sm font-semibold text-white transition hover:brightness-95"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {t('offer', 'Offer')}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selectedFarmer && (
        <FarmerProfile
          farmerId={selectedFarmer.id}
          farmerName={selectedFarmer.name}
          farmerPhone={selectedFarmer.phone}
          farmerLocation={selectedFarmer.location}
          onClose={() => setSelectedFarmer(null)}
        />
      )}
    </div>
  );
}
