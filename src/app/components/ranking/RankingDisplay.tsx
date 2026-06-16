// ============================================================================
// RANKING DISPLAY EXAMPLES
// How to show apartment ranking scores and explanations in UI components
// ============================================================================

import React from 'react';
import { type RankingScoreBreakdown } from '@/app/utils/rankingEngine';
import { TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

// ============================================================================
// Example 1: Simple Score Badge
// ============================================================================

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RankingScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  // Determine color and label based on score
  let bgColor = 'bg-red-100';
  let textColor = 'text-red-700';
  let label = 'Fair Match';
  let icon = AlertCircle;

  if (score >= 80) {
    bgColor = 'bg-green-100';
    textColor = 'text-green-700';
    label = 'Excellent';
    icon = CheckCircle;
  } else if (score >= 65) {
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-700';
    label = 'Good';
    icon = TrendingUp;
  } else if (score >= 50) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-700';
    label = 'Fair';
  }

  const Icon = icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm';

  return (
    <div className={`${bgColor} ${textColor} rounded-full ${sizeClasses} font-semibold flex items-center gap-1.5 inline-flex`}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      <span>{label}</span>
      <span className="font-bold">{score}</span>
    </div>
  );
}

// ============================================================================
// Example 2: Score Breakdown Tooltip
// ============================================================================

interface ScoreBreakdownProps {
  breakdown: RankingScoreBreakdown;
}

