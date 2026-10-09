import { Building2, Loader2 } from "lucide-react";

import {
    useEffect,
    useMemo,
    useState,
} from "react";


import {
    useApartmentsContext,
} from "@/contexts/ApartmentsContext";


import {
    isTenantVisibleApartment,
} from "@/utils/listingVisibility";

import { ApartmentCard } from "@/tenant/ApartmentDiscovery";
import { fetchRatingsForApartments, summarizeApartmentRatings } from "@/services/apartmentRatingsService";

import {
    fetchApartmentViews,
} from "@/services/dashboardSupabaseService";



const SKELETON_CARD_COUNT = 4;

function selectRandomListings(apartments) {
    const listings = apartments.filter(isTenantVisibleApartment);
    for (let index = listings.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [listings[index], listings[swapIndex]] = [listings[swapIndex], listings[index]];
    }
    return listings.slice(0, 4);
}

function PreviewCard({ apartment, onApartmentClick, viewCount = 0, ratingStats, ratingsLoading }) {
    return <div className="landing-preview-wrapper">
      <ApartmentCard apartment={{ ...apartment, views: viewCount }} ratingStats={ratingStats} ratingsLoading={ratingsLoading} onApartmentClick={onApartmentClick} showGuestFavorite/>
    </div>;
}

/* =========================================================
   SKELETON
========================================================= */

function PreviewSkeleton() {
    return (
        <div className="landing-preview-skeleton">

            <div className="landing-skeleton-image" />

            <div className="landing-skeleton-body">

                <span className="landing-skeleton-title" />

                <div className="landing-skeleton-location" />

                <div className="landing-skeleton-details" />

            </div>

        </div>
    );
}


/* =========================================================
   LANDING APARTMENT PREVIEW
========================================================= */

export function LandingApartmentPreview({
    onBrowseClick,
}) {
    const {
        apartments,
        isLoading,
        error,
    } =
        useApartmentsContext();


    /* =========================
       VIEW DATA
    ========================= */

    const [
        viewRows,
        setViewRows,
    ] = useState([]);


    useEffect(() => {
        let mounted = true;

        const loadViews =
            async () => {
                try {
                    const views =
                        await fetchApartmentViews();

                    if (
                        !mounted
                    ) {
                        return;
                    }

                    setViewRows(
                        Array.isArray(
                            views
                        )
                            ? views
                            : []
                    );
                }
                catch (
                    error
                ) {
                    console.error(
                        "Unable to load apartment views:",
                        error
                    );

                    if (
                        mounted
                    ) {
                        setViewRows(
                            []
                        );
                    }
                }
            };

        void loadViews();

        return () => {
            mounted =
                false;
        };
    }, []);

    /* =========================
       VIEW COUNT PER APARTMENT
    ========================= */

    const getViewCount = (
        apartmentId
    ) =>
        viewRows
            .filter(
                (view) =>
                    (
                        view.apartment_id ??
                        view.apartmentId
                    ) ===
                    apartmentId
            )
            .reduce(
                (
                    total,
                    view
                ) =>
                    total +
                    Math.max(
                        0,
                        Number(
                            view.view_count
                        ) || 0
                    ),
                0
            );


    /* =========================
       VISIBLE APARTMENTS
    ========================= */

    const publishedApartments =
        useMemo(
            () => selectRandomListings(apartments),
            [
                apartments,
            ]
        );


    const [ratingRows, setRatingRows] = useState([]);
    const [ratingsLoading, setRatingsLoading] = useState(true);
    const ratingSummary = useMemo(() => summarizeApartmentRatings(ratingRows), [ratingRows]);
    useEffect(() => {
        let active = true;
        setRatingsLoading(true);
        fetchRatingsForApartments(publishedApartments.map(apartment => apartment.id))
            .then(rows => { if (active) setRatingRows(rows); })
            .catch(error => { console.error("Unable to load apartment ratings:", error); if (active) setRatingRows([]); })
            .finally(() => { if (active) setRatingsLoading(false); });
        return () => { active = false; };
    }, [publishedApartments]);

    /* =========================
       LOADING
    ========================= */

    if (
        isLoading
    ) {
        return (
            <section className="landing-listings-section">

                <div className="landing-listings-container">

                    <div className="landing-section-heading">

                        <p className="landing-listings-loading">

                            <Loader2 className="landing-loading-icon" />

                            Loading apartment records...

                        </p>

                    </div>


                    <div className="landing-skeleton-grid">

                        {Array.from({
                            length:
                                SKELETON_CARD_COUNT,
                        }).map(
                            (
                                _,
                                index
                            ) => (
                                <PreviewSkeleton
                                    key={
                                        index
                                    }
                                />
                            )
                        )}

                    </div>

                </div>

            </section>
        );
    }


    /* =========================
       ERROR
    ========================= */

    if (
        error &&
        publishedApartments.length ===
            0
    ) {
        return (
            <section className="landing-listings-section">

                <div className="landing-listings-container">

                    <p className="landing-listings-loading">
                        Unable to load apartment listings.
                    </p>

                </div>

            </section>
        );
    }


    /* =========================
       NO APARTMENTS
    ========================= */

    if (
        publishedApartments.length ===
        0
    ) {
        return null;
    }


    /* =========================
       LISTINGS
    ========================= */

    return (
        <section className="landing-listings-section">

            <div className="landing-section-container">

                <div className="landing-listings-grid">

                    {publishedApartments.map(
                        (
                            apartment
                        ) => (
                            <PreviewCard
                                ratingStats={ratingSummary.byApartment.get(apartment.id)}
                                ratingsLoading={ratingsLoading}
                                key={
                                    apartment.id
                                }

                                apartment={
                                    apartment
                                }

                                onApartmentClick={
                                    onBrowseClick
                                }

                                viewCount={
                                    getViewCount(
                                        apartment.id
                                    )
                                }
                            />
                        )
                    )}

                </div>

            </div>

        </section>
    );
}


/* =========================================================
   LANDING LISTINGS SECTION
========================================================= */

export function LandingListingsSection({
    onBrowseClick,
}) {
    const {
        apartments,
        isLoading,
    } =
        useApartmentsContext();


    const hasPublishedApartments =
        useMemo(
            () =>
                apartments.some(
                    isTenantVisibleApartment
                ),
            [
                apartments,
            ]
        );


    if (
        isLoading ||
        hasPublishedApartments
    ) {
        return (
            <LandingApartmentPreview
                onBrowseClick={
                    onBrowseClick
                }
            />
        );
    }


    return (
        <LandingListingsFallback
            onBrowseClick={
                onBrowseClick
            }
        />
    );
}


/* =========================================================
   PLACEHOLDER
========================================================= */

export function LandingListingsFallback({
}) {
    return (
        <section className="landing-empty-listings-section" aria-labelledby="empty-listings-title">
            <div className="landing-empty-listings-card">
                <span className="landing-empty-listings-icon">
                    <Building2 aria-hidden="true" />
                </span>
                <h2 id="empty-listings-title">No apartments available yet</h2>
                <p>There are no published apartment listings at the moment. Please check back soon.</p>
            </div>
        </section>
    );
}
