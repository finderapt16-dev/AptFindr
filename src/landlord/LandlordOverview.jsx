
import "./LandlordOverview.css";

import {
  Eye, Heart, Star, MapPin, Plus, CalendarDays, ChevronDown,
  TrendingUp, TrendingDown, Minus, Info, MoreHorizontal,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useState } from "react";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { QuietStreetIllustration } from "@/landlord/MyProperties";

// ============================================
// DATE AND ACTIVITY HELPERS
// ============================================

// Calendar-day periods include today.
const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date, amount) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const getActivityDate = (row) => {
  const raw =
    row?.viewed_at ??
    row?.viewedAt ??
    row?.created_at ??
    row?.createdAt ??
    row?.date ??
    row?.timestamp;

  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getApartmentId = (row) =>
  row?.apartment_id ?? row?.apartmentId;

const belongsTo = (row, id) =>
  String(getApartmentId(row)) === String(id);

const inPeriod = (date, start, end) => {
  if (!date) return false;

  return (
    date >= startOfDay(start) &&
    date < addDays(startOfDay(end), 1)
  );
};

const filterActivity = (rows, apartmentId, start, end) =>
  rows.filter(
    (row) =>
      belongsTo(row, apartmentId) &&
      inPeriod(getActivityDate(row), start, end)
  );

const getViewWeight = (row) => {
  const value = Number(row?.view_count ?? 1);

  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
};

const getRatingValue = (row) => {
  const raw =
    row?.rating ??
    row?.score ??
    row?.stars ??
    row?.value;

  if (raw == null || raw === "") return null;

  const value = Number(raw);

  return Number.isFinite(value) &&
    value >= 1 &&
    value <= 5
    ? value
    : null;
};

const sumViews = (rows) =>
  rows.reduce(
    (sum, row) => sum + getViewWeight(row),
    0
  );

const ratingValues = (rows) =>
  rows
    .map(getRatingValue)
    .filter((value) => value !== null);

const average = (values) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) /
      values.length
    : null;

// ============================================
// PERCENTAGE CHANGE
// ============================================

const percentageChange = (current, previous) =>
  previous > 0
    ? ((current - previous) / previous) * 100
    : null;

// ============================================
// CURRENT AND PREVIOUS PERIODS
// ============================================

const getPeriods = (days, now = new Date()) => {
  const today = startOfDay(now);

  const currentStart = addDays(
    today,
    -(days - 1)
  );

  const previousEnd = addDays(
    currentStart,
    -1
  );

  const previousStart = addDays(
    currentStart,
    -days
  );

  return {
    today,
    currentStart,
    previousStart,
    previousEnd,
  };
};

// ============================================
// DAILY CHART DATA
// ONLY THE CURRENT SELECTED PERIOD
// ============================================

const dailyCounts = (
  rows,
  days,
  today,
  valueOfRow
) =>
  Array.from({ length: days }, (_, index) => {
    const day = addDays(
      today,
      index - (days - 1)
    );

    return rows.reduce(
      (sum, row) =>
        inPeriod(getActivityDate(row), day, day)
          ? sum + valueOfRow(row)
          : sum,
      0
    );
  });

const dailyRatings = (rows, days, today) =>
  Array.from({ length: days }, (_, index) => {
    const day = addDays(
      today,
      index - (days - 1)
    );

    return average(
      ratingValues(
        rows.filter((row) =>
          inPeriod(getActivityDate(row), day, day)
        )
      )
    );
  });

// ============================================
// CHART DATE LABELS
// ============================================

const chartLabels = (days, today) => {
  const count = days === 7 ? 7 : 6;

  return Array.from(
    { length: count },
    (_, index) => {
      const offset =
        days === 7
          ? 6 - index
          : Math.round(29 - (index * 29) / 5);

      const date = addDays(today, -offset);

      return date.toLocaleDateString(
        "en-US",
        days === 7
          ? { weekday: "short" }
          : { month: "short", day: "numeric" }
      );
    }
  );
};

// ============================================
// GRAPH POINTS
// NULL RATINGS ARE NOT TREATED AS ZERO
// ============================================

