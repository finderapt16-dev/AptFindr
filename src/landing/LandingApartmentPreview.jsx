import {
    Building2,
    Eye,
    Loader2,
    MapPin,
} from "lucide-react";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { Link } from "react-router-dom";

import {
    useApartmentsContext,
} from "@/contexts/ApartmentsContext";

import {
    getApartmentImageUrl,
} from "@/utils/images";

import {
    isTenantVisibleApartment,
} from "@/utils/listingVisibility";

import {
    ImageWithFallback,
} from "@/components/ImageWithFallback";

import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/VerifiedBadge";

import {
    fetchApartmentViews,
} from "@/services/dashboardSupabaseService";



const SKELETON_CARD_COUNT = 4;
const STATUS_LABEL = { available: "Available", occupied: "Occupied", maintenance: "Under Maintenance" };
const STATUS_CLASS = { available: "landing-preview-status-available", occupied: "landing-preview-status-occupied", maintenance: "landing-preview-status-maintenance" };

const listingSortTime = (apartment) => {
    const timestamp = Date.parse(apartment.publishedAt ?? apartment.createdAt ?? apartment.updatedAt ?? "");
    return Number.isFinite(timestamp) ? timestamp : 0;
};


/* =========================================================
   APARTMENT PRICE
========================================================= */

function getApartmentPriceLabel(
    apartment
) {
    const prices =
        (
            apartment.rooms ||
            []
        )
            .map(
                (room) =>
                    Number(
                        room.price
                    )
            )
            .filter(
                (price) =>
                    Number.isFinite(
                        price
                    ) &&
                    price > 0
            );

    if (
        prices.length ===
        0
    ) {
        const fallbackPrice =
            Number(
                apartment.price
            );

        if (
            Number.isFinite(
                fallbackPrice
            ) &&
            fallbackPrice > 0
        ) {
            return `₱${fallbackPrice.toLocaleString(
                "en-PH"
            )} / month`;
        }

        return "Price unavailable";
    }

    const minPrice =
        Math.min(
            ...prices
        );

    const maxPrice =
        Math.max(
            ...prices
        );

    if (
        minPrice ===
        maxPrice
    ) {
        return `₱${minPrice.toLocaleString(
            "en-PH"
        )} / month`;
    }

    return `₱${minPrice.toLocaleString(
        "en-PH"
    )}–₱${maxPrice.toLocaleString(
        "en-PH"
    )} / month`;
}


/* =========================================================
   VIEW LABEL
========================================================= */

const viewLabel = (
    count = 0
) =>
    `${Number(
        count
    ).toLocaleString()} ${
        Number(count) === 1
            ? "view"
            : "views"
    }`;


/* =========================================================
   PREVIEW CARD
========================================================= */

function PreviewCard({
    apartment,
    onApartmentClick,
    viewCount = 0,
}) {
    const status = apartment.status ?? "available";
    const verified = apartment.landlordVerified === true || apartment.isVerified === true;
    const location = [
        apartment.address ||
            apartment.location,

        apartment.city,

        apartment.state,
    ]
        .filter(Boolean)
        .map(
            (value) =>
                value.trim()
        )
        .join(", ");

    return (
        <div className="landing-preview-wrapper">
            <Link
                to={`/apartment/${apartment.id}`}
                onClick={
                    onApartmentClick
                }
                className="landing-preview-card"
            >
                {/* IMAGE */}

                <div className="landing-preview-image-wrap">
                    <ImageWithFallback
                        src={getApartmentImageUrl(
                            apartment
                        )}
                        alt={
                            apartment.title ||
                            "Apartment"
                        }
                        className="landing-preview-image"
                    />

                    <div className="landing-preview-badges">
                        <Badge className={`landing-preview-status ${STATUS_CLASS[status] ?? STATUS_CLASS.available}`}>
                            {STATUS_LABEL[status] ?? "Available"}
                        </Badge>
                        {verified && <VerifiedBadge label="Verified Listing" className="landing-preview-verified" />}
                        {apartment.petFriendly && <Badge className="landing-preview-pet">Pet Friendly</Badge>}
                    </div>
                </div>


                {/* BODY */}

                <div className="landing-preview-body">

                    <div className="landing-preview-heading">
                        <div className="landing-preview-main">
                            <h3 className="landing-preview-title">
                                {apartment.title || "Untitled Apartment"}
                            </h3>
                            <div className="landing-preview-location">
                                <MapPin className="landing-preview-location-icon" aria-hidden="true" />
                                <span className="landing-preview-address">
                                    {location || "La Paz, Iloilo City"}
                                </span>
                            </div>
                        </div>
                        <div className="landing-preview-meta">
                            <p className="landing-preview-price">{getApartmentPriceLabel(apartment)}</p>
                            <span className="landing-preview-views"><Eye aria-hidden="true" />{viewLabel(viewCount)}</span>
                        </div>
                    </div>
                    <span className="landing-preview-view-details"><Eye aria-hidden="true" />View Details</span>

                </div>
            </Link>
        </div>
    );
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
            () =>
                apartments
                    .filter(isTenantVisibleApartment)
                    .slice()
                    .sort((first, second) => {
                        const timestampDifference = listingSortTime(second) - listingSortTime(first);
                        if (timestampDifference !== 0) return timestampDifference;
                        return String(first.id ?? "").localeCompare(String(second.id ?? ""));
                    }),
            [
                apartments,
            ]
        );


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

                        <h2 className="landing-listings-title">
                            Available Apartment Listings
                        </h2>

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

                <section className="landing-listings-heading">

                    <div className="landing-listings-copy">

                        <h2 className="landing-section-title">
                            Available Apartments in La Paz
                        </h2>

                    </div>


                    <Link
                        to="/browse"
                        onClick={
                            onBrowseClick
                        }
                        className="landing-listings-link"
                    />

                </section>


                <div className="landing-listings-grid">

                    {publishedApartments.map(
                        (
                            apartment
                        ) => (
                            <PreviewCard
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
