
import {
    Bookmark,
    Building2,
    ChevronRight,
    Eye,
    Heart,
    MapPin,
    Search,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";

import { listFavoriteApartments } from "@/data/apartments";
import { useFavorites } from "@/tenant/useFavorites";

import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getImageUrl } from "@/utils/images";

import { MobileNavigation } from "@/tenant/MobileNavigation";
import { Sidebar } from "@/tenant/Sidebar";
import { useTenantNotifications } from "@/tenant/useTenantNotifications";

import { isTenantVisibleApartment } from "@/utils/listingVisibility";
import { ApartmentRatingSummary } from "@/components/ApartmentRatingSummary";
import { EmptyState } from "@/tenant/EmptyState";
import { ApartmentCard } from "@/tenant/ApartmentDiscovery";
import { fetchApartmentRatings, subscribeToApartmentRatings, summarizeApartmentRatings } from "@/services/apartmentRatingsService";

import {
    dashboardPathForRole,
    isAdminRole,
} from "@/services/authService";

// Fetch the same apartment views used by Browse.
import {
    fetchApartmentViews,
} from "@/services/dashboardSupabaseService";

const STATUS_LABEL = {
    available: "Available",
    occupied: "Occupied",
    maintenance: "Under Maintenance",
};

const BROWSE_STATUS_CLASS = {
    available: "apartment-browse-badge-3",
    occupied: "apartment-browse-badge-4",
    maintenance: "apartment-browse-badge-5",
};

// Apartment price range
const getBrowsePriceLabel = (apartment) => {
    const prices = (apartment.rooms ?? [])
        .map((room) => Number(room.price))
        .filter(
            (price) =>
                Number.isFinite(price) &&
                price > 0
        );

    if (prices.length === 0) {
        return "Price unavailable";
    }

    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);

    const formatPrice = (price) =>
        `₱${price.toLocaleString("en-PH")}`;

    return lowest === highest
        ? `${formatPrice(lowest)} / month`
        : `${formatPrice(lowest)} - ${formatPrice(highest)} / month`;
};

// Display 1 view or multiple views
const favoriteViewLabel = (count) =>
    `${count.toLocaleString()} ${
        count === 1 ? "view" : "views"
    }`;


// =====================================================
// FAVORITES PAGE
// =====================================================

