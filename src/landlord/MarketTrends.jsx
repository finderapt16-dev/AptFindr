
import "./MarketTrends.css";

import { CalendarDays, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MarketTrendBarChart } from "@/components/marketTrends/MarketTrendBarChart";
import { MarketTrendDonutChart } from "@/components/marketTrends/MarketTrendDonutChart";
import { PropertyPerformanceCard } from "@/components/marketTrends/PropertyPerformanceCard";

import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";

import { LandlordMenuTrigger } from "@/landlord/LandlordMenuTrigger";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";

import { fetchMarketTrendsData } from "@/services/marketTrendsService";
import { supabase } from "@/services/supabaseClient";

import { isTenantVisibleApartment } from "@/utils/listingVisibility";

import {
  buildMarketTrendEntries,
  formatTenantPreferenceAnalytics,
  getMarketPropertyIds,
  hasMarketTrendEngagement,
  preferenceInsight,
  rankMarketTrendEntries,
} from "@/utils/marketTrendsUtils";

const EMPTY_ARRAY = [];

const PERIOD_OPTIONS = [
  { value: "thisWeek", label: "This Week" },
  { value: "lastWeek", label: "Last Week" },
  { value: "last30Days", label: "Last 30 Days" },
  { value: "allTime", label: "All Time" },
];

/**
 * Market Trends
 *
 * Apartment listings:
 * All published tenant-visible apartments.
 *
 * Preference analytics:
 * Platform-wide tenant preferences.
 *
 * These must not depend on how many apartments
 * the logged-in landlord owns.
 */