export function RankingScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const factors = [
    { label: 'Location', score: breakdown.locationScore, weight: 30 },
    { label: 'Budget', score: breakdown.budgetScore, weight: 25 },
    { label: 'Availability', score: breakdown.availabilityScore, weight: 15 },
    { label: 'Amenities', score: breakdown.amenitiesScore, weight: 10 },
    { label: 'Verification', score: breakdown.verificationScore, weight: 10 },
    { label: 'Popularity', score: breakdown.popularityScore, weight: 5 },
    { label: 'Activity', score: breakdown.activityScore, weight: 5 },
  ];

  // Sort by score descending
  const sorted = [...factors].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white rounded-lg border border-amber-200 p-4 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">Ranking Breakdown</h3>
        <div className="text-2xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
          {breakdown.finalScore}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map(factor => (
          <div key={factor.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">
                {factor.label}
                <span className="text-xs text-slate-400 ml-1">({factor.weight}%)</span>
              </span>
              <span className="font-bold text-slate-900">{factor.score}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${(factor.score / 100) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-amber-100 pt-3 mt-3">
        <p className="text-xs text-slate-600 font-medium">
          💡 <strong>Tip:</strong> Higher scores indicate better matches for your preferences.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Example 3: Recommendation Explanation with Icon
// ============================================================================

interface RecommendationExplanationProps {
  explanation: string;
  score: number;
  compact?: boolean;
}

export function RecommendationExplanation({
  explanation,
  score,
  compact = false,
}: RecommendationExplanationProps) {
  const icon = score >= 80 ? '⭐' : score >= 65 ? '👍' : '📍';

  if (compact) {
    return (
      <div className="text-xs text-slate-600 flex items-center gap-1.5">
        <span>{icon}</span>
        <span className="italic truncate">{explanation}</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{icon}</span>
        <div className="flex-1">
          <p className="text-sm text-slate-700 font-medium">{explanation}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 4: Enhanced ApartmentCard with Ranking
// ============================================================================

import type { Apartment } from '@/app/data/apartments';

interface ApartmentWithRankingProps {
  apartment: Apartment & { rankingScore: number; scoreBreakdown: RankingScoreBreakdown };
  explanation?: string;
  showBreakdown?: boolean;
}

export function ApartmentCardWithRanking({
  apartment,
  explanation,
  showBreakdown = false,
}: ApartmentWithRankingProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="border border-amber-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image and Score Badge */}
      <div className="relative">
        <img
          src={apartment.image}
          alt={apartment.title}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 right-3 z-10">
          <RankingScoreBadge score={apartment.rankingScore} size="md" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-slate-900 mb-1">{apartment.title}</h3>
          <p className="text-sm text-slate-600">{apartment.address}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-slate-900">
            ₱{apartment.price.toLocaleString()}/mo
          </span>
          <span className="text-sm text-slate-600">
            {apartment.bedrooms} bed • {apartment.bathrooms} bath
          </span>
        </div>

        {/* Explanation */}
        {explanation && (
          <RecommendationExplanation
            explanation={explanation}
            score={apartment.rankingScore}
            compact={true}
          />
        )}

        {/* Breakdown Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-sm font-semibold text-amber-600 hover:text-amber-700 py-2 px-3 rounded-lg hover:bg-amber-50 transition-colors"
        >
          {showDetails ? 'Hide Details' : 'See Ranking Details'}
        </button>

        {/* Breakdown Details */}
        {showDetails && <RankingScoreBreakdown breakdown={apartment.scoreBreakdown} />}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg transition-colors">
            View Details
          </button>
          <button className="flex-1 border border-amber-300 text-amber-600 font-semibold py-2 rounded-lg hover:bg-amber-50 transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: Recommended Apartments List
// ============================================================================

interface RecommendedApartmentsProps {
  apartments: Array<Apartment & { rankingScore: number; scoreBreakdown: RankingScoreBreakdown }>;
  explanations?: Map<string, string>;
  title?: string;
  showRanking?: boolean;
}

export function RecommendedApartmentsList({
  apartments,
  explanations,
  title = 'Recommended For You',
  showRanking = true,
}: RecommendedApartmentsProps) {
  if (apartments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 mb-3">No apartments match your preferences yet.</p>
        <p className="text-sm text-slate-500">Try adjusting your filters to see more options.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600">
          Based on your location, budget, and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apartments.map(apt => (
          <ApartmentCardWithRanking
            key={apt.id}
            apartment={apt}
            explanation={explanations?.get(apt.id)}
            showBreakdown={showRanking}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Example 6: Ranking Comparison (side-by-side)
// ============================================================================

interface RankingComparisonProps {
  apartments: Array<Apartment & { rankingScore: number }>;
  limit?: number;
}

export function RankingComparison({
  apartments,
  limit = 5,
}: RankingComparisonProps) {
  const sorted = [...apartments].sort((a, b) => b.rankingScore - a.rankingScore).slice(0, limit);

  return (
    <div className="space-y-2">
      {sorted.map((apt, index) => (
        <div
          key={apt.id}
          className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors"
        >
          {/* Rank */}
          <div className="text-lg font-black text-slate-400 w-8 text-center">
            #{index + 1}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 truncate">{apt.title}</h4>
            <p className="text-xs text-slate-500">{apt.city}</p>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="font-bold text-slate-900">₱{apt.price.toLocaleString()}</p>
          </div>

          {/* Score */}
          <div className="text-right w-16">
            <RankingScoreBadge score={apt.rankingScore} size="sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example Usage in Component
// ============================================================================

/*
import React from 'react';
import { useApartmentRanking } from '@/app/hooks/useApartmentRanking';
import { RecommendedApartmentsList } from '@/components/ranking/RankingDisplay';

export function DashboardRecommendations() {
  const { personalizedRecommendations, topApartmentExplanation } = useApartmentRanking({
    apartments: allApartments,
    userRole: user?.role,
    preferences: userPreferences,
    userFavoriteIds
  });

  const explanationMap = new Map();
  personalizedRecommendations.forEach(apt => {
    explanationMap.set(apt.id, topApartmentExplanation || 'Recommended for you');
  });

  return (
    <RecommendedApartmentsList
      apartments={personalizedRecommendations}
      explanations={explanationMap}
      title="Recommended For You"
      showRanking={true}
    />
  );
}
*/

// ============================================================================
// Styling Helper (if using CSS)
// ============================================================================

export const rankingStyles = `
  .ranking-badge {
    @apply inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-sm;
  }

  .ranking-badge.excellent {
    @apply bg-green-100 text-green-700;
  }

  .ranking-badge.good {
    @apply bg-blue-100 text-blue-700;
  }

  .ranking-badge.fair {
    @apply bg-yellow-100 text-yellow-700;
  }

  .ranking-badge.poor {
    @apply bg-red-100 text-red-700;
  }

  .ranking-breakdown {
    @apply bg-white border border-amber-200 rounded-lg p-4 space-y-3;
  }

  .ranking-factor {
    @apply space-y-1;
  }

  .ranking-factor-bar {
    @apply w-full bg-slate-100 rounded-full h-2;
    background: linear-gradient(to right, rgb(251, 146, 60), rgb(249, 115, 22));
  }
`;
