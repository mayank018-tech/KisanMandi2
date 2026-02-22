import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { savePost, unsavePost } from '../features/community/api';
import { Search, Filter, Bookmark, Phone, MessageSquare, Users } from 'lucide-react';
import FarmerProfile from '../components/FarmerProfile';

export default function TraderDashboard() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [listings, setListings] = useState<any[]>([]);
  const [filteredListings, setFilteredListings] = useState<any[]>([]);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<Record<string, number>>({});

  const [filters, setFilters] = useState({
    cropName: '',
    minPrice: '',
    maxPrice: '',
    location: '',
  });
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);

  useEffect(() => {
    loadListings();
    if (profile?.id) loadBookmarks();
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
        .limit(50);

      if (!error && data) {
        setListings(data);
      }
    } catch (err) {
      console.error('Failed to load listings', err);
    }
    setLoading(false);
  };

  const loadBookmarks = async () => {
    try {
      if (!profile?.id) return;
      const { data, error } = await supabase
        .from('saves')
        .select('listing_id')
        .eq('user_id', profile.id);

      if (!error && data) {
        const ids: Set<string> = new Set(data.map((b: any) => b.listing_id as string));
        setBookmarked(ids);
      }
    } catch (err) {
      console.error('Failed to load bookmarks', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...listings];

    if (filters.cropName) {
      filtered = filtered.filter((l) =>
        l.crop_name.toLowerCase().includes(filters.cropName.toLowerCase())
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter((l) => l.expected_price >= parseInt(filters.minPrice));
    }

    if (filters.maxPrice) {
      filtered = filtered.filter((l) => l.expected_price <= parseInt(filters.maxPrice));
    }

    if (filters.location) {
      filtered = filtered.filter((l) =>
        l.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    setFilteredListings(filtered);
  };

  const handleBookmark = async (listingId: string) => {
    if (!profile?.id) return alert('Please login to bookmark');

    const isCurrentlySaved = bookmarked.has(listingId);
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (isCurrentlySaved) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });

    try {
      if (isCurrentlySaved) {
        await unsavePost(profile.id, listingId);
      } else {
        await savePost(profile.id, listingId);
      }
    } catch (err) {
      console.error('Bookmark failed', err);
      setBookmarked((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) {
          next.add(listingId);
        } else {
          next.delete(listingId);
        }
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
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <header className="bg-blue-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">{t('appName')} - Trader</h1>
          <p className="text-blue-100">Browse available crops</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex-1 min-w-xs relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={filters.cropName}
                onChange={(e) => setFilters({ ...filters, cropName: e.target.value })}
                placeholder="Search by crop name..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Price (₹)
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Price (₹)
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading listings...</div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500">No listings found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing) => {
              const images = listing.listing_images || [];
              const currentImageIndex = selectedImageIndex[listing.id] || 0;
              const currentImage = images[currentImageIndex];

              return (
                <div key={listing.id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
                  {/* Image Gallery */}
                  <div className="relative h-48 bg-gray-200">
                    {currentImage ? (
                      <img src={currentImage.url} alt={listing.crop_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                    )}

                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => prevImage(listing.id, images.length)}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => nextImage(listing.id, images.length)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75"
                        >
                          ›
                        </button>
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                          {currentImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => handleBookmark(listing.id)}
                      className={`absolute top-2 right-2 p-2 rounded-full ${
                        bookmarked.has(listing.id)
                          ? 'bg-yellow-400 text-white'
                          : 'bg-white text-gray-600 hover:bg-yellow-400'
                      }`}
                    >
                      <Bookmark className="w-5 h-5" fill={bookmarked.has(listing.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{listing.crop_name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        Grade {(listing as any).quality_grade || 'N/A'}
                      </span>
                    </div>

                    {/* Farmer Info with Profile Link */}
                    <div className="mb-3 pb-3 border-b">
                      <button
                        onClick={() =>
                          setSelectedFarmer({
                            id: listing.farmer_id,
                            name: listing.user_profiles?.full_name || 'Unknown Farmer',
                            phone: listing.contact_number,
                            location: listing.location,
                          })
                        }
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline mb-2"
                      >
                        <Users className="w-4 h-4" />
                        <span className="font-semibold text-sm">{listing.user_profiles?.full_name || 'Unknown'}</span>
                      </button>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <p><span className="font-semibold">Price:</span> ₹{listing.expected_price}/{listing.unit}</p>
                      <p><span className="font-semibold">Quantity:</span> {listing.quantity} {listing.unit}</p>
                      <p><span className="font-semibold">Location:</span> {listing.location}</p>
                    </div>

                    {listing.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{listing.description}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={`tel:${listing.contact_number}`}
                        className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                      <button className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                        <MessageSquare className="w-4 h-4" />
                        Offer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Farmer Profile Modal */}
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
