import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchUserPreferenceSections,
  saveUserPreferenceSection,
} from "@/services/dashboardSupabaseService";

const PREFERENCE_SECTION = "admin_published_apartment_views";
const MAX_SAVED_APARTMENT_IDS = 500;

const normalizeViewedApartments = (value) => ({
  apartmentIds: Array.isArray(value?.apartmentIds)
    ? [...new Set(value.apartmentIds.map((id) => String(id)).filter(Boolean))]
    : [],
  publishedAfter:
    typeof value?.publishedAfter === "string" &&
    !Number.isNaN(new Date(value.publishedAfter).getTime())
      ? value.publishedAfter
      : new Date().toISOString(),
});

const publishedAt = (apartment) =>
  apartment?.publishedAt ?? apartment?.published_at ?? "";

/**
 * Tracks newly published apartment listings an administrator has already inspected.
 * The saved state is scoped to the signed-in administrator, so one admin's
 * review never clears the badge for another admin.
 */
export function useNewApartmentBadge({ userId, apartments, getListingState }) {
  const [viewedApartmentIds, setViewedApartmentIds] = useState([]);
  const [publishedAfter, setPublishedAfter] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoaded(false);
    setViewedApartmentIds([]);
    setPublishedAfter("");

    if (!userId) {
      setIsLoaded(true);
      return () => {
        active = false;
      };
    }

    void fetchUserPreferenceSections(userId)
      .then((preferences) => {
        if (active) {
          const saved = normalizeViewedApartments(
            preferences[PREFERENCE_SECTION]
          );
          setPublishedAfter(saved.publishedAfter);
          setViewedApartmentIds((current) => [
            ...new Set([...saved.apartmentIds, ...current]),
          ]);
          if (!preferences[PREFERENCE_SECTION]) {
            void saveUserPreferenceSection(userId, PREFERENCE_SECTION, saved).catch(
              (error) => console.warn("Unable to start published apartment tracking:", error)
            );
          }
        }
      })
      .catch((error) => {
        console.warn("Unable to load viewed apartment listings:", error);
        if (active) {
          setPublishedAfter(new Date().toISOString());
        }
      })
      .finally(() => {
        if (active) {
          setIsLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const viewedApartmentIdSet = useMemo(
    () => new Set(viewedApartmentIds),
    [viewedApartmentIds]
  );

  const unseenNewPublishedApartmentCount = useMemo(() => {
    if (!isLoaded || !publishedAfter) return 0;

    const startTime = new Date(publishedAfter).getTime();

    return apartments.filter((apartment) => {
      const apartmentId = String(apartment?.id ?? "");
      const publicationTime = new Date(publishedAt(apartment)).getTime();
      return (
        apartmentId &&
        getListingState(apartment) === "published" &&
        Number.isFinite(publicationTime) &&
        publicationTime > startTime &&
        !viewedApartmentIdSet.has(apartmentId)
      );
    }).length;
  }, [apartments, getListingState, isLoaded, publishedAfter, viewedApartmentIdSet]);

  const markApartmentViewed = useCallback(
    (apartment) => {
      const apartmentId = String(apartment?.id ?? "");

      const publicationTime = new Date(publishedAt(apartment)).getTime();
      const startTime = new Date(publishedAfter).getTime();

      if (
        !userId ||
        !apartmentId ||
        getListingState(apartment) !== "published" ||
        !Number.isFinite(publicationTime) ||
        !Number.isFinite(startTime) ||
        publicationTime <= startTime
      ) {
        return;
      }

      setViewedApartmentIds((current) => {
        if (current.includes(apartmentId)) {
          return current;
        }

        const next = [...current, apartmentId].slice(-MAX_SAVED_APARTMENT_IDS);

        void saveUserPreferenceSection(userId, PREFERENCE_SECTION, {
          apartmentIds: next,
          publishedAfter,
        }).catch((error) => {
          console.warn("Unable to save viewed apartment listing:", error);
        });

        return next;
      });
    },
    [getListingState, publishedAfter, userId]
  );

  return { markApartmentViewed, unseenNewPublishedApartmentCount };
}
