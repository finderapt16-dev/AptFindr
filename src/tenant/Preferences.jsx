import { useEffect, useState } from "react";
import {
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    geocodeLocationWithinLaPaz,
    GeocodingError,
} from "../services/geocodingService";

const amenities = [
    ["petFriendly", "Pet Friendly"],
    ["parking", "Parking"],
    ["furnished", "Furnished"],
    ["ownBathroom", "Own Bathroom"],
    ["wifi", "Wi-Fi"],
    ["ac", "Air Conditioning"],
    ["laundryArea", "Laundry Area"],
    ["other", "Others"]
];

const priceRanges = [
    {
        value: "",
        label: "Any price",
        min: "",
        max: "",
    },
    {
        value: "5000",
        label: "₱5,000 - ₱7,000",
        min: "5000",
        max: "7000",
    },
    {
        value: "7000-9000",
        label: "₱7,000 - ₱9,000",
        min: "7000",
        max: "9000",
    },
    {
        value: "9000-11000",
        label: "₱9,000 - ₱11,000",
        min: "9000",
        max: "11000",
    },
    {
        value: "11000-13000",
        label: "₱11,000 - ₱15,000",
        min: "11000",
        max: "15000",
    },
    {
        value: "15000+",
        label: "₱15,000 and above",
        min: "15000",
        max: "",
    },
];

const empty = {
    preferredArea: "",
    preferredLat: null,
    preferredLng: null,

    minBudget: "",
    maxBudget: "",

    minBedrooms: "any",
    roomCapacity: "any",

    petFriendly: false,
    parking: false,
    furnished: false,
    ownBathroom: false,
    wifi: false,
    ac: false,
    laundryArea: false,
    other:false,
};

const getSavedPriceRange = (preferences) => {
    if (!preferences?.saveBudgetPreferences) {
        return "";
    }

    const min = Number(preferences.minBudget || 0);
    const max = Number(preferences.maxBudget || 0);

    if (min === 3000 && max === 5000) {
        return "3000-5000";
    }

    if (min === 5000 && max === 8000) {
        return "5000-8000";
    }

    if (min === 8000 && max === 10000) {
        return "8000-10000";
    }

    if (min === 10000 && max === 15000) {
        return "10000-15000";
    }

    if (min === 15000 && max === 0) {
        return "15000+";
    }

    return "";
};

