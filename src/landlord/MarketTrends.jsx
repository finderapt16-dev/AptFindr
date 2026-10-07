import "./MarketTrends.css";

import { CalendarDays, Eye, Heart, Star, X } from "lucide-react";
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
import { buildMarketTrendEntries, formatTenantPreferenceAnalytics, getMarketPropertyIds, getMarketTrendDetails, hasMarketTrendEngagement, preferenceInsight, rankMarketTrendEntries } from "@/utils/marketTrendsUtils";

const METRIC_ORDER_BY_TREND = { demand: ["views", "favorites", "rating"], views: ["views", "favorites", "rating"], favorites: ["favorites", "views", "rating"], ratings: ["rating", "views", "favorites"] };
const PROPERTY_METRICS = {
  views: { className: "market-metric-views", icon: Eye, label: "Views", value: (item) => Number(item.views ?? 0).toLocaleString() },
  favorites: { className: "market-metric-favorites", icon: Heart, label: "Favorites", value: (item) => Number(item.favorites ?? 0).toLocaleString() },
  rating: { className: "market-metric-rating", icon: Star, label: "Average Rating", value: (item) => item.ratingAverage === null || item.ratingAverage === undefined ? "—" : Number(item.ratingAverage).toFixed(1) },
};
const metricsForTrend = (trendType) => (METRIC_ORDER_BY_TREND[trendType] ?? METRIC_ORDER_BY_TREND.demand).map((metricId) => ({ id: metricId, ...PROPERTY_METRICS[metricId] }));

