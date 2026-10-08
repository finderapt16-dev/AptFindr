import { calculateDemandScores } from "@/utils/demand";

export const apartmentIdFromMarketRow = (row) => row?.apartment_id ?? row?.apartmentId;

export function getMarketPeriodStart(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

export function isInMarketPeriod(value, period) {
  if (period === "allTime") return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const thisWeek = getMarketPeriodStart(now);

  if (period === "thisWeek") return date >= thisWeek && date <= now;
  if (period === "lastWeek") {
    const lastWeekStart = new Date(thisWeek);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    return date >= lastWeekStart && date < thisWeek;
  }
  if (period === "last30Days") {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    return date >= thirtyDaysAgo && date <= now;
  }
  return false;
}

export function getMarketPropertyIds(properties = []) {
  return properties.map((property) => property.id).filter(Boolean);
}

export function buildMarketTrendEntries({
  properties = [],
  allTimeViews = [],
  viewActivity = [],
  favorites = [],
  ratings = [],
  period = "allTime",
}) {
  return properties.map((apartment) => {
    const apartmentId = String(apartment.id);
    const views = period === "allTime"
      ? allTimeViews
        .filter((row) => String(apartmentIdFromMarketRow(row) ?? "") === apartmentId)
        .reduce((total, row) => total + Math.max(0, Number(row.view_count ?? row.viewCount ?? 0) || 0), 0)
      : viewActivity
        .filter((row) => String(apartmentIdFromMarketRow(row) ?? "") === apartmentId
          && isInMarketPeriod(row.view_date ?? row.viewed_at ?? row.viewedAt ?? row.created_at ?? row.createdAt, period))
        .reduce((total, row) => total + Math.max(0, Number(row.view_count ?? row.viewCount ?? 1) || 0), 0);

    const propertyFavorites = favorites.filter((favorite) =>
      String(favorite.apartment_id ?? favorite.apartmentId) === apartmentId
      && (period === "allTime" || isInMarketPeriod(favorite.created_at ?? favorite.createdAt, period))
    );
    const propertyRatings = ratings.filter((rating) =>
      String(apartmentIdFromMarketRow(rating) ?? "") === apartmentId
      && (period === "allTime" || isInMarketPeriod(rating.updated_at ?? rating.updatedAt ?? rating.created_at ?? rating.createdAt, period))
    );
    const ratingCount = propertyRatings.length;

    return {
      apartment,
      views,
      favorites: propertyFavorites.length,
      ratingCount,
      ratingAverage: ratingCount
        ? propertyRatings.reduce((total, rating) => total + Number(rating.rating ?? 0), 0) / ratingCount
        : null,
    };
  });
}

export function rankMarketTrendEntries(entries = [], trendType = "demand") {
  const list = trendType === "demand" ? calculateDemandScores(entries) : [...entries];
  return [...list].sort((left, right) => {
    if (trendType === "demand") {
      const difference = Number(right.demandScore ?? 0) - Number(left.demandScore ?? 0);
      if (difference !== 0) return difference;
    }
    return String(left.apartment?.title ?? "").localeCompare(String(right.apartment?.title ?? ""));
  });
}

export function getMarketTrendDetails(trendType) {
  if (trendType === "demand") {
    return {
      heading: "Apartment Demand",
      description: "Apartment demand is calculated using views, favorites, and average ratings.",
    };
  }
  if (trendType === "favorites") {
    return { heading: "Most Favorited Properties", description: "Apartment listings ranked according to tenant favorites." };
  }
  if (trendType === "ratings") {
    return { heading: "Highest Rated Properties", description: "Apartment listings ranked according to average tenant ratings." };
  }
  return { heading: "Most Viewed Properties", description: "Apartment listings ranked according to tenant views." };
}

export function hasMarketTrendEngagement(entries = [], trendType = "demand") {
  return entries.some((item) => {
    if (trendType === "demand") return Number(item.demandScore ?? 0) > 0;
    if (trendType === "views") return Number(item.views ?? 0) > 0;
    if (trendType === "favorites") return Number(item.favorites ?? 0) > 0;
    return item.ratingAverage !== null && Number(item.ratingAverage) > 0;
  });
}

const numericPreferenceValue = (value) => Math.max(0, Number(value) || 0);

function preferenceEntries(rows, labelFormatter = (label) => label) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      label: labelFormatter(row?.label),
      value: numericPreferenceValue(row?.value),
    }))
    .filter((row) => row.label);
}

function formatBedroomLabel(value) {
  if (String(value).toLowerCase() === "any") return "Any";
  if (value === "4+") return "4+ Bedrooms";
  return `${value} Bedroom${value === "1" ? "" : "s"}`;
}

