import "./MarketOverview.css";

import {
  CalendarDays,
  Eye,
  Heart,
  MapPin,
  Star,
  TrendingUp,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  ImageWithFallback,
} from "@/components/ImageWithFallback";

import {
  LandlordSidebar,
} from "@/landlord/LandlordSidebar";

import {
  LandlordMenuTrigger,
} from "@/landlord/LandlordMenuTrigger";

import {
  useApartmentsContext,
} from "@/contexts/ApartmentsContext";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  fetchApartmentViews,
  fetchFavoritesForApartments,
  fetchNotifications,
  fetchViewActivityForApartments,
} from "@/services/dashboardSupabaseService";

import {
  supabase,
} from "@/services/supabaseClient";

import {
  fetchRatingsForApartments,
} from "@/services/apartmentRatingsService";

import {
  formatApartmentLocation,
} from "@/utils/apartmentLocation";

import {
  getApartmentImageUrl,
} from "@/utils/images";

import {
  isTenantVisibleApartment,
} from "@/utils/listingVisibility";

import {
  getRoomPriceRange,
} from "@/utils/priceRange";

import {
  calculateDemandScores,
} from "@/utils/demand";


/* =========================================================
   TREND TABS
========================================================= */

const TRENDS = [
  {
    id: "demand",
    label: "Demand",
    icon: TrendingUp,
  },
  {
    id: "views",
    label: "Most Viewed",
    icon: Eye,
  },
  {
    id: "favorites",
    label: "Most Favorited",
    icon: Heart,
  },
  {
    id: "ratings",
    label: "Highest Rated",
    icon: Star,
  },
];

const METRIC_ORDER_BY_TREND = {
  demand: ["views", "favorites", "rating"],
  views: ["views", "favorites", "rating"],
  favorites: ["favorites", "views", "rating"],
  ratings: ["rating", "views", "favorites"],
};

const PROPERTY_METRICS = {
  views: {
    className: "market-metric-views",
    icon: Eye,
    label: "Views",
    value: (item) => Number(item.views ?? 0).toLocaleString(),
  },
  favorites: {
    className: "market-metric-favorites",
    icon: Heart,
    label: "Favorites",
    value: (item) => Number(item.favorites ?? 0).toLocaleString(),
  },
  rating: {
    className: "market-metric-rating",
    icon: Star,
    label: "Average Rating",
    value: (item) => item.ratingAverage === null || item.ratingAverage === undefined
      ? "—"
      : Number(item.ratingAverage).toFixed(1),
  },
};

const metricsForTrend = (trendType) =>
  (METRIC_ORDER_BY_TREND[trendType] ?? METRIC_ORDER_BY_TREND.demand)
    .map((metricId) => ({ id: metricId, ...PROPERTY_METRICS[metricId] }));


/* =========================================================
   HELPERS
========================================================= */

const apartmentIdFrom = (row) =>
  row?.apartment_id ??
  row?.apartmentId;


const propertyImage = (apartment) =>
  getApartmentImageUrl(
    apartment
  );


/* =========================================================
   START OF WEEK
========================================================= */

const startOfWeek = (
  date = new Date()
) => {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  const day =
    result.getDay();

  result.setDate(
    result.getDate() -
      (
        day === 0
          ? 6
          : day - 1
      )
  );

  return result;
};


/* =========================================================
   PERIOD CHECK
========================================================= */

const isInPeriod = (
  value,
  period
) => {

  /* ALL TIME */

  if (
    period === "allTime"
  ) {
    return true;
  }


  if (!value) {
    return false;
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }


  const now =
    new Date();


  const thisWeek =
    startOfWeek(now);


  /* THIS WEEK */

  if (
    period === "thisWeek"
  ) {
    return (
      date >= thisWeek &&
      date <= now
    );
  }


  /* LAST WEEK */

  if (
    period === "lastWeek"
  ) {
    const lastWeekStart =
      new Date(thisWeek);

    lastWeekStart.setDate(
      lastWeekStart.getDate() -
      7
    );

    return (
      date >= lastWeekStart &&
      date < thisWeek
    );
  }


  /* LAST 30 DAYS */

  if (
    period === "last30Days"
  ) {
    const thirtyDaysAgo =
      new Date(now);

    thirtyDaysAgo.setDate(
      thirtyDaysAgo.getDate() -
      30
    );

    thirtyDaysAgo.setHours(
      0,
      0,
      0,
      0
    );

    return (
      date >= thirtyDaysAgo &&
      date <= now
    );
  }


  return false;
};


