import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, LogOut, DollarSign, MessageSquare } from 'lucide-react';
import type { Database } from '../lib/database.types';

type CropListing = Database['public']['Tables']['crop_listings']['Row'];
type Offer = Database['public']['Tables']['offers']['Row'] & {
  buyer_profile: { full_name: string; mobile_number: string };
};

export default function FarmerDashboard() {
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [listings, setListings] = useState<CropListing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [editingListing, setEditingListing] = useState<CropListing | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    crop_name: '',
    quantity: '',
    unit: 'kg',
    expected_price: '',
    location: '',
    contact_number: profile?.mobile_number || '',
    description: '',
  });

  useEffect(() => {
    fetchListings();
    fetchOffers();
  }, []);

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from('crop_listings')
      .select('*')
      .eq('farmer_id', profile?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setListings(data);
    }
    setLoading(false);
  };

  const fetchOffers = async () => {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        buyer_profile:user_profiles!offers_buyer_id_fkey(full_name, mobile_number)
      `)
      .eq('farmer_id', profile?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOffers(data as Offer[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const listingData = {
      farmer_id: profile!.id,
      crop_name: formData.crop_name,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      expected_price: parseFloat(formData.expected_price),
      location: formData.location,
      contact_number: formData.contact_number,
      description: formData.description,
    };

    if (editingListing) {
      await supabase
        .from('crop_listings')
        .update(listingData)
        .eq('id', editingListing.id);
    } else {
      await supabase.from('crop_listings').insert([listingData]);
    }

    setFormData({
      crop_name: '',
      quantity: '',
      unit: 'kg',
      expected_price: '',
      location: '',
      contact_number: profile?.mobile_number || '',
      description: '',
    });
    setShowAddForm(false);
    setEditingListing(null);
    fetchListings();
  };

  const handleEdit = (listing: CropListing) => {
    setEditingListing(listing);
    setFormData({
      crop_name: listing.crop_name,
      quantity: listing.quantity.toString(),
      unit: listing.unit,
      expected_price: listing.expected_price.toString(),
      location: listing.location,
      contact_number: listing.contact_number,
      description: listing.description || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      await supabase.from('crop_listings').delete().eq('id', id);
      fetchListings();
    }
  };

  const handleMarkAsSold = async (id: string) => {
    await supabase
      .from('crop_listings')
      .update({ status: 'sold' })
      .eq('id', id);
    fetchListings();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{t('appName')}</h1>
            <p className="text-green-100">{profile?.full_name} - {t('farmer')}</p>
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'gu')}
              className="px-3 py-2 bg-white text-gray-800 rounded-lg text-sm"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="gu">ગુજરાતી</option>
            </select>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 bg-green-700 px-4 py-2 rounded-lg hover:bg-green-800 transition"
            >
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowOffers(false);
              setEditingListing(null);
            }}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition text-lg font-semibold"
          >
            <Plus className="w-5 h-5" />
            {t('addListing')}
          </button>
          <button
            onClick={() => {
              setShowOffers(!showOffers);
              setShowAddForm(false);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition text-lg font-semibold"
          >
            <MessageSquare className="w-5 h-5" />
            {t('receivedOffers')} ({offers.length})
          </button>
          <a
            href="/mandi-prices"
            className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition text-lg font-semibold"
          >
            <DollarSign className="w-5 h-5" />
            {t('mandiPrices')}
          </a>
        </div>

        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingListing ? t('edit') : t('addListing')}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('cropName')} *
                </label>
                <input
                  type="text"
                  value={formData.crop_name}
                  onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('quantity')} *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="kg">kg</option>
                    <option value="quintal">Quintal</option>
                    <option value="ton">Ton</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('expectedPrice')} (₹/{formData.unit}) *
                </label>
                <input
                  type="number"
                  value={formData.expected_price}
                  onChange={(e) => setFormData({ ...formData, expected_price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('contactNumber')} *
                </label>
                <input
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('location')} *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  {t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingListing(null);
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {showOffers && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{t('receivedOffers')}</h2>
            {offers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No offers received yet</p>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{offer.buyer_profile.full_name}</p>
                        <p className="text-sm text-gray-600">{offer.buyer_profile.mobile_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">₹{offer.offer_price}</p>
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

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">{t('myListings')}</h2>
          {listings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No listings yet. Add your first listing!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <div key={listing.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{listing.crop_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      listing.status === 'active' ? 'bg-green-100 text-green-800' :
                      listing.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {t(listing.status)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    <p><span className="font-semibold">{t('quantity')}:</span> {listing.quantity} {listing.unit}</p>
                    <p><span className="font-semibold">{t('expectedPrice')}:</span> ₹{listing.expected_price}/{listing.unit}</p>
                    <p><span className="font-semibold">{t('location')}:</span> {listing.location}</p>
                    <p><span className="font-semibold">{t('contactNumber')}:</span> {listing.contact_number}</p>
                  </div>
                  {listing.status === 'active' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(listing)}
                        className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleMarkAsSold(listing.id)}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        {t('markAsSold')}
                      </button>
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