function formatRoomCapacityLabel(value) {
  if (String(value).toLowerCase() === "any") return "Any";
  if (value === "4+") return "4+ People";
  return `${value} ${value === "1" ? "Person" : "People"}`;
}

// These are the actual values available in Tenant Preferences. They only
// provide labels for an empty chart; their values always begin at zero.
const PREFERENCE_CATEGORY_DEFAULTS = {
  preferredAreas: [
    "Aguinaldo", "Baldoza", "Bantud", "Banuyao", "Burgos-Mabini-Plaza",
    "Caingin", "Divinagracia", "Gustilo", "Hinactacan", "Ingore", "Jereos",
    "Laguda", "Lopez Jaena Norte", "Lopez Jaena Sur", "Luna", "Macarthur",
    "Magdalo", "Magsaysay Village", "Nabitasan", "Railway", "Rizal",
    "San Isidro", "San Nicolas", "Tabuc Suba", "Ticud",
  ],
  amenities: ["Pet Friendly", "Parking", "Furnished", "Own Bathroom", "Wi-Fi", "Air Conditioning", "Laundry Area"],
  bedrooms: ["Any", "1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4+ Bedrooms"],
  roomCapacity: ["Any", "1 Person", "2 People", "3 People", "4+ People"],
};

const PREFERENCE_PRICE_RANGE_DEFAULTS = [
  { min: 5000, max: 7000 },
  { min: 7000, max: 9000 },
  { min: 9000, max: 11000 },
  { min: 11000, max: 15000 },
  { min: 15000, max: null },
];

function responseCount(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildPreferenceChart(rows, defaultLabels = [], labelFormatter = (label) => label, responses) {
  const totals = new Map();
  preferenceEntries(rows, labelFormatter).forEach(({ label, value }) => {
    totals.set(label, (totals.get(label) ?? 0) + value);
  });

  const defaultOrder = new Map(defaultLabels.map((label, index) => [label, index]));
  const labels = [...defaultLabels, ...[...totals.keys()].filter((label) => !defaultOrder.has(label))];
  const data = labels
    .map((label, index) => ({ label, value: totals.get(label) ?? 0, order: defaultOrder.get(label) ?? defaultLabels.length + index }))
    .sort((left, right) => right.value - left.value || left.order - right.order || left.label.localeCompare(right.label))
    .map(({ label, value }) => ({ label, value }));
  const recordedResponses = responseCount(responses, data.reduce((sum, item) => sum + item.value, 0));

  return { data, responseCount: recordedResponses };
}

function formatPeso(value) {
  return `₱${numericPreferenceValue(value).toLocaleString("en-PH")}`;
}

export function formatPreferredPriceRange({ min, max }) {
  const minimum = numericPreferenceValue(min);
  const maximum = Number(max);
  if (Number.isFinite(maximum) && maximum > 0) return `${formatPeso(minimum)} – ${formatPeso(maximum)}`;
  return `${formatPeso(minimum)} and above`;
}

export function formatTenantPreferenceAnalytics(analytics = {}) {
  const source = analytics && typeof analytics === "object" ? analytics : {};
  const priceRangeRows = (Array.isArray(source.priceRanges) ? source.priceRanges : [])
    .map((row) => ({
      label: formatPreferredPriceRange(row ?? {}),
      value: numericPreferenceValue(row?.value),
    }))
    .filter((row) => row.label);
  const priceRangeDefaults = PREFERENCE_PRICE_RANGE_DEFAULTS.map((range) => formatPreferredPriceRange(range));
  const responseCounts = source.responseCounts && typeof source.responseCounts === "object" ? source.responseCounts : {};

  return {
    preferredAreas: buildPreferenceChart(source.preferredAreas, PREFERENCE_CATEGORY_DEFAULTS.preferredAreas, undefined, responseCounts.preferredAreas),
    amenities: buildPreferenceChart(source.amenities, PREFERENCE_CATEGORY_DEFAULTS.amenities, undefined, responseCounts.amenities),
    bedrooms: buildPreferenceChart(source.bedrooms, PREFERENCE_CATEGORY_DEFAULTS.bedrooms, formatBedroomLabel, responseCounts.bedrooms),
    roomCapacity: buildPreferenceChart(source.roomCapacity, PREFERENCE_CATEGORY_DEFAULTS.roomCapacity, formatRoomCapacityLabel, responseCounts.roomCapacity),
    priceRanges: buildPreferenceChart(priceRangeRows, priceRangeDefaults, undefined, responseCounts.priceRanges),
  };
}

export function preferenceInsight(data = [], noun = "preference") {
  const leading = (Array.isArray(data) ? data : []).find((item) => numericPreferenceValue(item?.value) > 0);
  if (!leading) return "No tenant preferences recorded yet.";
  return `${leading.label} is the most selected ${noun} (${leading.value} tenant${leading.value === 1 ? "" : "s"}).`;
}
