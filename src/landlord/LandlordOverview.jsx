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

export const LandlordOverview = ({
  myApartments,
  isLoadingApartments,
  aptViews,
  aptFavs,
  ratingSummary,

  // NEW: real activity data
  viewRows = [],
  favoriteRows = [],
  ratingRows = [],
  isLoadingActivityData = false,

  handleTogglePublication,
  deletingApartmentId,
  handleDeleteApartment,
}) => {
  const [openPropertyMenuId, setOpenPropertyMenuId] = useState(null);

  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  const getApartmentId = (row) =>
    row?.apartment_id ?? row?.apartmentId;

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

  const getViewWeight = (row) =>
    Math.max(0, Number(row?.view_count ?? 1) || 0);

  const getRatingValue = (row) => {
    const value =
      row?.rating ??
      row?.score ??
      row?.stars ??
      row?.value;

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  };

  /*
   * ============================================================
   * DATE HELPERS
   * ============================================================
   */

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

  const today = startOfDay(new Date());

  /*
   * Current period:
   * last 7 days including today.
   *
   * Previous period:
   * 7 days immediately before that.
   */
  const currentPeriodStart = addDays(today, -6);
  const previousPeriodStart = addDays(today, -13);
  const previousPeriodEnd = addDays(today, -7);

  const isBetween = (date, start, end) => {
    if (!date) return false;

    const value = startOfDay(date).getTime();

    return (
      value >= startOfDay(start).getTime() &&
      value <= startOfDay(end).getTime()
    );
  };

  /*
   * ============================================================
   * ACTIVITY HELPERS
   * ============================================================
   */

  const getViewsForApartment = (apartmentId) => {
    return viewRows
      .filter((row) => getApartmentId(row) === apartmentId)
      .reduce((total, row) => total + getViewWeight(row), 0);
  };

  const getFavoritesForApartment = (apartmentId) => {
    return favoriteRows.filter(
      (row) => getApartmentId(row) === apartmentId
    ).length;
  };

  const getRatingsForApartment = (apartmentId) => {
    return ratingRows.filter(
      (row) => getApartmentId(row) === apartmentId
    );
  };

  const getAverageRatingForApartment = (apartmentId) => {
    const ratings = getRatingsForApartment(apartmentId)
      .map(getRatingValue)
      .filter((value) => value !== null);

    if (!ratings.length) return 0;

    return (
      ratings.reduce((sum, value) => sum + value, 0) /
      ratings.length
    );
  };

  /*
   * ============================================================
   * PERIOD TOTALS
   * ============================================================
   */

  const getCurrentViews = (apartmentId) => {
    return viewRows
      .filter((row) => {
        const rowApartmentId = getApartmentId(row);
        const date = getDate(row);

        return (
          rowApartmentId === apartmentId &&
          isBetween(date, currentPeriodStart, today)
        );
      })
      .reduce((total, row) => total + getViewWeight(row), 0);
  };

  const getPreviousViews = (apartmentId) => {
    return viewRows
      .filter((row) => {
        const rowApartmentId = getApartmentId(row);
        const date = getDate(row);

        return (
          rowApartmentId === apartmentId &&
          isBetween(date, previousPeriodStart, previousPeriodEnd)
        );
      })
      .reduce((total, row) => total + getViewWeight(row), 0);
  };

  const getCurrentFavorites = (apartmentId) => {
    return favoriteRows.filter((row) => {
      const rowApartmentId = getApartmentId(row);
      const date = getDate(row);

      return (
        rowApartmentId === apartmentId &&
        isBetween(date, currentPeriodStart, today)
      );
    }).length;
  };

  const getPreviousFavorites = (apartmentId) => {
    return favoriteRows.filter((row) => {
      const rowApartmentId = getApartmentId(row);
      const date = getDate(row);

      return (
        rowApartmentId === apartmentId &&
        isBetween(date, previousPeriodStart, previousPeriodEnd)
      );
    }).length;
  };

  const getCurrentRatings = (apartmentId) => {
    return ratingRows
      .filter((row) => {
        const rowApartmentId = getApartmentId(row);
        const date = getDate(row);

        return (
          rowApartmentId === apartmentId &&
          isBetween(date, currentPeriodStart, today)
        );
      })
      .map(getRatingValue)
      .filter((value) => value !== null);
  };

  const getPreviousRatings = (apartmentId) => {
    return ratingRows
      .filter((row) => {
        const rowApartmentId = getApartmentId(row);
        const date = getDate(row);

        return (
          rowApartmentId === apartmentId &&
          isBetween(date, previousPeriodStart, previousPeriodEnd)
        );
      })
      .map(getRatingValue)
      .filter((value) => value !== null);
  };

  /*
   * ============================================================
   * PERCENTAGE CHANGE
   * ============================================================
   */

  const getPercentageChange = (current, previous) => {
    if (previous === 0 && current === 0) {
      return null;
    }

    if (previous === 0 && current > 0) {
      return 100;
    }

    return ((current - previous) / previous) * 100;
  };

  /*
   * ============================================================
   * CHART DATA
   * ============================================================
   */

  const getDailyValues = (
    apartmentId,
    rows,
    valueGetter,
    fallbackToOne = false
  ) => {
    const values = [];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
      const day = addDays(today, -dayOffset);

      const dayRows = rows.filter((row) => {
        const rowApartmentId = getApartmentId(row);
        const date = getDate(row);

        return (
          rowApartmentId === apartmentId &&
          date &&
          startOfDay(date).getTime() ===
            startOfDay(day).getTime()
        );
      });

      const value = dayRows.reduce(
        (sum, row) => sum + valueGetter(row),
        0
      );

      values.push(fallbackToOne && value === 0 ? 0 : value);
    }

    return values;
  };

  const getRatingDailyValues = (apartmentId) => {
    const values = [];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset -= 1) {
      const day = addDays(today, -dayOffset);

      const dayRatings = ratingRows
        .filter((row) => {
          const rowApartmentId = getApartmentId(row);
          const date = getDate(row);

          return (
            rowApartmentId === apartmentId &&
            date &&
            startOfDay(date).getTime() ===
              startOfDay(day).getTime()
          );
        })
        .map(getRatingValue)
        .filter((value) => value !== null);

      const value = dayRatings.length
        ? dayRatings.reduce((sum, rating) => sum + rating, 0) /
          dayRatings.length
        : 0;

      values.push(value);
    }

    return values;
  };

  /*
   * Convert seven values into SVG polyline points.
   */
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

  /*
   * ============================================================
   * PROPERTY ENGAGEMENT CARD
   * ============================================================
   */

  const PropertyEngagement = ({ apartment }) => {
    const apartmentId = apartment.id;

    const views = getViewsForApartment(apartmentId);
    const favorites = getFavoritesForApartment(apartmentId);
    const rating = getAverageRatingForApartment(apartmentId);

    const currentViews = getCurrentViews(apartmentId);
    const previousViews = getPreviousViews(apartmentId);

    const currentFavorites =
      getCurrentFavorites(apartmentId);

    const previousFavorites =
      getPreviousFavorites(apartmentId);

    const currentRatings =
      getCurrentRatings(apartmentId);

    const previousRatings =
      getPreviousRatings(apartmentId);

    const currentRatingAverage = currentRatings.length
      ? currentRatings.reduce(
          (sum, value) => sum + value,
          0
        ) / currentRatings.length
      : 0;

    const previousRatingAverage = previousRatings.length
      ? previousRatings.reduce(
          (sum, value) => sum + value,
          0
        ) / previousRatings.length
      : 0;

    const viewsChange = getPercentageChange(
      currentViews,
      previousViews
    );

    const favoritesChange = getPercentageChange(
      currentFavorites,
      previousFavorites
    );

    /*
     * Rating isn't really a percentage metric.
     * Show the actual rating-point change instead.
     */
    const ratingChange =
      currentRatings.length && previousRatings.length
        ? currentRatingAverage - previousRatingAverage
        : null;

    const viewChart = getDailyValues(
      apartmentId,
      viewRows,
      getViewWeight
    );

    const favoriteChart = getDailyValues(
      apartmentId,
      favoriteRows,
      () => 1
    );

    const ratingChart = getRatingDailyValues(
      apartmentId
    );

    const metrics = [
      {
        label: "Views",
        value: views,
        icon: Eye,
        values: viewChart,
        change: viewsChange,
        changeType: "percent",
        empty: views === 0,
        emptyState: {
          title: "No views yet",
          description:
            "Views will appear here once tenants start viewing your property.",
        },
      },
      {
        label: "Favorites",
        value: favorites,
        icon: Heart,
        values: favoriteChart,
        change: favoritesChange,
        changeType: "percent",
        empty: favorites === 0,
        emptyState: {
          title: "No favorites yet",
          description:
            "Favorites will appear here once tenants start saving your property.",
        },
      },
      {
        label: "Average Rating",
        value: rating ? rating.toFixed(1) : "0",
        icon: Star,
        values: ratingChart,
        change: ratingChange,
        changeType: "rating",
        empty: rating === 0,
        emptyState: {
          title: "No ratings yet",
          description:
            "Ratings will appear here once tenants start reviewing your property.",
        },
      },
    ];

    return (
      <section className="ld-engagement-card">
        <div className="ld-engagement-header">
          <div>
            <h2>
              {apartment.title || "Untitled property"} — Property
              Engagement
            </h2>

            <p>
              See how tenants are engaging with this property.
            </p>
          </div>

          <span className="ld-engagement-period">
            <CalendarDays size={12} aria-hidden="true" />
            Last 7 Days
            <ChevronDown size={12} aria-hidden="true" />
          </span>
        </div>

        {isLoadingActivityData ? (
          <div className="ld-empty">
            Loading engagement data...
          </div>
        ) : (
          <div className="ld-engagement-grid">
            {metrics.map(
              ({
                label,
                value,
                icon: Icon,
                values,
                change,
                changeType,
                empty,
                emptyState,
              }) => {
                const points = makeChartPoints(values);

                const isPositive =
                  change !== null && change > 0;

                const isNegative =
                  change !== null && change < 0;

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
                      {change === null ? (
                        <>
                          <Minus size={12} />
                          <span>
                            {empty
                              ? "No change compared to last week."
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
                                  change > 0
                                    ? "+"
                                    : ""
                                }${change.toFixed(1)}`
                              : `${
                                  change > 0
                                    ? "+"
                                    : ""
                                }${change.toFixed(0)}%`}
                          </span>
                        </>
                      )}

                      <small>
                        vs previous 7 days
                      </small>
                    </div>

                    {empty ? (
                      <div className="ld-no-activity-chart">
                        <strong>{emptyState.title}</strong>
                        <span>{emptyState.description}</span>
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
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    );
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="ld-simple-dashboard">
      <header className="ld-simple-heading">
        <div>
          <h1>Landlord Dashboard</h1>
          <p>Monitor your property and tenant engagement.</p>
        </div>
      </header>

      <section className="ld-properties-card">
        <div className="ld-properties-header">
          <div>
            <h2>Your Properties</h2>
            <p>Manage your apartments, rooms, and availability.</p>
          </div>
        </div>

        {isLoadingApartments ? (
          <div className="ld-empty">
            Loading properties...
          </div>
        ) : myApartments.length === 0 ? (
          <div className="ld-empty-properties">
            <QuietStreetIllustration />

            <h3>Add your first property</h3>

            <p>
              Create an apartment listing to start managing your
              availability in aptfindr.
            </p>

            <Link
              to="/add-apartment"
              className="ld-empty-properties-add-button"
            >
              <span className="ld-add-property-icon" aria-hidden="true">
                <Plus size={18} strokeWidth={2.5} />
              </span>
              <span>Add Property</span>
            </Link>

            <div className="ld-empty-properties-review">
              <Info size={19} />
              Property listings are reviewed before publication.
            </div>
          </div>
        ) : (
          <div className="ld-property-list">
            {myApartments.map((apartment) => {
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

              // Keep this card in sync with the Price Range shown by View Property.
              const savedPriceRange =
                apartment.features && !Array.isArray(apartment.features)
                  ? apartment.features.priceRange
                  : null;
              const savedMinimumRent = Number(savedPriceRange?.min);
              const savedMaximumRent = Number(savedPriceRange?.max);
              const hasSavedPriceRange =
                Number.isFinite(savedMinimumRent) &&
                savedMinimumRent >= 0 &&
                Number.isFinite(savedMaximumRent) &&
                savedMaximumRent >= savedMinimumRent;
              const minimumRent = hasSavedPriceRange
                ? savedMinimumRent
                : roomPrices.length
                  ? Math.min(...roomPrices)
                  : Number(apartment.price || 0);
              const maximumRent = hasSavedPriceRange
                ? savedMaximumRent
                : roomPrices.length
                  ? Math.max(...roomPrices)
                  : Number(apartment.price || 0);
              const priceRangeLabel =
                minimumRent > 0 && maximumRent > 0
                  ? `₱${minimumRent.toLocaleString("en-PH")} – ₱${maximumRent.toLocaleString("en-PH")} / month`
                  : "Rent not set";

              const views = Number(
                aptViews(apartment.id) || 0
              );

              const favorites = Number(
                aptFavs(apartment.id) || 0
              );

              const rating =
                ratingSummary?.byApartment?.get(
                  apartment.id
                );

              return (
                <div className="ld-property-with-engagement" key={apartment.id}>
                <article className="ld-property-row">
                  <div className="ld-property-image">
                    {apartment.image ? (
                      <img
                        src={apartment.image}
                        alt={
                          apartment.title ||
                          "Property"
                        }
                      />
                    ) : (
                      <span>
                        Property Photo
                      </span>
                    )}
                  </div>

                  <div className="ld-property-info">
                    <div className="ld-property-title-row">
                      <h3>
                        {apartment.title ||
                          "Untitled property"}
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

                  <div className="ld-property-stats">
                    <button type="button" onClick={() => openViewers?.(apartment.id, apartment.title, views)}>
                      <Eye size={14} />
                      <b>{views}</b>
                      <span>Views</span>
                    </button>
                    <button type="button" onClick={() => openFavoriters?.(apartment.id, apartment.title, favorites)}>
                      <Heart size={14} />
                      <b>{favorites}</b>
                      <span>Favorites</span>
                    </button>
                    <div>
                      <Star size={14} />
                      <b>{rating?.count ? Number(rating.average).toFixed(1) : "0"}</b>
                      <span>Average Rating</span>
                    </div>
                  </div>

                  <div className="ld-property-actions">
                    <div className="ld-property-menu-wrap">
                      <button
                        type="button"
                        className="ld-property-menu-trigger"
                        aria-label={`Actions for ${apartment.title || "property"}`}
                        aria-expanded={openPropertyMenuId === apartment.id}
                        onClick={() => setOpenPropertyMenuId((current) => current === apartment.id ? null : apartment.id)}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openPropertyMenuId === apartment.id && (
                        <div className="ld-property-menu" role="menu">
                          <button type="button" role="menuitem" onClick={() => { setOpenPropertyMenuId(null); void handleTogglePublication(apartment.id, apartment.isPublished === false); }}>
                            {apartment.isPublished === false ? "Publish" : "Unpublish"}
                          </button>
                          <button type="button" role="menuitem" className="danger" disabled={deletingApartmentId === apartment.id} onClick={() => { setOpenPropertyMenuId(null); void handleDeleteApartment(apartment.id); }}>
                            {deletingApartmentId === apartment.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="ld-property-action-buttons">
                      <Link
                        to={`/apartment/${apartment.id}`}
                        state={{
                          returnTo: "/landlord/dashboard?section=overview",
                          backLabel: "Back to My Properties",
                        }}
                        className="ld-view-property-action"
                      >
                        View Property
                      </Link>
                      <Link
                        to={`/landlord/properties/${apartment.id}/rooms`}
                        className="ld-primary-action"
                      >
                        Manage Rooms
                      </Link>
                    </div>
                  </div>
                </article>
                <PropertyEngagement apartment={apartment}/>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};