export function Favorites() {
    const { user } = useAuth();

    const navigate = useNavigate();

    const {
        favorites,
        toggleFavorite,
        markFavoritesViewed,
    } = useFavorites();

    const {
        unreadCount,
    } = useTenantNotifications();

    const {
        apartments,
    } = useApartmentsContext();

    const [
        savedFavoriteApartments,
        setFavoriteApartments,
    ] = useState([]);

    const [
        isLoading,
        setIsLoading,
    ] = useState(true);

    const [ratingRows, setRatingRows] = useState([]);
    const [ratingsLoading, setRatingsLoading] = useState(true);
    const ratingSummary = useMemo(
        () => summarizeApartmentRatings(ratingRows),
        [ratingRows]
    );

    useEffect(() => {
        let active = true;
        const loadRatings = async () => {
            try {
                const rows = await fetchApartmentRatings();
                if (active)
                    setRatingRows(rows);
            }
            catch (error) {
                console.error("Unable to load favorite apartment ratings:", error);
                if (active)
                    setRatingRows([]);
            }
            finally {
                if (active)
                    setRatingsLoading(false);
            }
        };
        void loadRatings();
        const unsubscribe = subscribeToApartmentRatings(() => { void loadRatings(); });
        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        markFavoritesViewed();
    }, [favorites, markFavoritesViewed]);

    const [
        filter,
        setFilter,
    ] = useState("all");

    const [
        viewMode,
        setViewMode,
    ] = useState("grid");

    const [
        removingId,
        setRemovingId,
    ] = useState(null);

    // Store fetched apartment view records
    const [
        viewRows,
        setViewRows,
    ] = useState([]);

    // =================================================
    // FETCH APARTMENT VIEWS FROM SUPABASE
    // =================================================

    useEffect(() => {
        let mounted = true;

        const loadViews = async () => {
            try {
                const views =
                    await fetchApartmentViews();

                if (!mounted) {
                    return;
                }

                setViewRows(
                    Array.isArray(views)
                        ? views
                        : []
                );
            } catch (error) {
                console.error(
                    "Failed to fetch apartment views:",
                    error
                );
            }
        };

        void loadViews();

        return () => {
            mounted = false;
        };
    }, []);


    // =================================================
    // CALCULATE VIEWS FOR EACH APARTMENT
    // =================================================

    const viewCountsByApartment = useMemo(() => {
        const counts = new Map();

        for (const view of viewRows) {
            const apartmentId =
                view.apartment_id ??
                view.apartmentId;

            if (apartmentId == null) {
                continue;
            }

            const key = String(apartmentId);

            const count = Math.max(
                0,
                Number(view.view_count) || 0
            );

            counts.set(
                key,
                (counts.get(key) ?? 0) + count
            );
        }

        return counts;
    }, [viewRows]);


    // =================================================
    // COMBINE APARTMENT DATA WITH SAVED FAVORITES
    // =================================================

    const favoriteApartments = useMemo(() => {
        const byId = new Map(
            [
                ...apartments,
                ...savedFavoriteApartments,
            ].map((apartment) => [
                String(apartment.id),
                apartment,
            ])
        );

        return favorites
            .map((id) => byId.get(String(id)))
            .filter(
                (apartment) =>
                    apartment &&
                    isTenantVisibleApartment(apartment)
            );
    }, [
        apartments,
        savedFavoriteApartments,
        favorites,
    ]);


    // =================================================
    // FETCH SAVED FAVORITE APARTMENTS
    // =================================================

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!user?.id) {
                setFavoriteApartments([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            try {
                const favoriteList =
                    await listFavoriteApartments(user.id);

                if (active) {
                    setFavoriteApartments(
                        favoriteList.filter(
                            (apt) =>
                                isTenantVisibleApartment(apt) &&
                                !(
                                    user.role === "landlord" &&
                                    String(apt.landlordId) ===
                                        String(user.id)
                                )
                        )
                    );
                }
            } catch (error) {
                console.error(
                    "Failed to load favorite apartments:",
                    error
                );

                if (active) {
                    setFavoriteApartments([]);
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [
        apartments,
        user?.id,
        user?.role,
        favorites,
    ]);


    // =================================================
    // FILTER AND SORT FAVORITES
    // =================================================

    const visibleFavorites = useMemo(() => {
        return [...favoriteApartments]
            .filter((apartment) => {
                if (filter === "available") {
                    return isTenantVisibleApartment(apartment);
                }

                return true;
            })
            .sort(
                (a, b) =>
                    new Date(
                        b.favoritedAt || 0
                    ).getTime() -
                    new Date(
                        a.favoritedAt || 0
                    ).getTime()
            );
    }, [
        favoriteApartments,
        filter,
    ]);

    const favoriteCount =
        favoriteApartments.length;


    // =================================================
    // REMOVE APARTMENT FROM FAVORITES
    // =================================================

    const removeFavorite = async (apartmentId) => {
        if (!user?.id) {
            return;
        }

        setRemovingId(apartmentId);

        try {
            await toggleFavorite(apartmentId);
        } catch (error) {
            console.error(
                "Failed to remove favorite:",
                error
            );
        } finally {
            setRemovingId(null);
        }
    };


    // =================================================
    // FAVORITE APARTMENT CARD
    // =================================================

    const FavoriteCard = ({ apartment }) => {
        const status =
            apartment.status ?? "available";

        const images = [
            apartment.image,
            ...(apartment.images ?? []),
        ].filter(Boolean);

        const location =
            formatApartmentLocation(apartment);

        const isVerified =
            apartment.landlordVerified === true ||
            apartment.isVerified === true;

        // FIX:
        // Get actual apartment views from fetched data.
        const viewCount =
            viewCountsByApartment.get(
                String(apartment.id)
            ) ?? 0;

        return (
            <article className="apartment-browse-article">
                <div className="apartment-browse-panel-5">
                    {images[0] ? (
                        <ImageWithFallback
                            src={getImageUrl(images[0])}
                            alt={apartment.title}
                            className="apartment-browse-image-with-fallback"
                        />
                    ) : (
                        <div className="apartment-browse-row-6">
                            <Building2 className="apartment-browse-building2-icon" />
                        </div>
                    )}

                    <div className="apartment-browse-content-2">
                        <Badge
                            className={`apartment-browse-badge-2 ${
                                BROWSE_STATUS_CLASS[status] ??
                                BROWSE_STATUS_CLASS.available
                            }`}
                        >
                            {STATUS_LABEL[status] ??
                                "Available"}
                        </Badge>

                        {isVerified && (
                            <VerifiedBadge
                                label="Verified Listing"
                                className="apartment-browse-verified-badge"
                            />
                        )}

                        {apartment.petFriendly && (
                            <Badge className="apartment-browse-pet-friendly">
                                Pet Friendly
                            </Badge>
                        )}
                    </div>

                    <button
                        type="button"
                        title="Remove from favorites"
                        onClick={() =>
                            void removeFavorite(apartment.id)
                        }
                        disabled={
                            removingId === apartment.id
                        }
                        className="apartment-browse-button-6 apartment-browse-button-7"
                        aria-label="Remove from favorites"
                    >
                        <Heart
                            className="apartment-browse-heart-icon"
                            fill="currentColor"
                        />
                    </button>
                </div>

                <div className="apartment-browse-panel-6">
                    <div className="apartment-browse-row-7">
                        <div className="apartment-browse-panel-7">
                            <h2 className="apartment-browse-heading">
                                {apartment.title}
                            </h2>

                            <ApartmentRatingSummary
                                compact
                                stats={ratingSummary.byApartment.get(apartment.id)}
                                isLoading={ratingsLoading}
                                className="apartment-browse-apartment-rating-summary"
                            />

                            <p className="apartment-browse-text-3">
                                <MapPin className="apartment-browse-map-pin-icon" />
                                {location}
                            </p>
                        </div>

                        <div className="apartment-browse-panel-8">
                            <p className="apartment-browse-view-room-prices">
                                {getBrowsePriceLabel(apartment)}
                            </p>

                            {/* Actual fetched view count */}
                            <p className="apartment-browse-text-4">
                                <Eye className="apartment-browse-eye-icon" />
                                {favoriteViewLabel(viewCount)}
                            </p>
                        </div>
                    </div>

                    <Button
                        asChild
                        variant="outline"
                        className="apartment-browse-button-9"
                    >
                        <Link
                            to={`/apartment/${apartment.id}`}
                            state={{
                                returnTo: "/favorites",
                                backLabel: "Back to Favorites",
                            }}
                        >
                            <Eye className="apartment-browse-eye-icon-2" />
                            View apartment details
                        </Link>
                    </Button>
                </div>
            </article>
        );
    };


    // =================================================
    // REDIRECT ADMIN USERS
    // =================================================

    if (isAdminRole(user?.role)) {
        return (
            <Navigate
                to={dashboardPathForRole(user?.role)}
                replace
            />
        );
    }


    // =================================================
    // FAVORITES PAGE UI
    // =================================================

    return (
        <div className="tenant-browse app-shell">
            <MobileNavigation
                active="favorites"
                unreadCount={unreadCount}
            />

            <div className="app-shell-frame">
                <aside className="app-shell-sidebar">
                    <Sidebar
                        active="favorites"
                        unreadCount={unreadCount}
                    />
                </aside>

                <div className="app-shell-main">
                    <main className="app-shell-content app-shell-content-mobile-nav">
                        <div className="tenant-favorites-page">
                        <section className="tenant-favorites-hero tenant-page-header">
                            <div className="favorites-panel-9 tenant-page-header__content">
                                <h1 className="favorites-your-favorites">
                                    Your Favorites
                                </h1>

                                <p className="favorites-text-4">
                                    {favoriteCount > 0
                                        ? `${favoriteCount.toLocaleString()} ${
                                              favoriteCount === 1
                                                  ? "apartment"
                                                  : "apartments"
                                          } saved for later`
                                        : "Save apartments you like and return to them anytime."}
                                </p>
                            </div>
                        </section>

                        <section className="favorites-section-2">
                            {isLoading ? (
                                <div className="favorites-loading-favorites">
                                    Loading favorites...
                                </div>
                            ) : favoriteCount === 0 ? (
                                <div className="favorites-card-2">
                                    <div className="favorites-card-3">
                                        <Heart className="favorites-heart-icon-3" />
                                    </div>

                                    <h2 className="favorites-no-favorites-yet">
                                        No favorites yet
                                    </h2>

                                    <p className="favorites-text-5">
                                        Save apartments you like and
                                        they'll appear here.
                                    </p>

                                    <Button
                                        onClick={() =>
                                            navigate("/browse")
                                        }
                                        className="favorites-browse-apartments"
                                    >
                                        Browse Apartments
                                        <ChevronRight className="favorites-chevron-right-icon-2" />
                                    </Button>
                                </div>
                            ) : visibleFavorites.length === 0 ? (
                                <div className="favorites-card-4">
                                    <Search className="favorites-search-icon" />

                                    <h2 className="favorites-no-favorites-match-this-filter">
                                        No favorites match this filter
                                    </h2>

                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            setFilter("all")
                                        }
                                        className="favorites-show-all-favorites"
                                    >
                                        Show All Favorites
                                    </Button>
                                </div>
                            ) : (
                                <div
                                    className={
                                        viewMode === "grid"
                                            ? "apartment-browse-grid-11"
                                            : "favorites-route-results-list"
                                    }
                                >
                                    {visibleFavorites.map(
                                        (apartment) => (
                                            <FavoriteCard
                                                key={apartment.id}
                                                apartment={apartment}
                                            />
                                        )
                                    )}
                                </div>
                            )}
                        </section>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}


// =====================================================
// FAVORITES OVERVIEW (TENANT DASHBOARD)
// =====================================================

export const FavoritesOverview = ({
    favoriteApartments,
    visibleFavoriteApartments,
    favoriteFilter,
    setFavoriteFilter,
    favoriteView,
    setFavoriteView,
    removingFavoriteId,
    removeFavorite,
    ratingSummary,
    ratingsLoading,
    navigate,
}) => (
    <div className="favorites-section-container">
        <section className="favorites-section-section tenant-page-header">
            <div className="favorites-section-content tenant-page-header__content">
                <div>
                    <h1 className="favorites-section-your-favorites">
                        Your Favorites
                    </h1>

                    <p className="favorites-section-apartments-you-ve-saved-for-later">
                        Apartments you've saved for later
                    </p>
                </div>
            </div>

            <div className="favorites-section-panel" />
            <div className="favorites-section-panel-2" />
        </section>

        <section className="favorites-section-section-2">
            <div className="favorites-section-row">
                <span className="favorites-section-row-2">
                    <Heart className="favorites-section-heart-icon" />
                </span>

                <div>
                    <p className="favorites-section-total-favorites">
                        Total Favorites
                    </p>

                    <p className="favorites-section-text">
                        {favoriteApartments.length.toLocaleString()}
                    </p>

                    <p className="favorites-section-text-2">
                        {favoriteApartments.length === 1
                            ? "apartment saved"
                            : "apartments saved"}
                    </p>
                </div>
            </div>

            <div className="favorites-section-row-3">
                <span className="favorites-section-row-4">
                    <Bookmark className="favorites-section-bookmark-icon" />
                </span>

                <div>
                    <p className="favorites-section-save-for-later">
                        Save for later
                    </p>

                    <p className="favorites-section-text-3">
                        Compare and revisit real listings you saved
                        from Browse and Apartment Details.
                    </p>
                </div>
            </div>
        </section>

        {favoriteApartments.length === 0 ? (
            <EmptyState
                icon={Heart}
                message="No favorites yet. Browse apartments to save listings."
                actionLabel="Browse Apartments"
                action={() => navigate("/browse")}
            />
        ) : visibleFavoriteApartments.length === 0 ? (
            <div className="favorites-section-card-2">
                <Search className="favorites-section-search-icon" />

                <h2 className="favorites-section-no-favorites-match-this-filter">
                    No favorites match this filter
                </h2>

                <Button
                    variant="outline"
                    onClick={() => setFavoriteFilter("all")}
                    className="favorites-section-show-all-favorites"
                >
                    Show All Favorites
                </Button>
            </div>
        ) : (
            <div
                className={
                    favoriteView === "grid"
                        ? "favorites-section-grid-2"
                        : "favorites-section-panel-3"
                }
            >
                {visibleFavoriteApartments.map(
                    (apartment) => (
                        <FavoriteApartmentCard
                            key={apartment.id}
                            apartment={apartment}
                            favoriteView={favoriteView}
                            removingFavoriteId={removingFavoriteId}
                            removeFavorite={removeFavorite}
                            ratingSummary={ratingSummary}
                            ratingsLoading={ratingsLoading}
                        />
                    )
                )}
            </div>
        )}
    </div>
);


const FavoriteApartmentCard = ({
    apartment,
    ratingSummary,
    ratingsLoading,
}) => (
    <ApartmentCard
        apartment={apartment}
        ratingStats={ratingSummary.byApartment.get(apartment.id)}
        ratingsLoading={ratingsLoading}
        detailState={{
            returnTo: "/tenant/dashboard?section=favorites",
            backLabel: "Back to Favorites",
        }}
    />
);