/* =========================================================
   MARKET OVERVIEW
========================================================= */

export function MarketOverview() {

  const navigate =
    useNavigate();


  const {
    user,
    logout,
  } = useAuth();


  const {
    apartments = [],
    isLoading,
  } = useApartmentsContext();


  /* =======================================================
     STATE
  ======================================================= */

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);


  /*
   * Default to All Time.
   *
   * This means the View number initially matches
   * the number shown on Apartments.jsx cards.
   */
  const [
    period,
    setPeriod,
  ] = useState(
    "allTime"
  );


  const [
    trendType,
    setTrendType,
  ] = useState(
    "demand"
  );


  /*
   * All-time aggregated views.
   *
   * This is the SAME source used by
   * the tenant apartment cards.
   */
  const [
    allTimeViews,
    setAllTimeViews,
  ] = useState([]);


  /*
   * Raw/daily view activity.
   *
   * Used only for:
   * - This Week
   * - Last Week
   * - Last 30 Days
   */
  const [
    viewActivity,
    setViewActivity,
  ] = useState([]);


  const [
    favorites,
    setFavorites,
  ] = useState([]);


  const [
    ratings,
    setRatings,
  ] = useState([]);


  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);


  const [
    marketLoading,
    setMarketLoading,
  ] = useState(true);

  const [
    marketDataRevision,
    setMarketDataRevision,
  ] = useState(0);


  /* =======================================================
     MARKET PROPERTIES

     IMPORTANT:
     ALL tenant-visible properties are included.

     Do NOT filter using:
     landlord_id === user.id
  ======================================================= */

  const properties =
    useMemo(
      () =>
        apartments.filter(
          (apartment) =>
            isTenantVisibleApartment(
              apartment
            )
        ),

      [apartments]
    );


  /* =======================================================
     PROPERTY IDS
  ======================================================= */

  const propertyIds =
    useMemo(
      () =>
        properties
          .map(
            (property) =>
              property.id
          )
          .filter(Boolean),

      [properties]
    );


  const propertyIdsKey =
    useMemo(
      () =>
        propertyIds
          .map(String)
          .sort()
          .join(","),

      [propertyIds]
    );


  /* =======================================================
     LOAD MARKET DATA
  ======================================================= */

  useEffect(() => {

    let active = true;


    const load =
      async () => {

        setMarketLoading(
          true
        );


        try {

          const [
  allTimeViewRows,
  activityViewRows,
  favoriteRows,
  ratingRows,
  notifications,
] = await Promise.all([

  fetchApartmentViews(),

  propertyIds.length
    ? fetchViewActivityForApartments(
        propertyIds
      )
    : [],

  // Fetch favorites only for the listings ranked on this screen. This lets a
  // landlord see favorites made by tenants on their own listings under RLS.
  propertyIds.length
    ? fetchFavoritesForApartments(
        propertyIds
      )
    : [],

  propertyIds.length
    ? fetchRatingsForApartments(
        propertyIds
      )
    : [],

  user?.id
    ? fetchNotifications(
        user.id
      )
    : [],
]);


          if (!active) {
            return;
          }


          setAllTimeViews(
            Array.isArray(
              allTimeViewRows
            )
              ? allTimeViewRows
              : []
          );


          setViewActivity(
            Array.isArray(
              activityViewRows
            )
              ? activityViewRows
              : []
          );


          setFavorites(
  Array.isArray(favoriteRows)
    ? favoriteRows
    : []
);


          setRatings(
            Array.isArray(
              ratingRows
            )
              ? ratingRows
              : []
          );


          setUnreadNotifications(
            (
              notifications ??
              []
            ).filter(
              (item) =>
                !(
                  item.read ??
                  item.is_read
                )
            ).length
          );

        } catch (error) {

          console.error(
            "Unable to load market trends:",
            error
          );


          if (active) {

            setAllTimeViews(
              []
            );

            setViewActivity(
              []
            );

            setFavorites(
              []
            );

            setRatings(
              []
            );

          }

        } finally {

          if (active) {

            setMarketLoading(
              false
            );

          }

        }

      };


    void load();


    return () => {

      active = false;

    };

  }, [
    propertyIdsKey,
    user?.id,
    marketDataRevision,
  ]);


  /* Refresh ranking data when a tenant views, favorites, or rates a visible
     listing. The fetch remains the source of truth; realtime only triggers it. */
  useEffect(() => {
    const visiblePropertyIds = new Set(propertyIds.map(String));

    if (visiblePropertyIds.size === 0) {
      return undefined;
    }

    const refreshIfVisible = (payload) => {
      const apartmentId = payload.new?.apartment_id ?? payload.old?.apartment_id;

      // Delete payloads may contain only the row id unless the database uses
      // REPLICA IDENTITY FULL. Refresh in that case so removed favorites and
      // ratings cannot leave a stale count on screen.
      if (!apartmentId || visiblePropertyIds.has(String(apartmentId))) {
        setMarketDataRevision((current) => current + 1);
      }
    };

    const channel = supabase
      .channel("landlord-market-trends-engagement")
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_views" }, refreshIfVisible)
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, refreshIfVisible)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_ratings" }, refreshIfVisible)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [propertyIdsKey]);


  /* =======================================================
     BUILD PROPERTY ENTRIES
  ======================================================= */

  const entries =
    useMemo(
      () =>
        properties.map(
          (apartment) => {

            const apartmentId =
              String(
                apartment.id
              );


            /* =====================================
               VIEWS
            ===================================== */

            let totalPropertyViews =
              0;


            /*
             * ALL TIME
             *
             * Same calculation as Apartments.jsx.
             *
             * Find the apartment rows and add
             * view_count.
             */
            if (
              period ===
              "allTime"
            ) {

              totalPropertyViews =
                allTimeViews

                  .filter(
                    (row) =>
                      String(
                        apartmentIdFrom(
                          row
                        ) ??
                          ""
                      ) ===
                      apartmentId
                  )

                  .reduce(
                    (
                      total,
                      row
                    ) =>
                      total +
                      Math.max(
                        0,
                        Number(
                          row.view_count ??
                            row.viewCount ??
                            0
                        ) || 0
                      ),

                    0
                  );

            } else {

              /*
               * PERIOD-SPECIFIC VIEWS
               *
               * Use dated view activity.
               */

              const propertyViews =
                viewActivity.filter(
                  (row) => {

                    const sameApartment =
                      String(
                        apartmentIdFrom(
                          row
                        ) ??
                          ""
                      ) ===
                      apartmentId;


                    if (
                      !sameApartment
                    ) {
                      return false;
                    }


                    const timestamp =
                      row.view_date ??
                      row.viewed_at ??
                      row.viewedAt ??
                      row.created_at ??
                      row.createdAt;


                    return isInPeriod(
                      timestamp,
                      period
                    );

                  }
                );


              totalPropertyViews =
                propertyViews.reduce(
                  (
                    total,
                    row
                  ) =>
                    total +
                    Math.max(
                      0,
                      Number(
                        row.view_count ??
                          row.viewCount ??
                          1
                      ) || 0
                    ),

                  0
                );

            }


            /* =====================================
               FAVORITES
            ===================================== */

            const propertyFavorites =
              favorites.filter(
                (favorite) =>
                  String(
                    favorite.apartment_id ??
                    favorite.apartmentId
                  ) === apartmentId &&
                  (
                    period === "allTime" ||
                    isInPeriod(
                      favorite.created_at ??
                        favorite.createdAt,
                      period
                    )
                  )
              );

            const totalPropertyFavorites =
              propertyFavorites.length;


            /* =====================================
               RATINGS
            ===================================== */

            const propertyRatings =
              ratings.filter(
                (row) =>
                  String(
                    apartmentIdFrom(
                      row
                    ) ??
                      ""
                  ) ===
                  apartmentId &&
                  (
                    period === "allTime" ||
                    isInPeriod(
                      row.updated_at ??
                        row.updatedAt ??
                        row.created_at ??
                        row.createdAt,
                      period
                    )
                  )
              );


            const ratingCount =
              propertyRatings.length;


            const ratingAverage =
              ratingCount > 0

                ? propertyRatings.reduce(
                    (
                      total,
                      row
                    ) =>
                      total +
                      Number(
                        row.rating ??
                          0
                      ),

                    0
                  ) /
                  ratingCount

                : null;

            return {

              apartment,

              views:
                totalPropertyViews,

              favorites:
                totalPropertyFavorites,

              ratingCount,

              ratingAverage,

            };

          }
        ),

      [
        allTimeViews,
        viewActivity,
        favorites,
        period,
        properties,
        ratings,
      ]
    );


  /* =======================================================
     DEMAND ALGORITHM

     demand.js:
     Views     = 40%
     Favorites = 40%
     Rating    = 20%
  ======================================================= */

  const demandEntries =
    useMemo(
      () =>
        calculateDemandScores(
          entries
        ),

      [entries]
    );


  /* =======================================================
     RANKING
  ======================================================= */

  const rankedEntries =
    useMemo(
      () => {

        const list =
          trendType ===
          "demand"

            ? [
                ...demandEntries,
              ]

            : [
                ...entries,
              ];


        list.sort(
          (
            a,
            b
          ) => {

            let difference =
              0;


            /* DEMAND */

            if (
              trendType ===
              "demand"
            ) {

              difference =
                Number(
                  b.demandScore ??
                    0
                ) -
                Number(
                  a.demandScore ??
                    0
                );

            }


            /* MOST VIEWED */

            else if (
              trendType ===
              "views"
            ) {

              difference =
                Number(
                  b.views ??
                    0
                ) -
                Number(
                  a.views ??
                    0
                );

            }


            /* MOST FAVORITED */

            else if (
              trendType ===
              "favorites"
            ) {

              difference =
                Number(
                  b.favorites ??
                    0
                ) -
                Number(
                  a.favorites ??
                    0
                );

            }


            /* HIGHEST RATED */

            else if (
              trendType ===
              "ratings"
            ) {

              difference =
                (
                  b.ratingAverage ??
                  -1
                ) -
                (
                  a.ratingAverage ??
                  -1
                );

            }


            if (
              difference !== 0
            ) {

              return difference;

            }


            /* Alphabetical fallback */

            return String(
              a.apartment
                ?.title ??
                ""
            ).localeCompare(
              String(
                b.apartment
                  ?.title ??
                  ""
              )
            );

          }
        );


        return list;

      },

      [
        entries,
        demandEntries,
        trendType,
      ]
    );


  /* =======================================================
     TAB INFORMATION
  ======================================================= */

  const selectedTrend =
    useMemo(
      () => {

        /* DEMAND */

        if (
          trendType ===
          "demand"
        ) {

          return {

            heading:
              "Apartment Demand",

            description:
              "Apartment demand is calculated using views, favorites, and average ratings.",

          };

        }


        /* FAVORITES */

        if (
          trendType ===
          "favorites"
        ) {

          return {

            heading:
              "Most Favorited Properties",

            description:
              "Apartment listings ranked according to tenant favorites.",

          };

        }


        /* RATINGS */

        if (
          trendType ===
          "ratings"
        ) {

          return {

            heading:
              "Highest Rated Properties",

            description:
              "Apartment listings ranked according to average tenant ratings.",

          };

        }


        /* VIEWS */

        return {

          heading:
            "Most Viewed Properties",

          description:
            "Apartment listings ranked according to tenant views.",

        };

      },

      [trendType]
    );


  /* =======================================================
     EMPTY ENGAGEMENT CHECK
  ======================================================= */

  const hasSelectedEngagement =
    rankedEntries.some(
      (item) => {

        if (
          trendType ===
          "demand"
        ) {

          return (
            Number(
              item.demandScore ??
                0
            ) > 0
          );

        }


        if (
          trendType ===
          "views"
        ) {

          return (
            Number(
              item.views ??
                0
            ) > 0
          );

        }


        if (
          trendType ===
          "favorites"
        ) {

          return (
            Number(
              item.favorites ??
                0
            ) > 0
          );

        }


        return (
          item.ratingAverage !==
            null &&
          Number(
            item.ratingAverage
          ) > 0
        );

      }
    );


  /* =======================================================
     SIDEBAR
  ======================================================= */

  const SidebarContent =
    () => (

      <LandlordSidebar

        user={
          user
        }

        verified={
          user?.isVerified ??
          user?.is_verified
        }

        activeSection="market"

        unreadNotifications={
          unreadNotifications
        }

        onSectionChange={(
          section
        ) => {

          navigate(
            `/landlord/dashboard?section=${section}`
          );

          setSidebarOpen(
            false
          );

        }}

        onClose={() =>
          setSidebarOpen(
            false
          )
        }

        onLogout={() => {

          logout?.();

          navigate(
            "/",
            {
              replace: true,
            }
          );

        }}

      />

    );


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div className="app-shell landlord-shell landlord-market-trends">

      <div className="app-shell-frame">


        {/* =================================================
            DESKTOP SIDEBAR
        ================================================= */}

        <aside className="app-shell-sidebar">

          <SidebarContent />

        </aside>


        {/* =================================================
            MOBILE OVERLAY
        ================================================= */}

        {sidebarOpen && (

          <div

            className="app-sidebar-overlay"

            onClick={() =>
              setSidebarOpen(
                false
              )
            }

          />

        )}


        {/* =================================================
            MOBILE SIDEBAR
        ================================================= */}

        <aside

          className={`app-sidebar-drawer ${
            sidebarOpen
              ? "is-open"
              : ""
          }`}

        >

          <button

            type="button"

            title="Close navigation"

            className="app-sidebar-close"

            onClick={() =>
              setSidebarOpen(
                false
              )
            }

          >

            <X />

          </button>


          <SidebarContent />

        </aside>


        {/* =================================================
            MOBILE MENU
        ================================================= */}

        <LandlordMenuTrigger
          expanded={sidebarOpen}
          onClick={() => setSidebarOpen(true)}
        />


        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <div className="app-shell-main">

          <main className="app-shell-content app-shell-content-mobile-nav">

            <div className="market-trends-page">


            {/* =============================================
                PAGE HEADER
            ============================================= */}

            <header className="market-trends-header">

              <div>

                <h1>
                  Market Trends
                </h1>

                <p>
                  Discover apartment market performance based on tenant engagement.
                </p>

              </div>

            </header>


            {/* =============================================
                LOADING
            ============================================= */}

            {(isLoading ||
              marketLoading) && (

              <div className="market-trends-empty">

                Loading Market Trends...

              </div>

            )}


            {/* =============================================
                NO PROPERTIES
            ============================================= */}

            {!isLoading &&
            !marketLoading &&
            properties.length ===
              0 ? (

              <div className="market-trends-empty">

                No apartment listings found for Market Trends.

              </div>

            ) : !isLoading &&
              !marketLoading ? (

              <>


                {/* =========================================
                    TREND TABS
                ========================================= */}

                <div

                  className="market-trend-tabs"

                  role="tablist"

                  aria-label="Market trend type"

                >

                  {TRENDS.map(
                    ({
                      id,
                      label,
                      icon: Icon,
                    }) => (

                      <button

                        key={
                          id
                        }

                        type="button"

                        role="tab"

                        aria-selected={
                          trendType ===
                          id
                        }

                        className={`market-trend-tab ${
                          trendType ===
                          id
                            ? "is-active"
                            : ""
                        }`}

                        onClick={() =>
                          setTrendType(
                            id
                          )
                        }

                      >

                        <Icon
                          size={
                            18
                          }
                        />

                        <span>
                          {
                            label
                          }
                        </span>

                      </button>

                    )
                  )}

                </div>


                {/* =========================================
                    MARKET DETAILS
                ========================================= */}

                <section className="market-details">


                  {/* =====================================
                      HEADER
                  ===================================== */}

                  <header>

                    <div>

                      <h2>

                        {
                          selectedTrend.heading
                        }

                      </h2>

                      <p>

                        {
                          selectedTrend.description
                        }

                      </p>

                    </div>


                    {/* =================================
                        PERIOD SELECTOR
                    ================================= */}

                    <label className="market-period-select">

                      <CalendarDays
                        size={
                          17
                        }
                      />


                      <select

                        value={
                          period
                        }

                        onChange={(
                          event
                        ) =>
                          setPeriod(
                            event.target.value
                          )
                        }

                      >

                        <option value="thisWeek">

                          This Week

                        </option>


                        <option value="lastWeek">

                          Last Week

                        </option>


                        <option value="last30Days">

                          Last 30 Days

                        </option>


                        <option value="allTime">

                          All Time

                        </option>

                      </select>

                    </label>

                  </header>


                  {/* =====================================
                      NO ENGAGEMENT
                  ===================================== */}

                  {!hasSelectedEngagement && (

                    <p className="market-period-empty">

                      No tenant engagement has been recorded for this period.

                    </p>

                  )}


                  {/* =====================================
                      PROPERTY LIST
                  ===================================== */}

                  <div className="market-property-list">


                    {rankedEntries.map(
                      (item) => {

                        const apartment =
                          item.apartment;


                        /* =========================
                           IMAGE
                        ========================= */

                        const image =
                          propertyImage(
                            apartment
                          );


                        /* =========================
                           LOCATION
                        ========================= */

                        const location =
                          formatApartmentLocation(
                            apartment,
                            "Location unavailable"
                          );


                        /* =========================
                           ROOM PRICES
                        ========================= */

                        const roomPrices =
                          (
                            apartment.rooms ??
                            []
                          )

                            .map(
                              (room) =>
                                Number(
                                  room.price ??
                                    room.rent ??
                                    0
                                )
                            )

                            .filter(
                              (price) =>
                                Number.isFinite(
                                  price
                                ) &&
                                price > 0
                            );


                        /* =========================
                           PRICE RANGE
                        ========================= */

                        const priceRange =
                          getRoomPriceRange(
                            apartment,
                            roomPrices
                          );


                        /* =========================
                           DEMAND CLASS
                        ========================= */

                        const demandClass =

                          item.marketLevel ===
                          "High Demand"

                            ? "market-demand-high"

                            : item.marketLevel ===
                              "Medium Demand"

                              ? "market-demand-medium"

                              : "market-demand-low";

                        const orderedMetrics =
                          metricsForTrend(trendType);


                        return (

                          <article

                            key={
                              apartment.id
                            }

                            className="market-property-card"

                          >


                            {/* =========================
                                IMAGE
                            ========================= */}

                            <div className="market-property-image">

                              {image ? (

                                <ImageWithFallback

                                  src={
                                    image
                                  }

                                  alt={
                                    apartment.title ||
                                    "Apartment"
                                  }

                                />

                              ) : (

                                <div className="market-property-image-placeholder">

                                  <BuildingPlaceholder />

                                </div>

                              )}

                            </div>


                            {/* =========================
                                PROPERTY INFORMATION
                            ========================= */}

                            <div className="market-property-info">


                              {/* TITLE + DEMAND */}

                              <div className="market-property-title-row">

                                <h3>

                                  {
                                    apartment.title ||
                                    "Untitled property"
                                  }

                                </h3>


                                {trendType ===
                                  "demand" && (

                                  <span

                                    className={`market-demand-badge ${demandClass}`}

                                  >

                                    {
                                      item.marketLevel ||
                                      "Low Demand"
                                    }

                                  </span>

                                )}

                              </div>


                              {/* LOCATION */}

                              <div className="market-property-location">

                                <MapPin
                                  size={
                                    14
                                  }
                                />

                                <span>

                                  {
                                    location
                                  }

                                </span>

                              </div>


                              {/* PRICE */}

                              <div className="market-property-price">

                                {
                                  priceRange.formatted
                                }

                              </div>

                            </div>


                            {orderedMetrics.map(
                              ({
                                id,
                                className,
                                icon: Icon,
                                label,
                                value,
                              }) => (
                                <div
                                  key={id}
                                  className={`market-property-metric ${className}`}
                                >
                                  <Icon size={17} />
                                  <strong>{value(item)}</strong>
                                  <span>{label}</span>
                                </div>
                              )
                            )}

                            {/* =========================
                                VIEW DETAILS
                            ========================= */}

                            <button

                              type="button"

                              className="market-view-details"

                              onClick={() =>
                                navigate(
                                  `/landlord/market/${apartment.id}`
                                )
                              }

                            >

                              View Details

                            </button>


                          </article>

                        );

                      }
                    )}

                  </div>

                </section>

              </>

            ) : null}

            </div>

          </main>

        </div>

      </div>

    </div>

  );

}


/* =========================================================
   IMAGE PLACEHOLDER
========================================================= */

function BuildingPlaceholder() {

  return (

    <div className="market-building-placeholder">

      <span>
        Property
      </span>

    </div>

  );

}
