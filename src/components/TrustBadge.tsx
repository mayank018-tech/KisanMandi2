import { Star, Check } from 'lucide-react';

interface TrustBadgeProps {
  averageRating: number;
  totalRatings: number;
  isVerified: boolean;
  completedDeals: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function TrustBadge({
  averageRating,
  totalRatings,
  isVerified,
  completedDeals,
  size = 'md',
}: TrustBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]}`}>
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="font-semibold text-gray-800">{averageRating.toFixed(1)}</span>
        <span className="text-gray-500">({totalRatings})</span>
      </div>

      {isVerified && (
        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          <Check className="w-3 h-3" />
          <span className="font-semibold">Verified</span>
        </div>
      )}

      {completedDeals > 0 && (
        <span className="text-gray-600">{completedDeals} deals</span>
      )}
    </div>
  );
}