export function Preferences({
    open,
    preferences,
    onSave,
}) {
    const [draft, setDraft] = useState(empty);

    const [
        selectedPriceRange,
        setSelectedPriceRange,
    ] = useState("");

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) {
            return;
        }

        setDraft({
            ...empty,
            ...preferences,

            minBudget:
                preferences.saveBudgetPreferences &&
                preferences.minBudget
                    ? String(
                          preferences.minBudget
                      )
                    : "",

            maxBudget:
                preferences.saveBudgetPreferences &&
                preferences.maxBudget
                    ? String(
                          preferences.maxBudget
                      )
                    : "",

            otherAmenities:
                preferences.otherAmenities ?? "",
        });

        setSelectedPriceRange(
            getSavedPriceRange(
                preferences
            )
        );

        setError("");
    }, [open, preferences]);

    const change = (key, value) => {
        setDraft((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const changePriceRange = (value) => {
        setSelectedPriceRange(value);

        const selectedRange =
            priceRanges.find(
                (range) =>
                    range.value === value
            );

        if (!selectedRange) {
            return;
        }

        setDraft((current) => ({
            ...current,

            minBudget:
                selectedRange.min,

            maxBudget:
                selectedRange.max,
        }));
    };

    const save = async (event) => {
        event.preventDefault();

        if (saving) {
            return;
        }

        const minBudget =
            Number(
                draft.minBudget || 0
            );

        const maxBudget =
            Number(
                draft.maxBudget || 0
            );

        if (
            ![minBudget, maxBudget].every(
                (value) =>
                    Number.isFinite(
                        value
                    ) &&
                    value >= 0
            )
        ) {
            setError(
                "Please select a valid price range."
            );

            return;
        }

        if (
            maxBudget > 0 &&
            minBudget > maxBudget
        ) {
            setError(
                "Minimum price cannot be higher than maximum price."
            );

            return;
        }

        setSaving(true);
        setError("");

        try {
            const preferredArea =
                draft.preferredArea
                    .trim()
                    .replace(
                        /\s+/g,
                        " "
                    );

            let preferredLat = null;
            let preferredLng = null;

            if (preferredArea) {
                const location =
                    await geocodeLocationWithinLaPaz(
                        preferredArea
                    );

                preferredLat =
                    location.lat;

                preferredLng =
                    location.lng;
            }

            await onSave({
                ...draft,

                preferredArea,
                preferredLat,
                preferredLng,

                minBudget,
                maxBudget,

                otherAmenities:
                    draft.otherAmenities
                        .trim(),

                recommendationLocation:
                    Boolean(
                        preferredArea
                    ),

                saveBudgetPreferences:
                    minBudget > 0 ||
                    maxBudget > 0,
            });
        } catch (failure) {
            if (
                failure instanceof
                GeocodingError
            ) {
                setError(
                    "Preferred location was not found within La Paz. Please enter a valid La Paz location."
                );
            } else {
                setError(
                    failure instanceof
                    Error
                        ? failure.message
                        : "Unable to save preferences. Please try again."
                );
            }
        } finally {
            setSaving(false);
        }
    };

    const choices = (
        key,
        title,
        labels
    ) => (
        <fieldset className="tenant-filter-group">
            <legend>
                {title}
            </legend>

            <div className="tenant-filter-choices">
                {[
                    "any",
                    "1",
                    "2",
                    "3",
                    "4+",
                ].map(
                    (
                        value,
                        index
                    ) => (
                        <button
                            key={
                                value
                            }
                            type="button"
                            aria-pressed={
                                draft[
                                    key
                                ] ===
                                value
                            }
                            onClick={() =>
                                change(
                                    key,
                                    value
                                )
                            }
                        >
                            {
                                labels[
                                    index
                                ]
                            }
                        </button>
                    )
                )}
            </div>
        </fieldset>
    );

    const clearAll = () => {
        setDraft({
            ...empty,
        });

        setSelectedPriceRange(
            ""
        );

        setError("");
    };

    return (
        <DialogContent
            className="tenant-search-filters"
            onEscapeKeyDown={(
                event
            ) => {
                if (saving) {
                    event.preventDefault();
                }
            }}
            onPointerDownOutside={(
                event
            ) => {
                if (saving) {
                    event.preventDefault();
                }
            }}
        >
            <DialogTitle>
                Preferences
            </DialogTitle>

            <DialogDescription>
                Set your preferences
                to find your ideal
                apartment matches.
            </DialogDescription>

            <form onSubmit={save}>
                <fieldset
                    disabled={
                        saving
                    }
                    className="tenant-filter-fields"
                >
                    {/* ========================= */}
                    {/* PREFERRED AREA */}
                    {/* ========================= */}

                    <fieldset className="tenant-filter-group">
                        <legend>
                            Preferred
                            Location
                        </legend>

                        <select
                            value={
                                draft.preferredArea
                            }
                            onChange={(
                                event
                            ) =>
                                change(
                                    "preferredArea",
                                    event
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="">
                                Select
                                preferred area
                            </option>

                            <option value="Aguinaldo">
                                Aguinaldo
                            </option>

                            <option value="Baldoza">
                                Baldoza
                            </option>

                            <option value="Bantud">
                                Bantud
                            </option>

                            <option value="Banuyao">
                                Banuyao
                            </option>

                            <option value="Burgos-Mabini-Plaza">
                                Burgos-Mabini-Plaza
                            </option>

                            <option value="Caingin">
                                Caingin
                            </option>

                            <option value="Divinagracia">
                                Divinagracia
                            </option>

                            <option value="Gustilo">
                                Gustilo
                            </option>

                            <option value="Hinactacan">
                                Hinactacan
                            </option>

                            <option value="Ingore">
                                Ingore
                            </option>

                            <option value="Jereos">
                                Jereos
                            </option>

                            <option value="Laguda">
                                Laguda
                            </option>

                            <option value="Lopez Jaena Norte">
                                Lopez
                                Jaena Norte
                            </option>

                            <option value="Lopez Jaena Sur">
                                Lopez
                                Jaena Sur
                            </option>

                            <option value="Luna">
                                Luna
                            </option>

                            <option value="Macarthur">
                                Macarthur
                            </option>

                            <option value="Magdalo">
                                Magdalo
                            </option>

                            <option value="Magsaysay Village">
                                Magsaysay
                                Village
                            </option>

                            <option value="Nabitasan">
                                Nabitasan
                            </option>

                            <option value="Railway">
                                Railway
                            </option>

                            <option value="Rizal">
                                Rizal
                            </option>

                            <option value="San Isidro">
                                San Isidro
                            </option>

                            <option value="San Nicolas">
                                San Nicolas
                            </option>

                            <option value="Tabuc Suba">
                                Tabuc Suba
                            </option>

                            <option value="Ticud">
                                Ticud
                            </option>
                        </select>
                    </fieldset>

                    {/* ========================= */}
                    {/* PRICE RANGE */}
                    {/* ========================= */}

                    <fieldset className="tenant-filter-group">
                        <legend>
                            Price Range
                        </legend>

                        <select
                            value={
                                selectedPriceRange
                            }
                            onChange={(
                                event
                            ) =>
                                changePriceRange(
                                    event
                                        .target
                                        .value
                                )
                            }
                            className="tenant-filter-price-select"
                        >
                            {priceRanges.map(
                                (
                                    range
                                ) => (
                                    <option
                                        key={
                                            range.value ||
                                            "any"
                                        }
                                        value={
                                            range.value
                                        }
                                    >
                                        {
                                            range.label
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </fieldset>

                    {/* ========================= */}
                    {/* BEDROOMS */}
                    {/* ========================= */}

                    {choices(
                        "minBedrooms",
                        "Bedrooms",
                        [
                            "Any",
                            "1",
                            "2",
                            "3",
                            "4+",
                        ]
                    )}

                    {/* ========================= */}
                    {/* ROOM CAPACITY */}
                    {/* ========================= */}

                    {choices(
                        "roomCapacity",
                        "Unit Capacity",
                        [
                            "Any",
                            "1 person",
                            "2 people",
                            "3 people",
                            "4+ people",
                        ]
                    )}

                    {/* ========================= */}
                    {/* AMENITIES */}
                    {/* ========================= */}

                    <fieldset className="tenant-filter-group">
                        <legend>
                            Included
                        </legend>

                        <div className="tenant-filter-amenities">
                            {amenities.map(
                                ([
                                    key,
                                    label,
                                ]) => (
                                    <button
                                        key={
                                            key
                                        }
                                        type="button"
                                        aria-pressed={Boolean(
                                            draft[
                                                key
                                            ]
                                        )}
                                        onClick={() =>
                                            change(
                                                key,
                                                !draft[
                                                    key
                                                ]
                                            )
                                        }
                                    >
                                        {
                                            label
                                        }
                                    </button>
                                )
                            )}
                        </div>
                    </fieldset>

                    {/* ========================= */}
                    {/* ERROR */}
                    {/* ========================= */}

                    {error && (
                        <p
                            role="alert"
                            className="tenant-filter-error"
                        >
                            {
                                error
                            }
                        </p>
                    )}

                    {/* ========================= */}
                    {/* ACTIONS */}
                    {/* ========================= */}

                    <div className="tenant-filter-actions">
                        <button
                            type="button"
                            onClick={
                                clearAll
                            }
                        >
                            Clear all
                        </button>

                        <button
                            type="submit"
                        >
                            {saving
                                ? "Saving…"
                                : "Save"}
                        </button>
                    </div>
                </fieldset>
            </form>
        </DialogContent>
    );
}
