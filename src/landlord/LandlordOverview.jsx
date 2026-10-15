
import "./LandlordOverview.css";

import {
  Eye,
  Heart,
  Star,
  MapPin,
  Plus,
  CalendarDays,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  MoreHorizontal,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useState } from "react";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { QuietStreetIllustration } from "@/landlord/MyProperties";

// =====================================================
// ACTIVITY HELPERS
// =====================================================

const getApartmentId = (row) =>
  row?.apartment_id ?? row?.apartmentId;

const matchesApartment = (row, apartmentId) =>
  String(getApartmentId(row)) === String(apartmentId);

const getDate = (row) => {
  const value =
    row?.created_at ??
    row?.createdAt ??
    row?.viewed_at ??
    row?.viewedAt ??
    row?.date ??
    row?.timestamp;

  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getViewWeight = (row) => {
  const value = Number(row?.view_count ?? 1);

  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
};

const getRatingValue = (row) => {
  const value =
    row?.rating ??
    row?.score ??
    row?.stars ??
    row?.value;

  if (value == null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const startOfDay = (date) => {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
};

const addDays = (date, days) => {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
};

const average = (values) =>
  values.length
    ? values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length
    : 0;

const getPercentageChange = (current, previous) => {
  if (previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
};

const isBetween = (date, start, end) => {
  if (!date) return false;

  const value = startOfDay(date).getTime();

  return (
    value >= startOfDay(start).getTime() &&
    value <= startOfDay(end).getTime()
  );
};

const getRowsInPeriod = (
  rows,
  apartmentId,
  start,
  end
) =>
  rows.filter(
    (row) =>
      matchesApartment(row, apartmentId) &&
      isBetween(getDate(row), start, end)
  );

const getViews = (rows) =>
  rows.reduce(
    (total, row) => total + getViewWeight(row),
    0
  );

const getRatings = (rows) =>
  rows
    .map(getRatingValue)
    .filter((value) => value !== null);

// =====================================================
// DAILY GRAPH CALCULATIONS
// =====================================================

const getDailyValues = (
  apartmentId,
  rows,
  valueGetter,
  selectedPeriod,
  today
) => {
  const values = [];

  for (
    let offset = selectedPeriod - 1;
    offset >= 0;
    offset--
  ) {
    const day = addDays(today, -offset);

    const dailyRows = rows.filter((row) => {
      const date = getDate(row);

      return (
        matchesApartment(row, apartmentId) &&
        date &&
        startOfDay(date).getTime() === day.getTime()
      );
    });

    const value = dailyRows.reduce(
      (sum, row) => sum + valueGetter(row),
      0
    );

    values.push(value);
  }

  return values;
};

const getRatingDailyValues = (
  apartmentId,
  ratingRows,
  selectedPeriod,
  today
) => {
  const values = [];

  for (
    let offset = selectedPeriod - 1;
    offset >= 0;
    offset--
  ) {
    const day = addDays(today, -offset);

    const dailyRatings = ratingRows
      .filter((row) => {
        const date = getDate(row);

        return (
          matchesApartment(row, apartmentId) &&
          date &&
          startOfDay(date).getTime() === day.getTime()
        );
      })
      .map(getRatingValue)
      .filter((value) => value !== null);

    values.push(average(dailyRatings));
  }

  return values;
};

// =====================================================
// DYNAMIC GRAPH DATE LABELS
// =====================================================

const getChartLabels = (selectedPeriod, today) => {
  const count = selectedPeriod === 7 ? 7 : 6;

  return Array.from(
    { length: count },
    (_, index) => {
      const offset =
        selectedPeriod === 7
          ? 6 - index
          : Math.round(
              29 - (index * 29) / 5
            );

      const date = addDays(today, -offset);

      return selectedPeriod === 7
        ? date.toLocaleDateString("en-US", {
            weekday: "short",
          })
        : date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
    }
  );
};

// =====================================================
// SVG GRAPH
// =====================================================

const makeChartPoints = (
  values,
  width = 314,
  height = 72
) => {
  if (!values.length) return "";

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);

  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : (index / (values.length - 1)) * width;

      const y =
        height -
        ((value - min) / range) * (height - 10) -
        5;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

// =====================================================
// INDIVIDUAL APARTMENT ENGAGEMENT COMPONENT
// =====================================================

const PropertyEngagement = ({
  apartment,
  selectedPeriod,
  onPeriodChange,
  viewRows = [],
  favoriteRows = [],
  ratingRows = [],
  isLoadingActivityData = false,
}) => {
  const apartmentId = apartment.id;

  const today = startOfDay(new Date());

  // Each apartment calculates its own dates.
  const currentPeriodStart = addDays(
    today,
    -(selectedPeriod - 1)
  );

  const previousPeriodStart = addDays(
    today,
    -(selectedPeriod * 2 - 1)
  );

  const previousPeriodEnd = addDays(
    today,
    -selectedPeriod
  );

  // ===================================================
  // CURRENT PERIOD
  // ===================================================

  const currentViewRows = getRowsInPeriod(
    viewRows,
    apartmentId,
    currentPeriodStart,
    today
  );

  const currentFavoriteRows = getRowsInPeriod(
    favoriteRows,
    apartmentId,
    currentPeriodStart,
    today
  );

  const currentRatingRows = getRowsInPeriod(
    ratingRows,
    apartmentId,
    currentPeriodStart,
    today
  );

  // ===================================================
  // PREVIOUS PERIOD
  // ===================================================

  const previousViewRows = getRowsInPeriod(
    viewRows,
    apartmentId,
    previousPeriodStart,
    previousPeriodEnd
  );

  const previousFavoriteRows = getRowsInPeriod(
    favoriteRows,
    apartmentId,
    previousPeriodStart,
    previousPeriodEnd
  );

  const previousRatingRows = getRowsInPeriod(
    ratingRows,
    apartmentId,
    previousPeriodStart,
    previousPeriodEnd
  );

  // ===================================================
  // ACTUAL TOTALS
  // ===================================================

  const views = getViews(currentViewRows);

  const favorites = currentFavoriteRows.length;

  const currentRatings = getRatings(
    currentRatingRows
  );

  const rating = average(currentRatings);

  const previousViews = getViews(
    previousViewRows
  );

  const previousFavorites =
    previousFavoriteRows.length;

  const previousRatings = getRatings(
    previousRatingRows
  );

  const previousRatingAverage = average(
    previousRatings
  );

  // ===================================================
  // PERCENTAGE COMPARISONS
  // ===================================================

  const viewsChange = getPercentageChange(
    views,
    previousViews
  );

  const favoritesChange = getPercentageChange(
    favorites,
    previousFavorites
  );

  const ratingChange =
    currentRatings.length > 0 &&
    previousRatings.length > 0
      ? rating - previousRatingAverage
      : null;

  // ===================================================
  // DAILY GRAPH DATA
  // ===================================================

  const viewChart = getDailyValues(
    apartmentId,
    viewRows,
    getViewWeight,
    selectedPeriod,
    today
  );

  const favoriteChart = getDailyValues(
    apartmentId,
    favoriteRows,
    () => 1,
    selectedPeriod,
    today
  );

  const ratingChart = getRatingDailyValues(
    apartmentId,
    ratingRows,
    selectedPeriod,
    today
  );

  const chartLabels = getChartLabels(
    selectedPeriod,
    today
  );

  // ===================================================
  // METRIC CARDS
  // ===================================================

  const metrics = [
    {
      label: "Views",
      value: views,
      icon: Eye,
      values: viewChart,
      change: viewsChange,
      changeType: "percent",
      current: views,
      previous: previousViews,
      empty: views === 0,
      emptyState: {
        title: "No views yet",
        description:
          "No recorded apartment views during this period.",
      },
    },
    {
      label: "Favorites",
      value: favorites,
      icon: Heart,
      values: favoriteChart,
      change: favoritesChange,
      changeType: "percent",
      current: favorites,
      previous: previousFavorites,
      empty: favorites === 0,
      emptyState: {
        title: "No favorites yet",
        description:
          "No apartments were saved to favorites during this period.",
      },
    },
    {
      label: "Average Rating",
      value: currentRatings.length
        ? rating.toFixed(1)
        : "0",
      icon: Star,
      values: ratingChart,
      change: ratingChange,
      changeType: "rating",
      current: currentRatings.length,
      previous: previousRatings.length,
      empty: currentRatings.length === 0,
      emptyState: {
        title: "No ratings yet",
        description:
          "No apartment ratings were recorded during this period.",
      },
    },
  ];

  // ===================================================
  // ENGAGEMENT UI
  // ===================================================

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

        {/* INDIVIDUAL DROPDOWN */}
        <div className="ld-engagement-period-selector">
          <CalendarDays
            size={13}
            aria-hidden="true"
          />

          <select
            value={selectedPeriod}
            onChange={(event) =>
              onPeriodChange(
                apartmentId,
                Number(event.target.value)
              )
            }
            aria-label={`Select engagement period for ${
              apartment.title || "apartment"
            }`}
            className="ld-engagement-period-dropdown"
          >
            <option value={7}>
              Last 7 Days
            </option>

            <option value={30}>
              Last 30 Days
            </option>
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
              value,
              icon: Icon,
              values,
              change,
              changeType,
              current,
              previous,
              empty,
              emptyState,
            } = metric;

            const points = makeChartPoints(values);

            const isPositive =
              change !== null && change > 0;

            const isNegative =
              change !== null && change < 0;

            const isNewActivity =
              previous === 0 && current > 0;

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

                <div className="ld-engagement-change">
                  {isNewActivity ? (
                    <>
                      <TrendingUp size={12} />
                      <span>New activity</span>
                    </>
                  ) : change === null ? (
                    <>
                      <Minus size={12} />

                      <span>
                        {empty
                          ? "No recorded activity"
                          : "No previous data"}
                      </span>
                    </>
                  ) : (
                    <>
                      {isPositive ? (
                        <TrendingUp size={12} />
                      ) : isNegative ? (
                        <TrendingDown size={12} />
                      ) : (
                        <Minus size={12} />
                      )}

                      <span>
                        {changeType === "rating"
                          ? `${
                              change > 0 ? "+" : ""
                            }${change.toFixed(1)}`
                          : `${
                              change > 0 ? "+" : ""
                            }${change.toFixed(0)}%`}
                      </span>
                    </>
                  )}

                  <small>
                    vs previous {selectedPeriod} days
                  </small>
                </div>

                {empty ? (
                  <div className="ld-no-activity-chart">
                    <strong>
                      {emptyState.title}
                    </strong>

                    <span>
                      {emptyState.description}
                    </span>
                  </div>
                ) : (
                  <svg
                    className="ld-engagement-chart"
                    viewBox="0 0 314 82"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <polyline points={points} />
                  </svg>
                )}

                <div className="ld-trend-axis">
                  {chartLabels.map(
                    (chartLabel, index) => (
                      <span key={index}>
                        {chartLabel}
                      </span>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

// =====================================================
// MAIN LANDLORD DASHBOARD
// =====================================================

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

  // ===================================================
  // SEPARATE DATE SELECTION PER APARTMENT
  // ===================================================

  const [
    periodByApartment,
    setPeriodByApartment,
  ] = useState({});

  const setApartmentPeriod = (apartmentId, days) => {
    if (![7, 30].includes(days)) {
      return;
    }

    setPeriodByApartment((previous) => ({
      ...previous,
      [String(apartmentId)]: days,
    }));
  };

  // ===================================================
  // MAIN UI
  // ===================================================

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

            <h3>
              Add your first apartment
            </h3>

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

              <span>
                Add Apartment
              </span>
            </Link>

            <div className="ld-empty-properties-review">
              <Info size={19} />

              Apartment listings are reviewed before
              publication.
            </div>
          </div>
        ) : (
          <div className="ld-property-list">
            {myApartments.map((apartment) => {
              // =========================================
              // APARTMENT PRICE
              // =========================================

              const roomPrices = (
                apartment.rooms || []
              )
                .map((room) =>
                  Number(
                    room.price ||
                      room.monthlyRent ||
                      room.rent
                  )
                )
                .filter(
                  (price) =>
                    Number.isFinite(price) &&
                    price > 0
                );

              const savedPriceRange =
                apartment.features &&
                !Array.isArray(
                  apartment.features
                )
                  ? apartment.features.priceRange
                  : null;

              const savedMinimumRent =
                savedPriceRange?.min == null
                  ? NaN
                  : Number(savedPriceRange.min);

              const savedMaximumRent =
                savedPriceRange?.max == null
                  ? NaN
                  : Number(savedPriceRange.max);

              const hasSavedPriceRange =
                Number.isFinite(
                  savedMinimumRent
                ) &&
                savedMinimumRent >= 0 &&
                Number.isFinite(
                  savedMaximumRent
                ) &&
                savedMaximumRent >=
                  savedMinimumRent;

              const minimumRent =
                hasSavedPriceRange
                  ? savedMinimumRent
                  : roomPrices.length
                    ? Math.min(...roomPrices)
                    : Number(
                        apartment.price || 0
                      );

              const maximumRent =
                hasSavedPriceRange
                  ? savedMaximumRent
                  : roomPrices.length
                    ? Math.max(...roomPrices)
                    : Number(
                        apartment.price || 0
                      );

              const priceRangeLabel =
                minimumRent > 0 &&
                maximumRent > 0
                  ? `₱${minimumRent.toLocaleString(
                      "en-PH"
                    )} – ₱${maximumRent.toLocaleString(
                      "en-PH"
                    )} / month`
                  : "Rent not set";

              // =========================================
              // ALL-TIME PROPERTY SUMMARY
              // =========================================

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

              // Individual engagement period.
              const selectedPeriod =
                periodByApartment[
                  String(apartment.id)
                ] ?? 7;

              return (
                <div
                  className="ld-property-with-engagement"
                  key={apartment.id}
                >
                  {/* APARTMENT SUMMARY CARD */}

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
                          <MoreHorizontal
                            size={16}
                          />
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

                                void handleTogglePublication(
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

                                void handleDeleteApartment(
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

                  {/* INDIVIDUAL ENGAGEMENT ANALYTICS */}

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
