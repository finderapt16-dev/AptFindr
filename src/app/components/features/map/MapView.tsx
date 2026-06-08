import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
// @ts-ignore
import L from "leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with inline SVG data
const iconUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='25' height='41' viewBox='0 0 25 41'%3E%3Cpath fill='%230ea5e9' d='M12.5 0C5.596 0 0 5.596 0 12.5c0 1.996.471 3.96 1.378 5.745l10.855 21.078a.626.626 0 0 0 1.115 0l10.855-21.078A12.428 12.428 0 0 0 25 12.5C25 5.596 19.404 0 12.5 0z'/%3E%3Ccircle fill='%23fff' cx='12.5' cy='12.5' r='7'/%3E%3C/svg%3E";

const customIcon = new L.Icon({
  iconUrl: iconUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface MapViewProps {
  lat: number;
  lng: number;
  zoom?: number;
  apartments?: Array<{
    id: string;
    title: string;
    price: number;
    lat: number;
    lng: number;
    bedrooms: number;
    bathrooms: number;
  }>;
  showSingleMarker?: boolean;
}

export function MapView({
  lat,
  lng,
  zoom = 13,
  apartments = [],
  showSingleMarker = false,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([lat, lng], zoom);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add markers
    if (showSingleMarker) {
      L.marker([lat, lng], { icon: customIcon })
        .addTo(map)
        .bindPopup("Location");
    } else {
      apartments.forEach((apt) => {
        const marker = L.marker([apt.lat, apt.lng], { icon: customIcon }).addTo(map);
        
        const popupContent = `
          <div style="min-width: 150px;">
            <div style="font-weight: 600; margin-bottom: 4px; cursor: pointer;" class="apartment-title" data-id="${apt.id}">
              ${apt.title}
            </div>
            <div style="color: #475569; margin-bottom: 4px;">$${apt.price}/month</div>
            <div style="color: #64748b; font-size: 12px;">
              ${apt.bedrooms} bed • ${apt.bathrooms} bath
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Handle click on popup title
        marker.on('popupopen', () => {
          const titleElement = document.querySelector('.apartment-title');
          if (titleElement) {
            titleElement.addEventListener('click', () => {
              const aptId = titleElement.getAttribute('data-id');
              if (aptId) {
                navigate(`/apartment/${aptId}`);
              }
            });
          }
        });
      });
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, zoom, apartments, showSingleMarker, navigate]);

  return <div ref={mapRef} className="h-full w-full rounded-lg z-0" />;
}

