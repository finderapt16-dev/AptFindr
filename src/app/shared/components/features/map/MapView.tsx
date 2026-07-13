import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { hasValidApartmentCoordinates } from "@/app/shared/utils/mapCoordinates";
// @ts-ignore
import L from "leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";

const markerColors = {
  available: "#2563eb",
  pending: "#facc15",
  hidden: "#94a3b8",
};

interface MapApartmentMarker {
  id: string;
  title: string;
  price: number;
  lat: number;
  lng: number;
  bedrooms: number;
  bathrooms: number;
  image?: string;
  location?: string;
  availableRooms?: number;
  status?: string;
  isVerified?: boolean;
  verificationStatus?: string;
  availabilityStatus?: "available" | "unavailable";
  markerStatus?: "available" | "pending" | "hidden";
}

interface MapViewProps {
  lat: number;
  lng: number;
  zoom?: number;
  apartments?: MapApartmentMarker[];
  showSingleMarker?: boolean;
  emptyMessage?: string;
}

const singleMarkerIcon = createMarkerIcon(markerColors.available);

function createMarkerIcon(color: string, count = 1) {
  return L.divIcon({
    className: "renti-map-marker",
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 9999px 9999px 9999px 4px;
        background: ${color};
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 12px 24px rgba(15,23,42,.28);
        display: grid;
        place-items: center;
      ">
        <div style="
          width: 11px;
          height: 11px;
          border-radius: 9999px;
          background: white;
          opacity: .96;
          transform: rotate(45deg);
          display: grid;
          place-items: center;
          color: ${color};
          font-size: 10px;
          font-weight: 900;
        "></div>
      </div>
      ${count > 1 ? `
        <div style="
          position: absolute;
          top: -8px;
          right: -10px;
          min-width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: #0f172a;
          color: white;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          box-shadow: 0 8px 18px rgba(15,23,42,.25);
        ">${count}</div>
      ` : ""}
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getMarkerColor(apartment: MapApartmentMarker) {
  if (apartment.markerStatus === "available") return markerColors.available;
  if (apartment.markerStatus === "pending") return markerColors.pending;
  if (apartment.markerStatus === "hidden") return markerColors.hidden;

  const status = apartment.status?.toLowerCase();
  const verificationStatus = apartment.verificationStatus?.toLowerCase();

  if (verificationStatus && ["pending", "under_review", "awaiting_approval"].includes(verificationStatus)) {
    return markerColors.pending;
  }

  if (
    apartment.availabilityStatus === "unavailable" ||
    ["archived", "hidden", "inactive", "rejected", "unpublished", "occupied", "reserved", "maintenance"].includes(status ?? "") ||
    Number(apartment.availableRooms ?? 0) <= 0
  ) {
    return markerColors.hidden;
  }

  if (apartment.isVerified) return markerColors.available;

  return markerColors.hidden;
}

function getGroupColor(apartments: MapApartmentMarker[]) {
  if (apartments.every((apartment) => getMarkerColor(apartment) === markerColors.hidden)) return markerColors.hidden;
  if (apartments.some((apartment) => getMarkerColor(apartment) === markerColors.pending)) return markerColors.pending;
  if (apartments.some((apartment) => getMarkerColor(apartment) === markerColors.available)) return markerColors.available;
  return markerColors.hidden;
}

function groupByCoordinates(apartments: MapApartmentMarker[]) {
  const groups = new globalThis.Map<string, MapApartmentMarker[]>();

  apartments.forEach((apartment) => {
    const key = `${apartment.lat.toFixed(6)},${apartment.lng.toFixed(6)}`;
    groups.set(key, [...(groups.get(key) ?? []), apartment]);
  });

  return Array.from(groups.entries()).map(([key, listings]) => {
    const [lat, lng] = key.split(",").map(Number);
    return { key, lat, lng, listings };
  });
}

function buildPopup(apartment: MapApartmentMarker) {
  const image = apartment.image
    ? `<img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.title)}" style="height: 86px; width: 100%; object-fit: cover; border-radius: 10px; margin-bottom: 10px;" />`
    : `<div style="height: 86px; width: 100%; border-radius: 10px; margin-bottom: 10px; background: #f1f5f9; display: grid; place-items: center; color: #94a3b8; font-weight: 800;">No image</div>`;
  const availableRooms = Number(apartment.availableRooms ?? 0);
  const verifiedBadge = apartment.isVerified
    ? `<span style="border-radius: 999px; background: #dbeafe; color: #1d4ed8; padding: 4px 8px; font-size: 11px; font-weight: 800;">Verified</span>`
    : `<span style="border-radius: 999px; background: #f1f5f9; color: #64748b; padding: 4px 8px; font-size: 11px; font-weight: 800;">Unverified</span>`;

  return `
    <div style="width: 240px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      ${image}
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
        <div style="min-width: 0;">
          <div style="font-weight: 900; color: #0f172a; font-size: 15px; line-height: 1.25;">${escapeHtml(apartment.title)}</div>
          <div style="color: #64748b; margin-top: 5px; font-size: 12px; line-height: 1.35;">${escapeHtml(apartment.location || "")}</div>
        </div>
        <div style="font-weight: 900; color: #ea580c; white-space: nowrap;">View room prices</div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px;">
        ${verifiedBadge}
        <span style="border-radius: 999px; background: ${availableRooms > 0 ? "#dcfce7" : "#fee2e2"}; color: ${availableRooms > 0 ? "#166534" : "#991b1b"}; padding: 4px 8px; font-size: 11px; font-weight: 800;">
          ${availableRooms} ${availableRooms === 1 ? "room" : "rooms"} available
        </span>
      </div>
      <div style="display: flex; gap: 12px; color: #64748b; font-size: 12px; margin-top: 10px;">
        <span>${Number(apartment.bedrooms || 0)} bed</span>
        <span>${Number(apartment.bathrooms || 0)} bath</span>
      </div>
      <button type="button" class="map-view-details" data-id="${escapeHtml(apartment.id)}" style="margin-top: 12px; width: 100%; height: 38px; border: 0; border-radius: 9px; background: #f97316; color: white; font-weight: 900; cursor: pointer;">
        View Details
      </button>
    </div>
  `;
}

function buildGroupPopup(apartments: MapApartmentMarker[]) {
  if (apartments.length === 1) return buildPopup(apartments[0]);

  const items = apartments.map((apartment) => {
    const availableRooms = Number(apartment.availableRooms ?? 0);
    const verifiedBadge = apartment.isVerified
      ? `<span style="border-radius: 999px; background: #dbeafe; color: #1d4ed8; padding: 3px 7px; font-size: 10px; font-weight: 800;">Verified</span>`
      : `<span style="border-radius: 999px; background: #f1f5f9; color: #64748b; padding: 3px 7px; font-size: 10px; font-weight: 800;">Unverified</span>`;

    return `
      <div style="display: grid; grid-template-columns: 58px 1fr; gap: 10px; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
        ${apartment.image
          ? `<img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.title)}" style="height: 54px; width: 58px; object-fit: cover; border-radius: 8px;" />`
          : `<div style="height: 54px; width: 58px; border-radius: 8px; background: #f1f5f9;"></div>`}
        <div style="min-width: 0;">
          <div style="font-weight: 900; color: #0f172a; font-size: 13px; line-height: 1.25;">${escapeHtml(apartment.title)}</div>
          <div style="margin-top: 3px; color: #ea580c; font-weight: 900; font-size: 12px;">View room prices</div>
          <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px;">
            ${verifiedBadge}
            <span style="border-radius: 999px; background: ${availableRooms > 0 ? "#dcfce7" : "#fee2e2"}; color: ${availableRooms > 0 ? "#166534" : "#991b1b"}; padding: 3px 7px; font-size: 10px; font-weight: 800;">${availableRooms} rooms</span>
          </div>
          <button type="button" class="map-view-details" data-id="${escapeHtml(apartment.id)}" style="margin-top: 8px; height: 30px; border: 0; border-radius: 7px; background: #f97316; color: white; font-weight: 900; cursor: pointer; padding: 0 10px; font-size: 12px;">
            View Details
          </button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div style="width: 285px; max-height: 360px; overflow-y: auto; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="font-weight: 900; color: #0f172a; font-size: 14px; margin-bottom: 4px;">${apartments.length} apartments at this location</div>
      <div style="color: #64748b; font-size: 12px; margin-bottom: 4px;">These listings share the same landlord-submitted coordinates.</div>
      ${items}
    </div>
  `;
}

export function MapView({
  lat,
  lng,
  zoom = 13,
  apartments = [],
  showSingleMarker = false,
  emptyMessage = "No apartments found on the map. Try adjusting your filters.",
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([lat, lng], zoom);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (showSingleMarker) {
      L.marker([lat, lng], { icon: singleMarkerIcon }).addTo(map).bindPopup("Location");
    } else {
      const validApartments = apartments.filter((apartment) => hasValidApartmentCoordinates(apartment.lat, apartment.lng));

      if (validApartments.length === 0) {
        L.popup({ closeButton: false, closeOnClick: false, autoClose: false })
          .setLatLng([lat, lng])
          .setContent(`<div style="max-width: 240px; font-weight: 800; color: #475569;">${escapeHtml(emptyMessage)}</div>`)
          .openOn(map);
      } else {
        const groups = groupByCoordinates(validApartments);
        const bounds = L.latLngBounds(groups.map((group) => [group.lat, group.lng]));

        groups.forEach((group) => {
          const marker = L.marker([group.lat, group.lng], { icon: createMarkerIcon(getGroupColor(group.listings), group.listings.length) }).addTo(map);
          marker.bindPopup(buildGroupPopup(group.listings));

          marker.on("popupopen", () => {
            const popupElement = marker.getPopup()?.getElement();
            popupElement?.querySelectorAll(".map-view-details").forEach((detailsButton) => {
              detailsButton.addEventListener("click", () => {
                const apartmentId = detailsButton.getAttribute("data-id");
                if (apartmentId) navigate(`/apartment/${apartmentId}`);
              });
            });
          });
        });

        if (groups.length === 1) {
          map.setView([groups[0].lat, groups[0].lng], Math.max(zoom, 15));
        } else {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
        }
      }
    }

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, zoom, apartments, showSingleMarker, navigate, emptyMessage]);

  return <div ref={mapRef} className="h-full w-full rounded-lg z-0" />;
}
