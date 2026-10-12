import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ApartmentCard } from "@/tenant/ApartmentDiscovery";
import { hasValidApartmentCoordinates } from "@/utils/mapCoordinates";
import L from "leaflet";
const singleMarkerIcon = createMarkerIcon("available");
function createMarkerIcon(tone, count = 1) {
    return L.divIcon({
        className: "renti-map-marker",
        html: `
      <div class="map-marker map-marker-${tone}">
        <div class="map-marker-center"></div>
      </div>
      ${count > 1 ? `<div class="map-marker-count">${count}</div>` : ""}
    `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -30],
    });
}
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function getMarkerTone(apartment) {
    if (apartment.markerStatus)
        return apartment.markerStatus;
    const status = apartment.status?.toLowerCase();
    const verificationStatus = apartment.verificationStatus?.toLowerCase();
    if (verificationStatus && ["pending", "under_review", "awaiting_approval"].includes(verificationStatus)) {
        return "pending";
    }
    if (apartment.availabilityStatus === "unavailable" ||
        ["archived", "hidden", "inactive", "rejected", "unpublished", "occupied", "maintenance"].includes(status ?? "") ||
        Number(apartment.availableRooms ?? 0) <= 0) {
        return "hidden";
    }
    return apartment.isVerified ? "available" : "hidden";
}
function getGroupTone(apartments) {
    if (apartments.every((apartment) => getMarkerTone(apartment) === "hidden"))
        return "hidden";
    if (apartments.some((apartment) => getMarkerTone(apartment) === "pending"))
        return "pending";
    if (apartments.some((apartment) => getMarkerTone(apartment) === "available"))
        return "available";
    return "hidden";
}
function groupByCoordinates(apartments) {
    const groups = new globalThis.Map();
    apartments.forEach((apartment) => {
        const key = `${apartment.lat.toFixed(6)},${apartment.lng.toFixed(6)}`;
        groups.set(key, [...(groups.get(key) ?? []), apartment]);
    });
    return Array.from(groups.entries()).map(([key, listings]) => {
        const [lat, lng] = key.split(",").map(Number);
        return { key, lat, lng, listings };
    });
}
export function MapView({ lat, lng, zoom = 13, apartments = [], showSingleMarker = false, emptyMessage = "No apartments found on the map. Try adjusting your filters.", }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [activePopup, setActivePopup] = useState(null);
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current)
            return;
        const map = L.map(mapRef.current).setView([lat, lng], zoom);
        mapInstanceRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        if (showSingleMarker) {
            L.marker([lat, lng], { icon: singleMarkerIcon }).addTo(map).bindPopup("Location");
        }
        else {
            const validApartments = apartments.filter((apartment) => hasValidApartmentCoordinates(apartment.lat, apartment.lng));
            if (validApartments.length === 0) {
                L.popup({ closeButton: false, closeOnClick: false, autoClose: false })
                    .setLatLng([lat, lng])
                    .setContent(`<div class="map-popup-empty">${escapeHtml(emptyMessage)}</div>`)
                    .openOn(map);
            }
            else {
                const groups = groupByCoordinates(validApartments);
                const bounds = L.latLngBounds(groups.map((group) => [group.lat, group.lng]));
                groups.forEach((group) => {
                    const marker = L.marker([group.lat, group.lng], { icon: createMarkerIcon(getGroupTone(group.listings), group.listings.length) }).addTo(map);
                    const container = document.createElement("div");
                    container.className = "map-listing-popup";
                    marker.bindPopup(container, { className: "map-listing-popup-shell", minWidth: 278, maxWidth: 278 });
                    marker.on("popupopen", () => setActivePopup({ container, listings: group.listings }));
                    marker.on("popupclose", () => setActivePopup(current => current?.container === container ? null : current));
                });
                if (groups.length === 1) {
                    map.setView([groups[0].lat, groups[0].lng], Math.max(zoom, 15));
                }
                else {
                    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
                }
            }
        }
        setTimeout(() => map.invalidateSize(), 0);
        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [lat, lng, zoom, apartments, showSingleMarker, emptyMessage]);
    return <><div ref={mapRef} className="map-view-container"/>{activePopup && createPortal(<>{activePopup.listings.map(apartment => <ApartmentCard key={apartment.id} apartment={apartment} ratingStats={apartment.ratingStats} ratingsLoading={apartment.ratingsLoading}/>)}</>, activePopup.container)}</>;
}
