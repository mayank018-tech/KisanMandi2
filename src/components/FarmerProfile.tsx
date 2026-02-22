import { useEffect, useState } from 'react';
import { X, Phone, MapPin, Star } from 'lucide-react';
import { getFarmerStats, getFarmerRatings, hasUserRatedFarmer } from '../features/ratings/api';
import TrustBadge from './TrustBadge';
import RatingForm from './RatingForm';

interface FarmerProfileProps {
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  farmerLocation?: string;
  onClose: () => void;
}

export default function FarmerProfile({
  farmerId,
  farmerName,
  farmerPhone,
  farmerLocation,
  onClose,
}: FarmerProfileProps) {
  const [stats, setStats] = useState({
    averageRating: 0,
    totalRatings: 0,
    completedDeals: 0,
    isVerified: false,
  });
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    loadFarmerData();
  }, [farmerId]);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      const farmerStats = await getFarmerStats(farmerId);
      setStats(farmerStats);

      const farmerReviews = await getFarmerRatings(farmerId);
      setReviews(farmerReviews);

      const userHasRated = await hasUserRatedFarmer(userId, farmerId);
      setHasRated(userHasRated);
    } catch (err) {
      console.error('Failed to load farmer data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSuccess = async () => {
    await loadFarmerData();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div>
            <h2 className="text-xl font-bold">{farmerName}</h2>
            <p className="text-blue-100 text-sm">Farmer Profile</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading farmer profile...</div>
          ) : (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="space-y-2">
                {farmerPhone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <a href={`tel:${farmerPhone}`} className="hover:text-blue-600">
                      {farmerPhone}
                    </a>
                  </div>
                )}
                {farmerLocation && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    {farmerLocation}
                  </div>
                )}
              </div>

              {/* Trust Stats */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <TrustBadge
                  averageRating={stats.averageRating}
                  totalRatings={stats.totalRatings}
                  isVerified={stats.isVerified}
                  completedDeals={stats.completedDeals}
                  size="md"
                />
              </div>

              {/* Reviews */}
              {reviews.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Recent Reviews</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-gray-50 p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-800">
                            {(review.user_profiles || {}).full_name || 'Anonymous'}
                          </span>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-600">{review.comment}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviews.length === 0 && (
                <div className="text-center py-6 text-gray-500">No reviews yet</div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Rate Button */}
        <div className="border-t p-4 bg-gray-50">
          <button
            onClick={() => setShowRatingForm(true)}
            disabled={hasRated}
            className={`w-full px-4 py-2 rounded-lg font-medium transition ${
              hasRated
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {hasRated ? 'You have rated this farmer' : 'Rate This Farmer'}
          </button>
        </div>
      </div>

      {/* Rating Form Modal */}
      {showRatingForm && (
        <RatingForm
          farmerId={farmerId}
          farmerName={farmerName}
          onClose={() => setShowRatingForm(false)}
          onSuccess={handleRatingSuccess}
        />
      )}
    </div>
  );
}