const chartSegments = (
  values,
  width = 314,
  height = 72
) => {
  const present = values.filter(
    (value) =>
      value !== null &&
      Number.isFinite(value)
  );

  if (!present.length) return [];

  const high = Math.max(1, ...present);
  const low = Math.min(0, ...present);
  const range = high - low || 1;

  const segments = [];
  let segment = [];

  values.forEach((value, index) => {
    if (
      value === null ||
      !Number.isFinite(value)
    ) {
      if (segment.length) {
        segments.push(segment);
      }

      segment = [];
      return;
    }

    const x =
      values.length === 1
        ? width / 2
        : (index * width) / (values.length - 1);

    const y =
      height -
      ((value - low) / range) * (height - 10) -
      5;

    segment.push({ x, y });
  });

  if (segment.length) {
    segments.push(segment);
  }

  return segments;
};

const ActivityChart = ({ values }) => {
  const segments = chartSegments(values);

  if (!segments.length) return null;

  return (
    <svg
      className="ld-engagement-chart"
      viewBox="0 0 314 82"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {segments.map((segment, index) =>
        segment.length > 1 ? (
          <polyline
            key={index}
            fill="none"
            points={segment
              .map(
                ({ x, y }) =>
                  `${x.toFixed(1)},${y.toFixed(1)}`
              )
              .join(" ")}
          />
        ) : (
          <circle
            key={index}
            cx={segment[0].x}
            cy={segment[0].y}
            r={2.5}
            fill="currentColor"
          />
        )
      )}
    </svg>
  );
};

// ============================================
// VIEWS AND FAVORITES PERCENTAGE
// ============================================

const formatCountTrend = (current, previous) => {
  if (previous === 0 && current > 0) {
    return {
      status: "new",
      text: "New activity",
    };
  }

  if (previous === 0) {
    return {
      status: "none",
      text: "No activity",
    };
  }

  const change = percentageChange(
    current,
    previous
  );

  const status =
    change > 0
      ? "up"
      : change < 0
        ? "down"
        : "stable";

  const sign = change > 0 ? "+" : "";

  return {
    status,
    text: `${sign}${change.toFixed(1)}%`,
  };
};

// ============================================
// AVERAGE RATING COMPARISON
// INDIVIDUAL RATINGS ARE EQUALLY WEIGHTED
// ============================================

const formatRatingTrend = (
  currentRatings,
  previousRatings
) => {
  if (
    !currentRatings.length &&
    !previousRatings.length
  ) {
    return {
      status: "none",
      text: "No ratings",
    };
  }

  if (
    currentRatings.length &&
    !previousRatings.length
  ) {
    return {
      status: "new",
      text: "New ratings",
    };
  }

  if (!currentRatings.length) {
    return {
      status: "none",
      text: "No ratings this period",
    };
  }

  const difference =
    average(currentRatings) -
    average(previousRatings);

  const status =
    difference > 0
      ? "up"
      : difference < 0
        ? "down"
        : "stable";

  return {
    status,
    text: `${
      difference > 0 ? "+" : ""
    }${difference.toFixed(1)} stars`,
  };
};

// ============================================
// INDIVIDUAL APARTMENT ENGAGEMENT
// ============================================

