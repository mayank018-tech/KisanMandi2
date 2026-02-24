import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Search, Filter, MessageSquare, Phone, IndianRupee } from 'lucide-react';
import SafeImage from '../components/common/SafeImage';
import type { Database } from '../lib/database.types';

type CropListing = Database['public']['Tables']['crop_listings']['Row'] & {
  farmer_profile: { full_name: string; state: string; district: string };
  listing_images?: { url: string }[];
};
type Offer = Database['public']['Tables']['offers']['Row'] & {
  listing: { crop_name: string };
  farmer_profile: { full_name: string };
};

export default function BuyerDashboard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [listings, setListings] = useState<CropListing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [filteredListings, setFilteredListings] = useState<CropListing[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showMyOffers, setShowMyOffers] = useState(false);
  const [selectedListing, setSelectedListing] = useState<CropListing | null>(null);
  const [detailListing, setDetailListing] = useState<CropListing | null>(null);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    searchTerm: '',
    district: '',
    minPrice: '',
    maxPrice: '',
    minQuantity: '',
  });

  const [offerData, setOfferData] = useState({
    offerPrice: '',
    message: '',
  });

  useEffect(() => {
    fetchListings();
    fetchMyOffers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, listings]);

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from('crop_listings')
      .select(`
        *,
        farmer_profile:user_profiles!crop_listings_farmer_id_fkey(full_name, state, district),
        listing_images(*)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setListings(data as CropListing[]);
      setFilteredListings(data as CropListing[]);
    }
    setLoading(false);
  };

  const fetchMyOffers = async () => {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        listing:crop_listings(crop_name),
        farmer_profile:user_profiles!offers_farmer_id_fkey(full_name)
      `)
      .eq('buyer_id', profile?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyOffers(data as Offer[]);
    }
  };

  const applyFilters = () => {
    let filtered = [...listings];

    if (filters.searchTerm) {
      filtered = filtered.filter((listing) =>
        listing.crop_name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    if (filters.district) {
      filtered = filtered.filter((listing) =>
        listing.farmer_profile.district.toLowerCase().includes(filters.district.toLowerCase())
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter((listing) => listing.expected_price >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      filtered = filtered.filter((listing) => listing.expected_price <= parseFloat(filters.maxPrice));
    }

    if (filters.minQuantity) {
      filtered = filtered.filter((listing) => listing.quantity >= parseFloat(filters.minQuantity));
    }

    setFilteredListings(filtered);
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedListing) return;

    await supabase.from('offers').insert([
      {
        listing_id: selectedListing.id,
        buyer_id: profile!.id,
        farmer_id: selectedListing.farmer_id,
        offer_price: parseFloat(offerData.offerPrice),
        message: offerData.message,
      },
    ]);

    setOfferData({ offerPrice: '', message: '' });
    setShowOfferModal(false);
    setSelectedListing(null);
    fetchMyOffers();
    alert(t('offerSentSuccessfully', 'Offer sent successfully!'));
  };

  const openOfferModal = (listing: CropListing) => {
    setSelectedListing(listing);
    setOfferData({ offerPrice: listing.expected_price.toString(), message: '' });
    setShowOfferModal(true);
  };

  const openDetail = (listing: CropListing) => {
    setDetailListing(listing);
    setDetailImageIndex(0);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="km-page">
      <div className="km-container">
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowMyOffers(!showMyOffers)}
            className="km-btn km-btn-blue w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-base sm:text-lg"
          >
            <MessageSquare className="w-5 h-5" />
            {t('myOffers')} ({myOffers.length})
          </button>
          <a
            href="/mandi-prices"
            className="km-btn km-btn-orange w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-base sm:text-lg"
          >
            <IndianRupee className="w-5 h-5" />
            {t('mandiPrices', 'Mandi Price')}
          </a>
        </div>

        {showMyOffers && (
          <div className="km-card mb-6">
            <h2 className="text-xl font-bold mb-4">{t('myOffers')}</h2>
            {myOffers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('noOffersSentYet', 'No offers sent yet')}</p>
            ) : (
              <div className="space-y-4">
                {myOffers.map((offer) => (
                  <div key={offer.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{offer.listing.crop_name}</p>
                        <p className="text-sm text-gray-600">{t('farmer', 'Farmer')}: {offer.farmer_profile.full_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">₹{offer.offer_price}</p>
                        <span className="text-xs text-gray-500">{new Date(offer.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 mt-2">{offer.message}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                      offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {offer.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="km-card mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t('filter')} & {t('search')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('searchCrops')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  placeholder={t('cropName')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('district')}
              </label>
              <input
                type="text"
                value={filters.district}
                onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('minPrice')} (₹)
              </label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('maxPrice')} (₹)
              </label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="km-card">
          <h2 className="text-xl font-bold mb-4">{t('searchCrops')} ({filteredListings.length})</h2>
          {filteredListings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noCropsMatchCriteria', 'No crops found matching your criteria')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing) => {
                const firstImage = listing.listing_images?.[0]?.url;
                return (
                  <div
                    key={listing.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer"
                    onClick={() => openDetail(listing)}
                  >
                    <div className="h-40 bg-gray-100">
                      {firstImage ? (
                        <SafeImage src={firstImage} alt={listing.crop_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-400">{t('noImage', 'No image')}</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">{listing.crop_name}</h3>
                      <div className="space-y-1 text-sm text-gray-600 mb-4">
                        <p><span className="font-semibold">{t('quantity')}:</span> {listing.quantity} {listing.unit}</p>
                        <p><span className="font-semibold">{t('expectedPrice')}:</span> ₹{listing.expected_price}/{listing.unit}</p>
                        <p><span className="font-semibold">{t('location')}:</span> {listing.location}</p>
                        <p><span className="font-semibold">{t('farmer')}:</span> {listing.farmer_profile.full_name}</p>
                        <p><span className="font-semibold">{t('district')}:</span> {listing.farmer_profile.district}</p>
                        <p><span className="font-semibold">{t('state')}:</span> {listing.farmer_profile.state}</p>
                      </div>
                      {listing.description && (
                        <p className="text-sm text-gray-700 mb-4 line-clamp-2">{listing.description}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openOfferModal(listing)}
                          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {t('sendOffer')}
                        </button>
                        <a
                          href={`tel:${listing.contact_number}`}
                          className="flex items-center justify-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Listing detail modal */}
      {detailListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <button
              onClick={() => setDetailListing(null)}
              className="absolute right-3 top-3 rounded-full bg-black/10 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-black/15"
            >
              ✕
            </button>
            <div className="grid gap-4 p-4 md:grid-cols-[1.3fr_1fr]">
              <div className="relative overflow-hidden rounded-xl bg-gray-100 h-72 md:h-full">
                {detailListing.listing_images?.length ? (
                  <SafeImage
                    src={detailListing.listing_images[detailImageIndex]?.url}
                    alt={detailListing.crop_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--km-muted)]">
                    {t('noImage', 'No image')}
                  </div>
                )}
                {detailListing.listing_images && detailListing.listing_images.length > 1 && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
                      onClick={() =>
                        setDetailImageIndex((i) =>
                          i === 0 ? detailListing.listing_images!.length - 1 : i - 1
                        )
                      }
                    >
                      ‹
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white"
                      onClick={() =>
                        setDetailImageIndex((i) =>
                          i === detailListing.listing_images!.length - 1 ? 0 : i + 1
                        )
                      }
                    >
                      ›
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                      {detailListing.listing_images.map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-2 w-2 rounded-full ${idx === detailImageIndex ? 'bg-white' : 'bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-3">
                <div className="km-pill w-fit">
                  {detailListing.quantity} {detailListing.unit} · ₹{detailListing.expected_price}/{detailListing.unit}
                </div>
                <h3 className="text-xl font-semibold text-[var(--km-text)]">{detailListing.crop_name}</h3>
                <p className="text-sm text-[var(--km-muted)]">
                  {detailListing.location} | {t('district', 'District')}: {detailListing.farmer_profile.district} | {t('state', 'State')}: {detailListing.farmer_profile.state}
                </p>
                {detailListing.description && (
                  <p className="text-sm text-[var(--km-text)] leading-relaxed">{detailListing.description}</p>
                )}
                <div className="text-sm text-[var(--km-muted)]">
                  <div>
                    <span className="font-semibold">{t('farmer', 'Farmer')}:</span> {detailListing.farmer_profile.full_name}
                  </div>
                  <div>
                    <span className="font-semibold">{t('contactNumber', 'Contact Number')}:</span> {detailListing.contact_number}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSelectedListing(detailListing);
                      setShowOfferModal(true);
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                  >
                    {t('sendOffer')}
                  </button>
                  <a
                    href={`tel:${detailListing.contact_number}`}
                    className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showOfferModal && selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{t('sendOffer')}</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-semibold">{selectedListing.crop_name}</p>
              <p className="text-sm text-gray-600">{selectedListing.quantity} {selectedListing.unit}</p>
              <p className="text-sm text-gray-600">{t('expected', 'Expected')}: ₹{selectedListing.expected_price}/{selectedListing.unit}</p>
            </div>
            <form onSubmit={handleSendOffer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('offerPrice')} (₹/{selectedListing.unit}) *
                </label>
                <input
                  type="number"
                  value={offerData.offerPrice}
                  onChange={(e) => setOfferData({ ...offerData, offerPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('message')} *
                </label>
                <textarea
                  value={offerData.message}
                  onChange={(e) => setOfferData({ ...offerData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  {t('submit')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOfferModal(false);
                    setSelectedListing(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



