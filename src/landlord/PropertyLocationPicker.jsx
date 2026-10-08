import "./PropertyLocationPicker.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Label } from "../components/ui/label";
import { geocodeAddPropertyAddressWithinLaPaz, reverseGeocodeAddPropertyLocationWithinLaPaz, GeocodingError } from "../services/geocodingService";
// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});
export function PropertyLocationPicker({ lat, lng, onLocationChange, addressQuery = "", geocodeRequestKey = 0, onGeocodeStatusChange, onMapAddressChange, }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const onLocationChangeRef = useRef(onLocationChange);
    const onGeocodeStatusChangeRef = useRef(onGeocodeStatusChange);
    const onMapAddressChangeRef = useRef(onMapAddressChange);
    const reverseControllerRef = useRef(null);
    const forwardControllerRef = useRef(null);
    const reverseRequestRef = useRef(0);
    const forwardRequestRef = useRef(0);
    const [isClient, setIsClient] = useState(false);
    const [geocodeStatus, setGeocodeStatus] = useState("idle");
    const [matchedAddress, setMatchedAddress] = useState("");
    const [geocodeMessage, setGeocodeMessage] = useState("");
    useEffect(() => {
        onLocationChangeRef.current = onLocationChange;
    }, [onLocationChange]);
    useEffect(() => {
        onGeocodeStatusChangeRef.current = onGeocodeStatusChange;
    }, [onGeocodeStatusChange]);
    useEffect(() => {
        onMapAddressChangeRef.current = onMapAddressChange;
    }, [onMapAddressChange]);
    const updateGeocodeStatus = (status, message = "") => {
        setGeocodeStatus(status);
        setGeocodeMessage(message);
        onGeocodeStatusChangeRef.current?.(status, message);
    };
    useEffect(() => {
        setIsClient(true);
    }, []);
    useEffect(() => {
        if (!mapRef.current || !isClient || mapInstanceRef.current)
            return;
        // Initialize map
        const map = L.map(mapRef.current).setView([lat, lng], 15);
        mapInstanceRef.current = map;
        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        // Add initial marker
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current = marker;
        const selectMapPoint = async (newLat, newLng) => {
            const requestId = ++reverseRequestRef.current;
            marker.setLatLng([newLat, newLng]);
            // A map selection is newer than a pending address lookup. Abort it
            // before it has a chance to move the marker back to an old address.
            forwardRequestRef.current += 1;
            forwardControllerRef.current?.abort();
            reverseControllerRef.current?.abort();
            const controller = new AbortController();
            reverseControllerRef.current = controller;
            updateGeocodeStatus("loading");
            // Coordinates are authoritative immediately, even while Nominatim
            // is resolving the address fields for this exact point.
            onLocationChangeRef.current(newLat, newLng, { source: "map", verified: false });
            try {
                const location = await reverseGeocodeAddPropertyLocationWithinLaPaz(newLat, newLng, controller.signal);
                if (requestId !== reverseRequestRef.current)
                    return;
                setMatchedAddress(location.label);
                updateGeocodeStatus("found");
                onMapAddressChangeRef.current?.(location);
            }
            catch (error) {
                if (error instanceof DOMException && error.name === "AbortError")
                    return;
                if (requestId !== reverseRequestRef.current)
                    return;
                console.error("Unable to identify the selected map location:", error);
                // Keep the selected pin visible. The parent marks it invalid for
                // submission until a location inside La Paz is selected.
                onMapAddressChangeRef.current?.({
                    street: "",
                    barangay: "",
                    barangayVerified: false,
                    barangayCandidate: "",
                    district: "La Paz",
                    city: "Iloilo City",
                    zip: "5000",
                    unresolved: true,
                });
                updateGeocodeStatus(error instanceof GeocodingError && error.reason === "outside-scope" ? "outside-scope" : error instanceof GeocodingError && error.reason !== "network" ? "not-found" : "error", error instanceof Error ? error.message : "Unable to identify this map location.");
            }
        };
        // Handle map click to move marker
        map.on("click", (e) => {
            const { lat: newLat, lng: newLng } = e.latlng;
            void selectMapPoint(newLat, newLng);
        });
        // Handle marker drag
        marker.on("dragend", () => {
            const position = marker.getLatLng();
            void selectMapPoint(position.lat, position.lng);
        });
        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            reverseControllerRef.current?.abort();
            forwardControllerRef.current?.abort();
        };
    }, [isClient]);
    // Update marker position when lat/lng props change
    useEffect(() => {
        if (markerRef.current && mapInstanceRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
        }
    }, [lat, lng]);
    useEffect(() => {
        if (!isClient || geocodeRequestKey === 0)
            return;
        const query = addressQuery.trim().replace(/\s+/g, " ");
        if (query.length < 3) {
            updateGeocodeStatus("not-found");
            setMatchedAddress("");
            return;
        }
        const requestId = ++forwardRequestRef.current;
        forwardControllerRef.current?.abort();
        const controller = new AbortController();
        forwardControllerRef.current = controller;
        updateGeocodeStatus("loading");
        setMatchedAddress("");
        // Delay each user-triggered lookup so rapid focus changes never flood the public service.
        const timer = window.setTimeout(async () => {
            try {
                const location = await geocodeAddPropertyAddressWithinLaPaz(query, controller.signal);
                if (requestId !== forwardRequestRef.current)
                    return;
                updateGeocodeStatus("found");
                setMatchedAddress(location.label);
                onLocationChangeRef.current(location.lat, location.lng, {
                    source: "address",
                    locationResolved: true,
                    coverageVerified: Boolean(location.coverageVerified),
                });
            }
            catch (error) {
                if (error instanceof DOMException && error.name === "AbortError")
                    return;
                if (requestId !== forwardRequestRef.current)
                    return;
                console.error("Unable to locate the entered address:", error);
                updateGeocodeStatus(error instanceof GeocodingError && error.reason === "outside-scope" ? "outside-scope" : error instanceof GeocodingError && error.reason !== "network" ? "not-found" : "error", error instanceof Error ? error.message : "Unable to locate this address.");
            }
        }, 500);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [addressQuery, geocodeRequestKey, isClient]);
    if (!isClient) {
        return (<div className="location-picker-row">
        <p className="location-picker-loading-map">Loading map...</p>
      </div>);
    }
    return (<div className="location-picker-panel">
      <Label>Location on Map *</Label>
      <div ref={mapRef} className="location-picker-card"/>
      <p className="location-picker-text">
        Click the map or drag the pin to select the apartment's exact location.
      </p>
      {geocodeStatus === "loading" && <p className="location-picker-text-2">Finding the entered address on the map...</p>}
      {geocodeStatus === "found" && matchedAddress && <p className="location-picker-map-pinned-to">Map pinned to: {matchedAddress}</p>}
      {geocodeStatus === "not-found" && <p className="location-picker-text-3">We could not find this address on the map. Please check the address or move the marker manually.</p>}
      {geocodeStatus === "outside-scope" && <p className="location-picker-text-3">{geocodeMessage || "This location is outside AptFindr's supported La Paz area."}</p>}
      {geocodeStatus === "error" && <p className="location-picker-text-3">The address lookup is temporarily unavailable. You can still click or drag the map pin.</p>}
      <div className="location-picker-grid">
        <div>
          <span className="location-picker-latitude">Latitude:</span> {lat.toFixed(6)}
        </div>
        <div>
          <span className="location-picker-longitude">Longitude:</span> {lng.toFixed(6)}
        </div>
      </div>
    </div>);
}