const PropertyEngagement = ({
  apartment,
  selectedPeriod,
  onPeriodChange,
  viewRows = [],
  favoriteRows = [],
  ratingRows = [],
  isLoadingActivityData = false,
}) => {
  const {
    today,
    currentStart,
    previousStart,
    previousEnd,
  } = getPeriods(selectedPeriod);

  const id = apartment.id;

  // Current selected period

  const currentViewsRows = filterActivity(
    viewRows,
    id,
    currentStart,
    today
  );

  const currentFavoritesRows = filterActivity(
    favoriteRows,
    id,
    currentStart,
    today
  );

  const currentRatingRows = filterActivity(
    ratingRows,
    id,
    currentStart,
    today
  );

  // Previous equivalent period

  const previousViewsRows = filterActivity(
    viewRows,
    id,
    previousStart,
    previousEnd
  );

  const previousFavoritesRows = filterActivity(
    favoriteRows,
    id,
    previousStart,
    previousEnd
  );

  const previousRatingRows = filterActivity(
    ratingRows,
    id,
    previousStart,
    previousEnd
  );

  // ==========================================
  // PERIOD TOTALS
  // ==========================================

  const views = sumViews(currentViewsRows);
  const previousViews = sumViews(previousViewsRows);

  const favorites = currentFavoritesRows.length;
  const previousFavorites =
    previousFavoritesRows.length;

  const currentRatings = ratingValues(
    currentRatingRows
  );

  const previousRatings = ratingValues(
    previousRatingRows
  );

  const currentRatingAverage = average(
    currentRatings
  );

  const previousRatingAverage = average(
    previousRatings
  );

  // ==========================================
  // METRIC CARDS
  // ==========================================

  const metrics = [
    {
      label: "Views",
      Icon: Eye,
      value: views,
      previous: previousViews,
      unit: "views",
      trend: formatCountTrend(
        views,
        previousViews
      ),
      values: dailyCounts(
        currentViewsRows,
        selectedPeriod,
        today,
        getViewWeight
      ),
      empty: views === 0,
      emptyTitle: "No views yet",
      emptyDescription:
        "No apartment views recorded in the selected period.",
    },
    {
      label: "Favorites",
      Icon: Heart,
      value: favorites,
      previous: previousFavorites,
      unit: "favorites",
      trend: formatCountTrend(
        favorites,
        previousFavorites
      ),
      values: dailyCounts(
        currentFavoritesRows,
        selectedPeriod,
        today,
        () => 1
      ),
      empty: favorites === 0,
      emptyTitle: "No favorites yet",
      emptyDescription:
        "No favorites recorded in the selected period.",
    },
    {
      label: "Average Rating",
      Icon: Star,
      value:
        currentRatingAverage === null
          ? "0"
          : currentRatingAverage.toFixed(1),
      previous: previousRatingAverage,
      rating: true,
      trend: formatRatingTrend(
        currentRatings,
        previousRatings
      ),
      values: dailyRatings(
        currentRatingRows,
        selectedPeriod,
        today
      ),
      empty: currentRatings.length === 0,
      emptyTitle: "No ratings yet",
      emptyDescription:
        "No ratings recorded in the selected period.",
    },
  ];

  const labels = chartLabels(
    selectedPeriod,
    today
  );

  return (
    <section className="ld-engagement-card">
      <div className="ld-engagement-header">
        <div>
          <h2>
            {apartment.title || "Untitled apartment"} —
            Apartment Engagement
          </h2>

          <p>
            See how tenants are engaging with this apartment.
          </p>
        </div>

        <div className="ld-engagement-period-selector">
          <CalendarDays
            size={13}
            aria-hidden="true"
          />

          <select
            className="ld-engagement-period-dropdown"
            value={selectedPeriod}
            onChange={(event) =>
              onPeriodChange(
                id,
                Number(event.target.value)
              )
            }
            aria-label={`Select engagement period for ${
              apartment.title || "apartment"
            }`}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>

          <ChevronDown
            size={13}
            aria-hidden="true"
          />
        </div>
      </div>

      {isLoadingActivityData ? (
        <div className="ld-empty">
          Loading engagement data...
        </div>
      ) : (
        <div className="ld-engagement-grid">
          {metrics.map((metric) => {
            const {
              label,
              Icon,
              value,
              previous,
              trend,
              values,
              empty,
              rating,
            } = metric;

            const TrendIcon =
              trend.status === "up" ||
              trend.status === "new"
                ? TrendingUp
                : trend.status === "down"
                  ? TrendingDown
                  : Minus;

            const colorClass =
              trend.status === "up" ||
              trend.status === "new"
                ? "is-positive"
                : trend.status === "down"
                  ? "is-negative"
                  : "is-neutral";

            const explanation = rating
              ? `Previous ${selectedPeriod} days: ${
                  previous === null
                    ? "No ratings"
                    : `${previous.toFixed(1)} stars`
                }. ${
                  currentRatings.length
                } rating(s) this period.`
              : `Previous ${selectedPeriod} days: ${
                  previous.toLocaleString("en-PH")
                } ${metric.unit}. ${
                  value - previous >= 0 ? "+" : ""
                }${(value - previous).toLocaleString(
                  "en-PH"
                )} ${metric.unit} difference.`;

            return (
              <article
                className="ld-engagement-metric"
                key={label}
              >
                <div className="ld-engagement-metric-top">
                  <span className="ld-engagement-icon">
                    <Icon
                      size={18}
                      strokeWidth={2}
                    />
                  </span>

                  <strong>{value}</strong>

                  <span className="ld-engagement-metric-label">
                    {label}
                  </span>
                </div>

                {/* PERCENTAGE OR RATING CHANGE */}

                <div
                  className={`ld-engagement-change ${colorClass}`}
                >
                  <TrendIcon size={13} />

                  <span>{trend.text}</span>

                  <small>
                    vs previous {selectedPeriod} days
                  </small>
                </div>

                {/* ACTUAL DIFFERENCE */}

                <p className="ld-engagement-comparison-detail">
                  {explanation}
                </p>

                {/* CURRENT PERIOD DAILY CHART */}

                {empty ? (
                  <div className="ld-no-activity-chart">
                    <strong>
                      {metric.emptyTitle}
                    </strong>

                    <span>
                      {metric.emptyDescription}
                    </span>
                  </div>
                ) : (
                  <ActivityChart values={values} />
                )}

                <div className="ld-trend-axis">
                  {labels.map((day, index) => (
                    <span key={index}>{day}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ============================================
// MAIN LANDLORD DASHBOARD
// ============================================

export const LandlordOverview = ({
  myApartments = [],
  isLoadingApartments,
  aptViews,
  aptFavs,
  ratingSummary,
  viewRows = [],
  favoriteRows = [],
  ratingRows = [],
  isLoadingActivityData = false,
  handleTogglePublication,
  deletingApartmentId,
  handleDeleteApartment,
  openViewers,
  openFavoriters,
}) => {
  const [
    openPropertyMenuId,
    setOpenPropertyMenuId,
  ] = useState(null);

  // Separate selected period for every apartment

  const [
    periodByApartment,
    setPeriodByApartment,
  ] = useState({});

  const setApartmentPeriod = (
    apartmentId,
    days
  ) => {
    if (![7, 30].includes(days)) return;

    setPeriodByApartment((previous) => ({
      ...previous,
      [String(apartmentId)]: days,
    }));
  };

  return (
    <div className="ld-simple-dashboard">
      <header className="ld-simple-heading">
        <div>
          <h1>Landlord Dashboard</h1>
          <p>
            Monitor your apartment and tenant engagement.
          </p>
        </div>
      </header>

      <section className="ld-properties-card">
        <div className="ld-properties-header">
          <div>
            <h2>Your Apartments</h2>
            <p>
              Manage your apartments, units, and availability.
            </p>
          </div>
        </div>

        {isLoadingApartments ? (
          <div className="ld-empty">
            Loading apartments...
          </div>
        ) : myApartments.length === 0 ? (
          <div className="ld-empty-properties">
            <QuietStreetIllustration />

            <h3>Add your first apartment</h3>

            <p>
              Create an apartment listing to start
              managing your availability in aptfindr.
            </p>

            <Link
              to="/add-apartment"
              className="ld-empty-properties-add-button"
            >
              <span
                className="ld-add-property-icon"
                aria-hidden="true"
              >
                <Plus
                  size={18}
                  strokeWidth={2.5}
                />
              </span>

              <span>Add Apartment</span>
            </Link>

            <div className="ld-empty-properties-review">
              <Info size={19} />
              Apartment listings are reviewed
              before publication.
            </div>
          </div>
        ) : (
          <div className="ld-property-list">
            {myApartments.map((apartment) => {
              // =====================================
              // ROOM RENTAL PRICE RANGE
              // =====================================

              const roomPrices = (
                apartment.rooms || []
              )
                .map((room) =>
                  Number(
                    room.price ??
                    room.monthlyRent ??
                    room.rent ??
                    0
                  )
                )
                .filter(
                  (value) =>
                    Number.isFinite(value) &&
                    value > 0
                );

              const savedPriceRange =
                apartment.features &&
                !Array.isArray(apartment.features)
                  ? apartment.features.priceRange
                  : null;

              const savedMin =
                savedPriceRange?.min == null
                  ? NaN
                  : Number(savedPriceRange.min);

              const savedMax =
                savedPriceRange?.max == null
                  ? NaN
                  : Number(savedPriceRange.max);

              const hasSavedRange =
                Number.isFinite(savedMin) &&
                savedMin >= 0 &&
                Number.isFinite(savedMax) &&
                savedMax >= savedMin;

              const minimumRent = roomPrices.length
                ? Math.min(...roomPrices)
                : hasSavedRange
                  ? savedMin
                  : Number(apartment.price || 0);

              const maximumRent = roomPrices.length
                ? Math.max(...roomPrices)
                : hasSavedRange
                  ? savedMax
                  : Number(apartment.price || 0);

              const priceRangeLabel =
                minimumRent > 0 &&
                maximumRent > 0
                  ? minimumRent === maximumRent
                    ? `₱${minimumRent.toLocaleString(
                        "en-PH"
                      )} / month`
                    : `₱${minimumRent.toLocaleString(
                        "en-PH"
                      )} – ₱${maximumRent.toLocaleString(
                        "en-PH"
                      )} / month`
                  : "Rent not set";

              // =====================================
              // ALL-TIME APARTMENT STATISTICS
              // =====================================

              const views = Number(
                aptViews?.(apartment.id) || 0
              );

              const favorites = Number(
                aptFavs?.(apartment.id) || 0
              );

              const rating =
                ratingSummary?.byApartment?.get(
                  apartment.id
                );

              const selectedPeriod =
                periodByApartment[
                  String(apartment.id)
                ] ?? 7;

              return (
                <div
                  className="ld-property-with-engagement"
                  key={apartment.id}
                >
                  {/* APARTMENT SUMMARY */}

                  <article className="ld-property-row">
                    <div className="ld-property-image">
                      {apartment.image ? (
                        <img
                          src={apartment.image}
                          alt={
                            apartment.title ||
                            "Apartment"
                          }
                        />
                      ) : (
                        <span>
                          Apartment Photo
                        </span>
                      )}
                    </div>

                    <div className="ld-property-info">
                      <div className="ld-property-title-row">
                        <h3>
                          {apartment.title ||
                            "Untitled apartment"}
                        </h3>

                        <span
                          className={
                            apartment.isPublished === false
                              ? "ld-status draft"
                              : "ld-status"
                          }
                        >
                          {apartment.isPublished === false
                            ? "Unpublished"
                            : "Published"}
                        </span>
                      </div>

                      <p>
                        <MapPin size={12} />

                        <span>
                          {formatApartmentLocation(
                            apartment,
                            "Address unavailable"
                          )}
                        </span>
                      </p>

                      <div className="ld-property-price">
                        {priceRangeLabel}
                      </div>
                    </div>

                    {/* PROPERTY STATS */}

                    <div className="ld-property-stats">
                      <button
                        type="button"
                        onClick={() =>
                          openViewers?.(
                            apartment.id,
                            apartment.title,
                            views
                          )
                        }
                      >
                        <Eye size={14} />
                        <b>{views}</b>
                        <span>Views</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openFavoriters?.(
                            apartment.id,
                            apartment.title,
                            favorites
                          )
                        }
                      >
                        <Heart size={14} />
                        <b>{favorites}</b>
                        <span>Favorites</span>
                      </button>

                      <div>
                        <Star size={14} />

                        <b>
                          {rating?.count
                            ? Number(
                                rating.average
                              ).toFixed(1)
                            : "0"}
                        </b>

                        <span>
                          Average Rating
                        </span>
                      </div>
                    </div>

                    {/* PROPERTY ACTIONS */}

                    <div className="ld-property-actions">
                      <div className="ld-property-menu-wrap">
                        <button
                          type="button"
                          className="ld-property-menu-trigger"
                          aria-label={`Actions for ${
                            apartment.title ||
                            "property"
                          }`}
                          aria-expanded={
                            openPropertyMenuId ===
                            apartment.id
                          }
                          onClick={() =>
                            setOpenPropertyMenuId(
                              (current) =>
                                current === apartment.id
                                  ? null
                                  : apartment.id
                            )
                          }
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {openPropertyMenuId ===
                          apartment.id && (
                          <div
                            className="ld-property-menu"
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenPropertyMenuId(null);

                                void handleTogglePublication?.(
                                  apartment.id,
                                  apartment.isPublished === false
                                );
                              }}
                            >
                              {apartment.isPublished === false
                                ? "Publish"
                                : "Unpublish"}
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              className="danger"
                              disabled={
                                deletingApartmentId ===
                                apartment.id
                              }
                              onClick={() => {
                                setOpenPropertyMenuId(null);

                                void handleDeleteApartment?.(
                                  apartment.id
                                );
                              }}
                            >
                              {deletingApartmentId ===
                              apartment.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="ld-property-action-buttons">
                        <Link
                          to={`/apartment/${apartment.id}`}
                          state={{
                            returnTo:
                              "/landlord/dashboard?section=overview",
                            backLabel:
                              "Back to My Apartments",
                          }}
                          className="ld-view-property-action"
                        >
                          View Apartment
                        </Link>

                        <Link
                          to={`/landlord/properties/${apartment.id}/rooms`}
                          className="ld-primary-action"
                        >
                          Manage Units
                        </Link>
                      </div>
                    </div>
                  </article>

                  {/* APARTMENT ENGAGEMENT */}

                  <PropertyEngagement
                    apartment={apartment}
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={setApartmentPeriod}
                    viewRows={viewRows}
                    favoriteRows={favoriteRows}
                    ratingRows={ratingRows}
                    isLoadingActivityData={
                      isLoadingActivityData
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