/** Main container for the existing Market Trends page. */
export function MarketTrends() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { apartments = [], isLoading } = useApartmentsContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState("allTime");
  const trendType = "demand";
  const [allTimeViews, setAllTimeViews] = useState([]);
  const [viewActivity, setViewActivity] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [preferenceAnalytics, setPreferenceAnalytics] = useState(null);
  const [preferenceAnalyticsError, setPreferenceAnalyticsError] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [marketDataRevision, setMarketDataRevision] = useState(0);

  const properties = useMemo(() => apartments.filter((apartment) => isTenantVisibleApartment(apartment)), [apartments]);
  const propertyIds = useMemo(() => getMarketPropertyIds(properties), [properties]);
  const propertyIdsKey = useMemo(() => propertyIds.map(String).sort().join(","), [propertyIds]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setMarketLoading(true);
      setMarketError("");
      try {
        const data = await fetchMarketTrendsData({ apartmentIds: propertyIds, userId: user?.id });
        if (!active) return;
        setAllTimeViews(data.allTimeViews);
        setViewActivity(data.viewActivity);
        setFavorites(data.favorites);
        setRatings(data.ratings);
        setPreferenceAnalytics(data.preferenceAnalytics);
        setPreferenceAnalyticsError(data.preferenceAnalyticsError);
        setUnreadNotifications(data.notifications.filter((item) => !(item.read ?? item.is_read)).length);
      } catch (error) {
        console.error("Unable to load market trends:", error);
        if (!active) return;
        setAllTimeViews([]);
        setViewActivity([]);
        setFavorites([]);
        setRatings([]);
        setPreferenceAnalytics(null);
        setPreferenceAnalyticsError("");
        setMarketError(error instanceof Error ? error.message : "Unable to load market trends.");
      } finally {
        if (active) setMarketLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [propertyIdsKey, user?.id, marketDataRevision]);

  useEffect(() => {
    const visiblePropertyIds = new Set(propertyIds.map(String));
    if (visiblePropertyIds.size === 0) return undefined;
    const refreshIfVisible = (payload) => {
      const apartmentId = payload.new?.apartment_id ?? payload.old?.apartment_id;
      if (!apartmentId || visiblePropertyIds.has(String(apartmentId))) setMarketDataRevision((current) => current + 1);
    };
    const channel = supabase.channel("landlord-market-trends-engagement")
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_views" }, refreshIfVisible)
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, refreshIfVisible)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_ratings" }, refreshIfVisible)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [propertyIdsKey]);

  const entries = useMemo(() => buildMarketTrendEntries({ properties, allTimeViews, viewActivity, favorites, ratings, period }), [allTimeViews, favorites, period, properties, ratings, viewActivity]);
  const rankedEntries = useMemo(() => rankMarketTrendEntries(entries, trendType), [entries, trendType]);
  const selectedTrend = useMemo(() => getMarketTrendDetails(trendType), [trendType]);
  const hasSelectedEngagement = useMemo(() => hasMarketTrendEngagement(rankedEntries, trendType), [rankedEntries, trendType]);
  const orderedMetrics = useMemo(() => metricsForTrend(trendType), [trendType]);
  const preferenceCharts = useMemo(() => formatTenantPreferenceAnalytics(preferenceAnalytics), [preferenceAnalytics]);

  const SidebarContent = () => <LandlordSidebar user={user} verified={user?.isVerified ?? user?.is_verified} activeSection="market" unreadNotifications={unreadNotifications} onSectionChange={(section) => { navigate(`/landlord/dashboard?section=${section}`); setSidebarOpen(false); }} onClose={() => setSidebarOpen(false)} onLogout={() => { logout?.(); navigate("/", { replace: true }); }} />;

  return <div className="app-shell landlord-shell landlord-market-trends">
    <div className="app-shell-frame">
      <aside className="app-shell-sidebar"><SidebarContent /></aside>
      {sidebarOpen && <div className="app-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`app-sidebar-drawer ${sidebarOpen ? "is-open" : ""}`}><button type="button" title="Close navigation" className="app-sidebar-close" onClick={() => setSidebarOpen(false)}><X /></button><SidebarContent /></aside>
      <LandlordMenuTrigger expanded={sidebarOpen} onClick={() => setSidebarOpen(true)} />
      <div className="app-shell-main"><main className="app-shell-content app-shell-content-mobile-nav"><div className="market-trends-page">
        <header className="market-trends-header"><div><h1>Market Trends</h1><p>Discover apartment market performance based on tenant engagement.</p></div></header>
        {(isLoading || marketLoading) && <div className="market-trends-empty">Loading Market Trends...</div>}
        {!isLoading && !marketLoading && marketError && <div className="market-trends-empty">{marketError}</div>}
        {!isLoading && !marketLoading && !marketError && <>
          {properties.length === 0 ? <div className="market-trends-empty">No apartment listings found for Market Trends.</div> : <section className="market-details"><header><div><h2>{selectedTrend.heading}</h2><p>{selectedTrend.description}</p></div><label className="market-period-select"><CalendarDays size={17} /><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="thisWeek">This Week</option><option value="lastWeek">Last Week</option><option value="last30Days">Last 30 Days</option><option value="allTime">All Time</option></select></label></header>
            {!hasSelectedEngagement && <p className="market-period-empty">No tenant engagement has been recorded for this period.</p>}
            <div className="market-property-list">{rankedEntries.map((entry) => <PropertyPerformanceCard key={entry.apartment.id} entry={entry} metrics={orderedMetrics} trendType={trendType} onViewDetails={(apartment) => navigate(`/landlord/market/${apartment.id}`)} />)}</div>
          </section>}
          <section className="market-preference-insights" aria-labelledby="tenant-preference-insights-title">
            <header className="market-preference-insights-header"><div><h2 id="tenant-preference-insights-title">Tenant Preference Insights</h2><p>Aggregated preferences saved by tenants across AptFindr.</p></div></header>
            {preferenceAnalyticsError ? <p className="market-preference-unavailable">{preferenceAnalyticsError}</p> : <div className="market-preference-grid">
              <MarketTrendBarChart title="Top Preferred Areas" data={preferenceCharts.preferredAreas} insight={preferenceInsight(preferenceCharts.preferredAreas, "area")} />
              <MarketTrendBarChart title="Top Amenities in Demand" data={preferenceCharts.amenities} insight={preferenceInsight(preferenceCharts.amenities, "amenity")} />
              <MarketTrendDonutChart title="Bedroom Preferences" data={preferenceCharts.bedrooms} insight={preferenceInsight(preferenceCharts.bedrooms, "bedroom preference")} />
              <MarketTrendDonutChart title="Room-Capacity Preferences" data={preferenceCharts.roomCapacity} insight={preferenceInsight(preferenceCharts.roomCapacity, "room-capacity preference")} />
              <MarketTrendBarChart title="Preferred Price Range" data={preferenceCharts.priceRanges} insight={preferenceInsight(preferenceCharts.priceRanges, "price range")} />
            </div>}
          </section>
        </>}
      </div></main></div>
    </div>
  </div>;
}
