
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ApartmentCard } from "@/tenant/ApartmentDiscovery";
import { hasValidApartmentCoordinates } from "@/utils/mapCoordinates";
import { fetchApartmentViews } from "@/services/dashboardSupabaseService";
import { Crosshair, LocateFixed, Eye } from "lucide-react";
import L from "leaflet";

function createMarkerIcon(tone, count = 1) {
  return L.divIcon({
    className: "renti-map-marker",
    html: `
      <div class="map-marker map-marker-${tone}">
        <div class="map-marker-center"></div>
      </div>
      ${
        count > 1
          ? `<div class="map-marker-count">${count}</div>`
          : ""
      }
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

const singleMarkerIcon = createMarkerIcon("available");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getMarkerTone(apartment) {
  if (apartment.markerStatus) {
    return apartment.markerStatus;
  }

  const status = apartment.status?.toLowerCase();
  const verificationStatus =
    apartment.verificationStatus?.toLowerCase();

  if (
    verificationStatus &&
    ["pending", "under_review", "awaiting_approval"].includes(
      verificationStatus
    )
  ) {
    return "pending";
  }

  if (
    apartment.availabilityStatus === "unavailable" ||
    [
      "archived",
      "hidden",
      "inactive",
      "rejected",
      "unpublished",
      "occupied",
      "maintenance",
    ].includes(status ?? "") ||
    Number(apartment.availableRooms ?? 0) <= 0
  ) {
    return "hidden";
  }

  return apartment.isVerified ? "available" : "hidden";
}

function getGroupTone(apartments) {
  if (
    apartments.every(
      (apartment) => getMarkerTone(apartment) === "hidden"
    )
  ) {
    return "hidden";
  }

  if (
    apartments.some(
      (apartment) => getMarkerTone(apartment) === "pending"
    )
  ) {
    return "pending";
  }

  if (
    apartments.some(
      (apartment) => getMarkerTone(apartment) === "available"
    )
  ) {
    return "available";
  }

  return "hidden";
}

function groupByCoordinates(apartments) {
  const groups = new globalThis.Map();

  apartments.forEach((apartment) => {
    const key = `${apartment.lat.toFixed(6)},${apartment.lng.toFixed(6)}`;

    groups.set(key, [
      ...(groups.get(key) ?? []),
      apartment,
    ]);
  });

  return Array.from(groups.entries()).map(([key, listings]) => {
    const [lat, lng] = key.split(",").map(Number);

    return {
      key,
      lat,
      lng,
      listings,
    };
  });
}

// ========================================
// APARTMENT VIEW COUNT HELPERS
// ========================================

function aggregateApartmentViews(rows) {
  const totals = {};

  if (!Array.isArray(rows)) {
    throw new Error("Invalid apartment views response.");
  }

  rows.forEach((row) => {
    const apartmentId =
      row.apartment_id ?? row.apartmentId;

    if (apartmentId == null) {
      return;
    }

    const id = String(apartmentId);

    const count = Number(
      row.view_count ?? row.viewCount ?? 0
    );

    if (!Number.isFinite(count)) {
      return;
    }

    totals[id] = (totals[id] ?? 0) + count;
  });

  return totals;
}

// ========================================
// TENANT LOCATION ICON
// ========================================

const tenantLocationIcon = L.divIcon({
  className: "tenant-location-icon",
  html: '<span class="tenant-location-dot"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// ========================================
// UPDATE TENANT LOCATION
// ========================================

function updateTenantLocationLayers(
  map,
  position,
  accuracyCircleRef,
  markerRef,
  locationLayerRef
) {
  if (!map.getPane("tenant-accuracy-pane")) {
    map.createPane("tenant-accuracy-pane");

    map.getPane("tenant-accuracy-pane").style.zIndex = "450";
  }

  if (!map.getPane("tenant-location-pane")) {
    map.createPane("tenant-location-pane");

    map.getPane("tenant-location-pane").style.zIndex = "650";
  }

  if (!locationLayerRef.current) {
    locationLayerRef.current = L.layerGroup();
  }

  if (!map.hasLayer(locationLayerRef.current)) {
    locationLayerRef.current.addTo(map);
  }

  const point = [position.lat, position.lng];

  if (
    !accuracyCircleRef.current ||
    !locationLayerRef.current.hasLayer(
      accuracyCircleRef.current
    )
  ) {
    accuracyCircleRef.current = L.circle(point, {
      pane: "tenant-accuracy-pane",
      radius: position.accuracy,
      color: "#60a5fa",
      weight: 2,
      fillColor: "#60a5fa",
      fillOpacity: 0.2,
      interactive: false,
    }).addTo(locationLayerRef.current);
  } else {
    accuracyCircleRef.current.setLatLng(point);
    accuracyCircleRef.current.setRadius(position.accuracy);
  }

  if (
    !markerRef.current ||
    !locationLayerRef.current.hasLayer(markerRef.current)
  ) {
    markerRef.current = L.marker(point, {
      pane: "tenant-location-pane",
      icon: tenantLocationIcon,
      zIndexOffset: 1000,
      interactive: false,
      keyboard: false,
    }).addTo(locationLayerRef.current);
  } else {
    markerRef.current.setLatLng(point);
  }

  markerRef.current.setZIndexOffset(1000);
}

// ========================================
// GEOLOCATION ERROR MESSAGES
// ========================================

function getGeolocationErrorMessage(error) {
  switch (error?.code) {
    case 1:
      return "Location access was denied. Allow location access in your browser settings, then try again.";

    case 2:
      return "Your location is unavailable. Check your device's location services and try again.";

    case 3:
      return "The location request timed out. Tracking will keep trying while it remains active.";

    default:
      return "Unable to read your location. Check your device settings and try again.";
  }
}

// ========================================
// MAIN MAP COMPONENT
// ========================================

export function MapView({
  lat,
  lng,
  zoom = 13,
  apartments = [],
  showSingleMarker = false,
  enableLiveLocation = false,
  emptyMessage = "No apartments found on the map. Try adjusting your filters.",
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const accuracyCircleRef = useRef(null);
  const tenantMarkerRef = useRef(null);
  const tenantLocationLayerRef = useRef(null);
  const latestPositionRef = useRef(null);

  const watchIdRef = useRef(null);
  const geolocationRef = useRef(null);
  const trackingSessionRef = useRef(0);

  const hasCenteredOnLocationRef = useRef(false);
  const hasAppliedApartmentBoundsRef = useRef(false);

  const [activePopup, setActivePopup] = useState(null);

  // ========================================
  // APARTMENT VIEWS STATE
  // ========================================

  const [viewsByApartment, setViewsByApartment] = useState({});
  const [viewsLoading, setViewsLoading] = useState(true);
  const [viewsError, setViewsError] = useState("");

  // ========================================
  // FETCH APARTMENT VIEWS FROM SUPABASE
  // ========================================

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const loadApartmentViews = async () => {
      const currentRequest = ++requestId;

      try {
        if (mounted) {
          setViewsLoading(true);
          setViewsError("");
        }

        const rows = await fetchApartmentViews();

        const totals = aggregateApartmentViews(rows);

        if (mounted && currentRequest === requestId) {
          setViewsByApartment(totals);
          setViewsError("");
        }
      } catch (error) {
        console.error(
          "Error fetching apartment views:",
          error
        );

        if (mounted && currentRequest === requestId) {
          setViewsError("Unable to load apartment views.");
        }
      } finally {
        if (mounted && currentRequest === requestId) {
          setViewsLoading(false);
        }
      }
    };

    loadApartmentViews();

    const handleWindowFocus = () => {
      loadApartmentViews();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadApartmentViews();
      }
    };

    window.addEventListener("focus", handleWindowFocus);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      mounted = false;
      requestId += 1;

      window.removeEventListener(
        "focus",
        handleWindowFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  // ========================================
  // INITIALIZE LEAFLET MAP
  // ========================================

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapRef.current).setView(
      [lat, lng],
      zoom
    );

    mapInstanceRef.current = map;
    hasAppliedApartmentBoundsRef.current = false;

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(map);

    if (showSingleMarker) {
      L.marker([lat, lng], {
        icon: singleMarkerIcon,
      })
        .addTo(map)
        .bindPopup("Location");
    }

    if (latestPositionRef.current) {
      updateTenantLocationLayers(
        map,
        latestPositionRef.current,
        accuracyCircleRef,
        tenantMarkerRef,
        tenantLocationLayerRef
      );

      map.setView(
        [
          latestPositionRef.current.lat,
          latestPositionRef.current.lng,
        ],
        Math.max(map.getZoom(), 15)
      );

      hasCenteredOnLocationRef.current = true;
    }

    // Maps are also mounted inside cards that can finish sizing after this
    // effect runs. Keep Leaflet synchronized with its actual canvas size so
    // tiles and markers remain visible on detail/review pages.
    const resizeMap = () => map.invalidateSize();
    const resizeTimer = setTimeout(resizeMap, 0);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(resizeMap);

    resizeObserver?.observe(mapRef.current);

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver?.disconnect();

      map.remove();

      mapInstanceRef.current = null;
      accuracyCircleRef.current = null;
      tenantMarkerRef.current = null;
      tenantLocationLayerRef.current = null;
      hasAppliedApartmentBoundsRef.current = false;
    };
  }, [lat, lng, zoom, showSingleMarker]);

  // ========================================
  // APARTMENT MARKERS
  // ========================================

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || showSingleMarker) {
      return;
    }

    const markerLayer = L.layerGroup().addTo(map);

    let emptyPopup = null;

    const validApartments = apartments.filter(
      (apartment) =>
        hasValidApartmentCoordinates(
          apartment.lat,
          apartment.lng
        )
    );

    if (validApartments.length === 0) {
      emptyPopup = L.popup({
        closeButton: false,
        closeOnClick: false,
        autoClose: false,
      })
        .setLatLng([lat, lng])
        .setContent(
          `<div class="map-popup-empty">${escapeHtml(
            emptyMessage
          )}</div>`
        )
        .openOn(map);
    } else {
      const groups = groupByCoordinates(validApartments);

      groups.forEach((group) => {
        const marker = L.marker(
          [group.lat, group.lng],
          {
            icon: createMarkerIcon(
              getGroupTone(group.listings),
              group.listings.length
            ),
          }
        ).addTo(markerLayer);

        const container = document.createElement("div");

        container.className = "map-listing-popup";

        marker.bindPopup(container, {
          className: "map-listing-popup-shell",
          minWidth: 278,
          maxWidth: 278,
        });

        marker.on("popupopen", () => {
          setActivePopup({
            container,
            listings: group.listings,
          });
        });

        marker.on("popupclose", () => {
          setActivePopup((current) =>
            current?.container === container
              ? null
              : current
          );
        });
      });

      if (
        !hasAppliedApartmentBoundsRef.current &&
        !latestPositionRef.current
      ) {
        if (groups.length === 1) {
          map.setView(
            [groups[0].lat, groups[0].lng],
            Math.max(zoom, 15)
          );
        } else {
          map.fitBounds(
            L.latLngBounds(
              groups.map((group) => [
                group.lat,
                group.lng,
              ])
            ),
            {
              padding: [40, 40],
              maxZoom: 16,
            }
          );
        }

        hasAppliedApartmentBoundsRef.current = true;
      }
    }

    return () => {
      markerLayer.remove();

      if (emptyPopup && map.hasLayer(emptyPopup)) {
        map.removeLayer(emptyPopup);
      }

      setActivePopup(null);
    };
  }, [
    lat,
    lng,
    zoom,
    apartments,
    showSingleMarker,
    emptyMessage,
  ]);

  // ========================================
  // LIVE LOCATION STATE
  // ========================================

  const [isTrackingLocation, setIsTrackingLocation] =
    useState(false);

  const [hasReceivedLocation, setHasReceivedLocation] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [hasTenantLocation, setHasTenantLocation] =
    useState(false);

  // ========================================
  // CLEAR GEOLOCATION WATCH
  // ========================================

  const clearLocationWatch = () => {
    if (
      watchIdRef.current !== null &&
      geolocationRef.current
    ) {
      geolocationRef.current.clearWatch(
        watchIdRef.current
      );
    }

    watchIdRef.current = null;
    geolocationRef.current = null;
  };

  // ========================================
  // STOP TRACKING
  // ========================================

  const stopLocationTracking = () => {
    trackingSessionRef.current += 1;

    clearLocationWatch();

    setIsTrackingLocation(false);
  };

  // ========================================
  // CLEANUP TRACKING
  // ========================================

  useEffect(() => {
    return () => {
      trackingSessionRef.current += 1;

      if (
        watchIdRef.current !== null &&
        geolocationRef.current
      ) {
        geolocationRef.current.clearWatch(
          watchIdRef.current
        );
      }

      watchIdRef.current = null;
      geolocationRef.current = null;
    };
  }, []);

  // ========================================
  // START LIVE LOCATION
  // ========================================

  const startLocationTracking = () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      setLocationError(
        "Live Location is not supported by this browser. Use a supported browser on localhost or HTTPS."
      );

      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    const geolocation = navigator.geolocation;
    const session = ++trackingSessionRef.current;

    geolocationRef.current = geolocation;

    hasCenteredOnLocationRef.current = false;

    setHasReceivedLocation(false);
    setLocationError("");
    setIsTrackingLocation(true);

    try {
      watchIdRef.current =
        geolocation.watchPosition(
          (position) => {
            if (
              session !== trackingSessionRef.current
            ) {
              return;
            }

            const nextPosition = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };

            latestPositionRef.current = nextPosition;

            setHasTenantLocation(true);
            setLocationError("");

            const map = mapInstanceRef.current;

            if (map) {
              updateTenantLocationLayers(
                map,
                nextPosition,
                accuracyCircleRef,
                tenantMarkerRef,
                tenantLocationLayerRef
              );

              if (
                !hasCenteredOnLocationRef.current
              ) {
                map.setView(
                  [
                    nextPosition.lat,
                    nextPosition.lng,
                  ],
                  Math.max(map.getZoom(), 15)
                );

                hasCenteredOnLocationRef.current =
                  true;
              }
            }

            setHasReceivedLocation(true);
          },
          (error) => {
            if (
              session !== trackingSessionRef.current
            ) {
              return;
            }

            setLocationError(
              getGeolocationErrorMessage(error)
            );

            if (error?.code === 1) {
              trackingSessionRef.current += 1;

              clearLocationWatch();

              setIsTrackingLocation(false);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 1000,
          }
        );
    } catch {
      trackingSessionRef.current += 1;

      clearLocationWatch();

      setIsTrackingLocation(false);

      setLocationError(
        "Unable to start location tracking. Check that your browser allows location access."
      );
    }
  };

  // ========================================
  // RECENTER TENANT LOCATION
  // ========================================

  const recenterOnTenant = () => {
    const position = latestPositionRef.current;
    const map = mapInstanceRef.current;

    if (map && position) {
      map.setView(
        [position.lat, position.lng],
        Math.max(map.getZoom(), 15)
      );
    }
  };

  // ========================================
  // RENDER MAP
  // ========================================

  return (
    <div className="map-view-shell">
      <div
        ref={mapRef}
        className="map-view-container"
      />

      {/* LIVE LOCATION CONTROLS */}

      {enableLiveLocation && (
        <div className="map-live-location-controls">
          <div className="map-live-location-actions">
            {hasTenantLocation && (
              <button
                type="button"
                className="map-location-recenter"
                onClick={recenterOnTenant}
                aria-label="Recenter map on your location"
                title="Recenter map on your location"
              >
                <Crosshair aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              className={`map-location-toggle${
                isTrackingLocation
                  ? " is-tracking"
                  : ""
              }`}
              onClick={
                isTrackingLocation
                  ? stopLocationTracking
                  : startLocationTracking
              }
            >
              {isTrackingLocation ? (
                <>
                  <span
                    className="map-tracking-indicator"
                    aria-hidden="true"
                  />
                  Stop Tracking
                </>
              ) : (
                <>
                  <LocateFixed aria-hidden="true" />
                  Live Location
                </>
              )}
            </button>
          </div>

          {isTrackingLocation && (
            <div
              className="map-location-status"
              role="status"
              aria-live="polite"
            >
              <span
                className="map-tracking-indicator"
                aria-hidden="true"
              />

              {hasReceivedLocation
                ? "Live location is on"
                : "Detecting your location..."}
            </div>
          )}

          {locationError && (
            <div
              className="map-location-error"
              role="alert"
            >
              {locationError}
            </div>
          )}
        </div>
      )}

      {/* APARTMENT POPUP WITH VIEW COUNTS */}

      {activePopup &&
        createPortal(
          <>
            {activePopup.listings.map((apartment) => {
              const apartmentId = String(
                apartment.id
              );

              const apartmentViews =
                viewsByApartment[apartmentId] ?? 0;

              return (
                <div key={apartment.id}>
                  <ApartmentCard
                    apartment={{
                      ...apartment,
                      views: apartmentViews,
                      viewCount: apartmentViews,
                    }}
                    ratingStats={
                      apartment.ratingStats
                    }
                    ratingsLoading={
                      apartment.ratingsLoading
                    }
                  />

                  {/* APARTMENT TOTAL VIEWS */}

                  <div
                    className="map-apartment-views"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "10px 12px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#64748b",
                      borderTop:
                        "1px solid #e2e8f0",
                      background: "#ffffff",
                    }}
                  >
                    <Eye
                      size={16}
                      aria-hidden="true"
                      color="#64748b"
                    />

                    {viewsLoading ? (
                      <span>
                        Loading views...
                      </span>
                    ) : viewsError ? (
                      <span>
                        Views unavailable
                      </span>
                    ) : (
                      <span>
                        {apartmentViews.toLocaleString()}
                        {" "}
                        {apartmentViews === 1
                          ? "view"
                          : "views"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </>,
          activePopup.container
        )}
    </div>
  );
}
