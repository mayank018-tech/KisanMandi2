import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, DollarSign, Calendar, MapPin } from 'lucide-react';
import type { Database } from '../lib/database.types';

type MandiPrice = Database['public']['Tables']['mandi_prices']['Row'];

export default function MandiPrices() {
  const { profile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<MandiPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    cropName: '',
    state: '',
    district: '',
    mandi: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    fetchPrices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, prices]);

  const fetchPrices = async () => {
    const { data, error } = await supabase
      .from('mandi_prices')
      .select('*')
      .order('price_date', { ascending: false });

    if (!error && data) {
      setPrices(data);
      setFilteredPrices(data);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...prices];

    if (filters.cropName) {
      filtered = filtered.filter((price) =>
        price.crop_name.toLowerCase().includes(filters.cropName.toLowerCase())
      );
    }

    if (filters.state) {
      filtered = filtered.filter((price) =>
        price.state.toLowerCase().includes(filters.state.toLowerCase())
      );
    }

    if (filters.district) {
      filtered = filtered.filter((price) =>
        price.district.toLowerCase().includes(filters.district.toLowerCase())
      );
    }

    if (filters.mandi) {
      filtered = filtered.filter((price) =>
        price.mandi_name.toLowerCase().includes(filters.mandi.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((price) => price.price_date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((price) => price.price_date <= filters.dateTo);
    }

    setFilteredPrices(filtered);
  };

  const goBack = () => {
    if (profile?.role === 'farmer') {
      window.location.href = '/farmer-dashboard';
    } else {
      window.location.href = '/buyer-dashboard';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-orange-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={goBack}
              className="bg-orange-700 p-2 rounded-lg hover:bg-orange-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{t('mandiPrices')}</h1>
              <p className="text-orange-100">Daily Market Prices</p>
            </div>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'gu')}
            className="px-3 py-2 bg-white text-gray-800 rounded-lg text-sm"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="gu">ગુજરાતી</option>
          </select>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {t('filter')} Prices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('cropName')}
              </label>
              <input
                type="text"
                value={filters.cropName}
                onChange={(e) => setFilters({ ...filters, cropName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('state')}
              </label>
              <input
                type="text"
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('district')}
              </label>
              <input
                type="text"
                value={filters.district}
                onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mandi Name
              </label>
              <input
                type="text"
                value={filters.mandi}
                onChange={(e) => setFilters({ ...filters, mandi: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              Market Prices ({filteredPrices.length})
            </h2>
          </div>
          {filteredPrices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No price data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t('cropName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Mandi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t('minPrice')} (₹)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t('maxPrice')} (₹)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t('averagePrice')} (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {t('date')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPrices.map((price) => (
                    <tr key={price.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{price.crop_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{price.district}, {price.state}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{price.mandi_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-red-600">₹{price.min_price}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">₹{price.max_price}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-bold text-blue-600">₹{price.average_price}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {new Date(price.price_date).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
