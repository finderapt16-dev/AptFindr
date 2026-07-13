import { useEffect, useRef, useState } from "react";
// @ts-ignore
import L from "leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";
import { Label } from "../ui/label";

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  addressQuery?: string;
  geocodeRequestKey?: number;
  onGeocodeStatusChange?: (status: "idle" | "loading" | "found" | "not-found" | "error") => void;
}

type GeocodedLocation = {
  lat: number;
  lng: number;
  label: string;
};

const geocodeMemoryCache = new Map<string, GeocodedLocation>();
const GEOCODE_CACHE_PREFIX = "rentiloilo:geocode:";

export function LocationPicker({
  lat,
  lng,
  onLocationChange,
  addressQuery = "",
  geocodeRequestKey = 0,
  onGeocodeStatusChange,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const onGeocodeStatusChangeRef = useRef(onGeocodeStatusChange);
  const [isClient, setIsClient] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "found" | "not-found" | "error">("idle");
  const [matchedAddress, setMatchedAddress] = useState("");

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    onGeocodeStatusChangeRef.current = onGeocodeStatusChange;
  }, [onGeocodeStatusChange]);

  const updateGeocodeStatus = (status: "idle" | "loading" | "found" | "not-found" | "error") => {
    setGeocodeStatus(status);
    onGeocodeStatusChangeRef.current?.(status);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isClient || mapInstanceRef.current) return;

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

    // Handle map click to move marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      marker.setLatLng([newLat, newLng]);
      updateGeocodeStatus("found");
      onLocationChangeRef.current(newLat, newLng);
    });

    // Handle marker drag
    marker.on("dragend", () => {
      const position = marker.getLatLng();
      updateGeocodeStatus("found");
      onLocationChangeRef.current(position.lat, position.lng);
    });

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
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
    if (!isClient || geocodeRequestKey === 0) return;

    const query = addressQuery.trim().replace(/\s+/g, " ");
    if (query.length < 3) {
      updateGeocodeStatus("not-found");
      setMatchedAddress("");
      return;
    }

    const cacheKey = query.toLocaleLowerCase();
    let cached = geocodeMemoryCache.get(cacheKey);
    if (!cached) {
      try {
        const stored = localStorage.getItem(`${GEOCODE_CACHE_PREFIX}${encodeURIComponent(cacheKey)}`);
        if (stored) cached = JSON.parse(stored) as GeocodedLocation;
      } catch {
        // Storage may be unavailable; the in-memory cache still prevents duplicate lookups.
      }
    }

    if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
      geocodeMemoryCache.set(cacheKey, cached);
      updateGeocodeStatus("found");
      setMatchedAddress(cached.label);
      onLocationChangeRef.current(cached.lat, cached.lng);
      return;
    }

    const controller = new AbortController();
    updateGeocodeStatus("loading");
    setMatchedAddress("");

    // Delay each user-triggered lookup so rapid focus changes never flood the public service.
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          format: "jsonv2",
          limit: "1",
          countrycodes: "ph",
          viewbox: "122.50,10.78,122.63,10.64",
          bounded: "1",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          headers: { "Accept-Language": "en" },
        });
        if (!response.ok) throw new Error(`Geocoding failed with status ${response.status}`);

        const results = await response.json() as Array<{ lat?: string; lon?: string; display_name?: string }>;
        const first = results[0];
        const nextLat = Number(first?.lat);
        const nextLng = Number(first?.lon);
        if (!first || !Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
          updateGeocodeStatus("not-found");
          return;
        }

        const location = { lat: nextLat, lng: nextLng, label: first.display_name || query };
        geocodeMemoryCache.set(cacheKey, location);
        try {
          localStorage.setItem(`${GEOCODE_CACHE_PREFIX}${encodeURIComponent(cacheKey)}`, JSON.stringify(location));
        } catch {
          // A successful lookup should still update the map if storage is unavailable.
        }
        updateGeocodeStatus("found");
        setMatchedAddress(location.label);
        onLocationChangeRef.current(location.lat, location.lng);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Unable to locate the entered address:", error);
        updateGeocodeStatus("error");
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [addressQuery, geocodeRequestKey, isClient]);

  if (!isClient) {
    return (
      <div className="w-full h-[400px] bg-slate-100 rounded-lg flex items-center justify-center">
        <p className="text-slate-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Location on Map *</Label>
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-lg overflow-hidden border border-slate-200"
      />
      <p className="text-sm text-slate-500">
        📍 Click anywhere on the map to pinpoint the exact location, or drag the marker
      </p>
      {geocodeStatus === "loading" && <p className="text-sm font-medium text-amber-700">Finding the entered address on the map...</p>}
      {geocodeStatus === "found" && <p className="text-sm font-medium text-emerald-700">Map pinned to: {matchedAddress}</p>}
      {geocodeStatus === "not-found" && <p className="text-sm font-medium text-red-600">We could not find this address on the map. Please check the address or move the marker manually.</p>}
      {geocodeStatus === "error" && <p className="text-sm font-medium text-red-600">The address lookup is temporarily unavailable. You can still click or drag the map pin.</p>}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
        <div>
          <span className="font-medium">Latitude:</span> {lat.toFixed(6)}
        </div>
        <div>
          <span className="font-medium">Longitude:</span> {lng.toFixed(6)}
        </div>
      </div>
    </div>
  );
}