export function MarketTrends() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const {
    apartments = EMPTY_ARRAY,
    isLoading,
  } = useApartmentsContext();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [period, setPeriod] = useState("thisWeek");

  const trendType = "demand";

  const [allTimeViews, setAllTimeViews] = useState([]);
  const [viewActivity, setViewActivity] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [ratings, setRatings] = useState([]);

  const [
    preferenceAnalytics,
    setPreferenceAnalytics,
  ] = useState(null);

  const [
    preferenceAnalyticsError,
    setPreferenceAnalyticsError,
  ] = useState("");

  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);

  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState("");

  const [
    marketDataRevision,
    setMarketDataRevision,
  ] = useState(0);

  /**
   * All published apartments.
   *
   * Do not filter by user.id or landlord ID.
   */
  const properties = useMemo(() => {
    return apartments.filter((apartment) =>
      isTenantVisibleApartment(apartment)
    );
  }, [apartments]);

  const propertyIds = useMemo(() => {
    return getMarketPropertyIds(properties);
  }, [properties]);

  const propertyIdsKey = useMemo(() => {
    return propertyIds.map(String).sort().join(",");
  }, [propertyIds]);

  /**
   * Fetch Market Trends.
   *
   * Preferences are requested regardless of whether
   * the current landlord owns an apartment.
   */
  useEffect(() => {
    let active = true;

    const loadMarketTrends = async () => {
      setMarketLoading(true);
      setMarketError("");

      try {
        const data = await fetchMarketTrendsData({
          apartmentIds: propertyIdsKey
            ? propertyIdsKey.split(",")
            : [],
          userId: user?.id,
          period,
        });

        if (!active) return;

        setAllTimeViews(data.allTimeViews ?? []);
        setViewActivity(data.viewActivity ?? []);
        setFavorites(data.favorites ?? []);
        setRatings(data.ratings ?? []);

        setPreferenceAnalytics(
          data.preferenceAnalytics ?? null
        );

        setPreferenceAnalyticsError(
          data.preferenceAnalyticsError ?? ""
        );

        const notifications = data.notifications ?? [];

        setUnreadNotifications(
          notifications.filter(
            (item) => !(item.read ?? item.is_read)
          ).length
        );
      } catch (error) {
        console.error(
          "[Market Trends] Failed to load:",
          error
        );

        if (!active) return;

        setAllTimeViews([]);
        setViewActivity([]);
        setFavorites([]);
        setRatings([]);

        setPreferenceAnalytics(null);

        setPreferenceAnalyticsError(
          "Unable to load tenant preference analytics."
        );

        setMarketError(
          error instanceof Error
            ? error.message
            : "Unable to load Market Trends."
        );
      } finally {
        if (active) {
          setMarketLoading(false);
        }
      }
    };

    void loadMarketTrends();

    return () => {
      active = false;
    };
  }, [
    propertyIdsKey,
    user?.id,
    period,
    marketDataRevision,
  ]);

  /**
   * Refresh apartment engagement when data changes.
   */
  useEffect(() => {
    const visiblePropertyIds = new Set(
      propertyIdsKey
        ? propertyIdsKey.split(",")
        : []
    );

    if (visiblePropertyIds.size === 0) {
      return undefined;
    }

    const refreshIfVisible = (payload) => {
      const apartmentId =
        payload.new?.apartment_id ??
        payload.old?.apartment_id;

      if (
        !apartmentId ||
        visiblePropertyIds.has(String(apartmentId))
      ) {
        setMarketDataRevision(
          (current) => current + 1
        );
      }
    };

    const channel = supabase
      .channel("landlord-market-trends-engagement")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "apartment_views",
        },
        refreshIfVisible
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorites",
        },
        refreshIfVisible
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "apartment_ratings",
        },
        refreshIfVisible
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [propertyIdsKey]);

  /**
   * Refresh preference analytics when a tenant
   * inserts a new preference record.
   *
   * This does not depend on apartment ownership.
   */
  useEffect(() => {
    const channel = supabase
      .channel("landlord-market-trends-preferences")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tenant_preferences",
        },
        () => {
          setMarketDataRevision(
            (current) => current + 1
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Build performance entries using all
   * published apartments.
   */
  const entries = useMemo(() => {
    return buildMarketTrendEntries({
      properties,
      allTimeViews,
      viewActivity,
      favorites,
      ratings,
      period,
    });
  }, [
    properties,
    allTimeViews,
    viewActivity,
    favorites,
    ratings,
    period,
  ]);

  const rankedEntries = useMemo(() => {
    return rankMarketTrendEntries(
      entries,
      trendType
    );
  }, [entries, trendType]);

  const hasSelectedEngagement = useMemo(() => {
    return hasMarketTrendEngagement(
      rankedEntries,
      trendType
    );
  }, [rankedEntries, trendType]);

  const topPerformingEntries = useMemo(() => {
    return rankedEntries.slice(0, 3);
  }, [rankedEntries]);

  /**
   * Tenant preferences use the platform-wide
   * RPC response, not landlord property records.
   */
  const preferenceCharts = useMemo(() => {
    return formatTenantPreferenceAnalytics(
      preferenceAnalytics
    );
  }, [preferenceAnalytics]);

  const preferencesAvailable =
    !preferenceAnalyticsError &&
    preferenceAnalytics !== null;

  /**
   * Only use apartment-specific verification
   * when an explicit status is available.
   */
  const isApartmentVerified = (apartment) => {
    return (
      apartment?.isVerified === true ||
      apartment?.is_verified === true ||
      apartment?.is_landlord_verified === true ||
      apartment?.landlord?.isVerified === true ||
      apartment?.landlord?.is_verified === true
    );
  };

  const handleSectionChange = (section) => {
    navigate(
      `/landlord/dashboard?section=${section}`
    );

    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout?.();
    navigate("/", { replace: true });
  };

  const renderSidebar = () => (
    <LandlordSidebar
      user={user}
      verified={
        user?.isVerified ??
        user?.is_verified
      }
      activeSection="market"
      unreadNotifications={unreadNotifications}
      onSectionChange={handleSectionChange}
      onClose={() => setSidebarOpen(false)}
      onLogout={handleLogout}
    />
  );

  return (
    <div className="app-shell landlord-shell landlord-market-trends">
      <div className="app-shell-frame">
        {/* Desktop sidebar */}
        <aside className="app-shell-sidebar">
          {renderSidebar()}
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="app-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          className={`app-sidebar-drawer ${
            sidebarOpen ? "is-open" : ""
          }`}
        >
          <button
            type="button"
            title="Close navigation"
            className="app-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X />
          </button>

          {renderSidebar()}
        </aside>

        <LandlordMenuTrigger
          expanded={sidebarOpen}
          onClick={() => setSidebarOpen(true)}
        />

        <div className="app-shell-main">
          <main className="app-shell-content app-shell-content-mobile-nav">
            <div className="market-trends-page">
              {/* Header */}
              <header className="market-trends-header">
                <div>
                  <h1>Market Trends</h1>
                  <p>
                    Discover the most popular apartment
                    listings based on tenant engagement.
                  </p>
                </div>
              </header>

              {/* Loading */}
              {(isLoading || marketLoading) && (
                <div className="market-trends-empty">
                  Loading Market Trends...
                </div>
              )}

              {/* General error */}
              {!isLoading &&
                !marketLoading &&
                marketError && (
                  <div
                    className="market-trends-empty"
                    role="alert"
                  >
                    {marketError}
                  </div>
                )}

              {/* Main content */}
              {!isLoading &&
                !marketLoading &&
                !marketError && (
                  <div className="market-trends-layout">
                    <div className="market-trends-primary">
                      {/* Top Performing Apartments */}
                      <section className="market-details">
                        <header>
                          <div>
                            <h2>
                              Top Performing Apartments
                            </h2>

                            <p>
                              These apartments are based on
                              recorded tenant engagement
                              across all published listings.
                            </p>
                          </div>

                          <label className="market-period-select">
                            <CalendarDays size={17} />

                            <select
                              aria-label="Market Trends period"
                              value={period}
                              onChange={(event) =>
                                setPeriod(
                                  event.target.value
                                )
                              }
                            >
                              {PERIOD_OPTIONS.map(
                                (option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                )
                              )}
                            </select>
                          </label>
                        </header>

                        {properties.length === 0 ? (
                          <p className="market-period-empty">
                            No published apartment listings
                            found for Market Trends.
                          </p>
                        ) : (
                          <>
                            {!hasSelectedEngagement && (
                              <p className="market-period-empty">
                                No tenant engagement has been
                                recorded for this period yet.
                              </p>
                            )}

                            <div className="market-property-list">
                              {topPerformingEntries.map(
                                (entry) => (
                                  <PropertyPerformanceCard
                                    key={entry.apartment.id}
                                    entry={entry}
                                    showVerification
                                    verified={isApartmentVerified(
                                      entry.apartment
                                    )}
                                    onViewDetails={(
                                      apartment
                                    ) =>
                                      navigate(
                                        `/landlord/market/${apartment.id}`
                                      )
                                    }
                                  />
                                )
                              )}
                            </div>
                          </>
                        )}
                      </section>

                      {/* Preference error */}
                      {preferenceAnalyticsError && (
                        <p
                          className="market-preference-unavailable"
                          role="alert"
                        >
                          {preferenceAnalyticsError}
                        </p>
                      )}

                      {/* Bedroom and capacity */}
                      {preferencesAvailable && (
                        <>
                          <section
                            className="market-preference-duo"
                            aria-label="Tenant apartment preferences"
                          >
                            <MarketTrendDonutChart
                              title="Bedroom Preferences"
                              data={
                                preferenceCharts.bedrooms
                                  .data
                              }
                              responseCount={
                                preferenceCharts.bedrooms
                                  .responseCount
                              }
                              insight={preferenceInsight(
                                preferenceCharts.bedrooms
                                  .data,
                                "bedroom preference"
                              )}
                            />

                            <MarketTrendDonutChart
                              title="Capacity Preferences"
                              data={
                                preferenceCharts.roomCapacity
                                  .data
                              }
                              responseCount={
                                preferenceCharts.roomCapacity
                                  .responseCount
                              }
                              insight={preferenceInsight(
                                preferenceCharts.roomCapacity
                                  .data,
                                "unit-capacity preference"
                              )}
                            />
                          </section>

                          {/* Preferred price range */}
                          <section className="market-price-range-panel">
                            <MarketTrendBarChart
                              title="Preferred Price Range"
                              data={
                                preferenceCharts.priceRanges
                                  .data
                              }
                              responseCount={
                                preferenceCharts.priceRanges
                                  .responseCount
                              }
                              variant="columns"
                              insight={preferenceInsight(
                                preferenceCharts.priceRanges
                                  .data,
                                "price range"
                              )}
                            />
                          </section>
                        </>
                      )}
                    </div>

                    {/* Right analytics column */}
                    <aside
                      className="market-trends-aside"
                      aria-label="Tenant preference insights"
                    >
                      {preferencesAvailable && (
                        <>
                          <MarketTrendBarChart
                            title="Top Preferred Areas"
                            data={
                              preferenceCharts.preferredAreas
                                .data
                            }
                            responseCount={
                              preferenceCharts.preferredAreas
                                .responseCount
                            }
                            variant="columns"
                            insight={preferenceInsight(
                              preferenceCharts.preferredAreas
                                .data,
                              "area"
                            )}
                          />

                          <MarketTrendBarChart
                            title="Top Included Features in Demand"
                            data={
                              preferenceCharts.amenities.data
                            }
                            responseCount={
                              preferenceCharts.amenities
                                .responseCount
                            }
                            variant="columns"
                            insight={preferenceInsight(
                              preferenceCharts.amenities
                                .data,
                              "amenity"
                            )}
                          />
                        </>
                      )}
                    </aside>
                  </div>
                )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
