import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import { ApartmentCard } from "@/app/components/common/ApartmentCard";
import { FilterBar } from "@/app/components/common/FilterBar";
import { MapView } from "@/app/components/features/map/MapView";
import { Button } from "@/app/components/ui/button";
import { LayoutGrid, Map, Sparkles, ArrowLeft } from "lucide-react";
import { rankApartments, getRecommendationExplanation, type TenantPreferences } from "@/app/utils/rankingEngine";
import { useFavorites } from "@/app/hooks/useFavorites";
import { LandlordBrowse } from "./LandlordBrowse";

// Wrapper component to handle role-based routing to prevent hooks issues
function BrowseContent() {
  const { user } = useAuth();

  // Show Landlord Browse page for landlords
  if (user?.role === "landlord") {
    return <LandlordBrowse />;
  }

  // Show tenant browse for students, employees, and others
  return <TenantBrowse />;
}

function TenantBrowse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { apartments: allApartments, isLoading: apartmentsLoading, error: apartmentsError } = useApartmentsContext();
  const { favorites: userFavorites } = useFavorites();

  const readSavedPreferences = () => {
    if (!user) return null;
    try {
      return JSON.parse(localStorage.getItem(`userPreferences_${user.id}`) || "null");
    } catch {
      return null;
    }
  };

  const savedPreferences = readSavedPreferences();
  const urlSearchQuery = searchParams.get("search")?.trim() || "";
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || savedPreferences?.preferredArea || "");
  const [priceRange, setPriceRange] = useState<
    [number, number]
  >([1000, Number(savedPreferences?.maxBudget) || 6000]);
  const [bedrooms, setBedrooms] = useState(savedPreferences?.minBedrooms || "any");
  const [petFriendly, setPetFriendly] = useState(Boolean(savedPreferences?.petFriendly));
  const [parking, setParking] = useState(Boolean(savedPreferences?.parking));
  const [furnished, setFurnished] = useState(Boolean(savedPreferences?.furnished));
  const [sortBy, setSortBy] = useState(savedPreferences?.sortBy || "recommended");
  const [viewMode, setViewMode] = useState<"grid" | "map">(
    "grid",
  );

  useEffect(() => {
    const preferences = readSavedPreferences();
    const queryFromUrl = searchParams.get("search")?.trim() || "";

    if (queryFromUrl) {
      setSearchQuery(queryFromUrl);
      return;
    }

    if (!preferences) return;

    setSearchQuery(preferences.preferredArea || "");
    setPriceRange([1000, Number(preferences.maxBudget) || 6000]);
    setBedrooms(preferences.minBedrooms || "any");
    setPetFriendly(Boolean(preferences.petFriendly));
    setParking(Boolean(preferences.parking));
    setFurnished(Boolean(preferences.furnished));
    setSortBy(preferences.sortBy || "recommended");
  }, [user?.id, searchParams]);

  const filteredApartments = useMemo(() => {
    const filtered = allApartments.filter((apt) => {
      // Only show published apartments to everyone (Browse All shows public listings only)
      // Landlords can view all public properties here, but manage their own in the dashboard
      if (apt.isPublished === false) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          apt.title.toLowerCase().includes(query) ||
          apt.city.toLowerCase().includes(query) ||
          apt.address.toLowerCase().includes(query) ||
          apt.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Price filter
      if (
        apt.price < priceRange[0] ||
        apt.price > priceRange[1]
      ) {
        return false;
      }

      // Bedrooms filter
      if (bedrooms !== "any") {
        const minBeds = parseInt(bedrooms);
        if (apt.bedrooms < minBeds) return false;
      }

      // Amenities filters
      if (petFriendly && !apt.petFriendly) return false;
      if (parking && !apt.parking) return false;
      if (furnished && !apt.furnished) return false;

      return true;
    });

    // Apply sorting based on sortBy preference
    if (sortBy === "recommended") {
      const isTenant = user?.role === "student" || user?.role === "employee";

      if (isTenant) {
        // Use weighted ranking algorithm for tenant browsing
        const preferences: TenantPreferences = {
          maxBudget: priceRange[1],
          preferredArea: searchQuery || undefined,
          petFriendly,
          parking,
          furnished,
          tenantType: user?.role === "student" ? "student" : "employee",
        };

        const rankedApartments = rankApartments(
          filtered,
          preferences,
          userFavorites
        );

        return rankedApartments;
      }

      // For landlords and admins, fall back to a stable default sort
      return filtered.sort((a, b) => new Date(b.availableDate).getTime() - new Date(a.availableDate).getTime());
    }

    return filtered.sort((a, b) => {
      if (sortBy === "price_high") return b.price - a.price;
      if (sortBy === "newest") return new Date(b.availableDate).getTime() - new Date(a.availableDate).getTime();
      if (sortBy === "popular") return Number(b.furnished) - Number(a.furnished) || a.price - b.price;
      return a.price - b.price;
    });
  }, [
    allApartments,
    searchQuery,
    priceRange,
    bedrooms,
    petFriendly,
    parking,
    furnished,
    sortBy,
    user?.role,
    user?.id,
    userFavorites,
  ]);

  // Calculate center for map view (La Paz, Iloilo City center)
  const mapCenter = {
    lat: 10.7202,
    lng: 122.5621,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Back Button */}
      <div className="container mx-auto px-4 pt-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-slate-600 hover:text-amber-600 hover:bg-amber-50 font-bold"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        bedrooms={bedrooms}
        setBedrooms={setBedrooms}
        petFriendly={petFriendly}
        setPetFriendly={setPetFriendly}
        parking={parking}
        setParking={setParking}
        furnished={furnished}
        setFurnished={setFurnished}
      />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-block mb-4 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full shadow-sm">
              <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-2 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Find Your Next Home
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">
              Available <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">Apartments</span>
            </h1>
            <p className="text-slate-700 mt-3 text-lg font-medium">
              {filteredApartments.length}{" "}
              {filteredApartments.length === 1
                ? "apartment"
                : "apartments"}{" "}
              found in La Paz
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Sort Options */}
            <div className="flex gap-2 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-amber-100 shadow-sm flex-wrap justify-end">
              <Button
                variant={sortBy === "recommended" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("recommended")}
                className={`rounded-xl px-4 py-2 transition-all font-bold text-xs ${
                  sortBy === "recommended" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg" 
                    : "text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                }`}
              >
                ⭐ Recommended
              </Button>
              <Button
                variant={sortBy === "price_low" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("price_low")}
                className={`rounded-xl px-4 py-2 transition-all font-bold text-xs ${
                  sortBy === "price_low" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg" 
                    : "text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                }`}
              >
                💰 Price (Low)
              </Button>
              <Button
                variant={sortBy === "price_high" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("price_high")}
                className={`rounded-xl px-4 py-2 transition-all font-bold text-xs ${
                  sortBy === "price_high" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg" 
                    : "text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                }`}
              >
                💰 Price (High)
              </Button>
              <Button
                variant={sortBy === "newest" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("newest")}
                className={`rounded-xl px-4 py-2 transition-all font-bold text-xs ${
                  sortBy === "newest" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg" 
                    : "text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                }`}
              >
                📅 Newest
              </Button>
              <Button
                variant={sortBy === "popular" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("popular")}
                className={`rounded-xl px-4 py-2 transition-all font-bold text-xs ${
                  sortBy === "popular" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg" 
                    : "text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                }`}
              >
                🔥 Popular
              </Button>
            </div>

            {/* View Mode Buttons */}
            <div className="flex gap-3 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-amber-100 shadow-sm">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-xl px-6 py-2 transition-all font-bold ${
                  viewMode === "grid" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-orange-300/50" 
                    : "text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                }`}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className={`rounded-xl px-6 py-2 transition-all font-bold ${
                  viewMode === "map" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-orange-300/50" 
                    : "text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                }`}
              >
                <Map className="h-4 w-4 mr-2" />
                Map
              </Button>
            </div>
          </div>
        </div>

        {apartmentsLoading ? (
          <div className="text-center py-20 text-slate-600 font-medium">Loading apartments from database...</div>
        ) : apartmentsError ? (
          <div className="text-center py-20 text-red-600 font-medium">{apartmentsError}</div>
        ) : filteredApartments.length === 0 ? (
          <div className="text-center py-20 bg-white/60 backdrop-blur-xl rounded-3xl border-2 border-dashed border-amber-200">
            <p className="text-2xl font-bold text-slate-900">
              No apartments match your filters.
            </p>
            <p className="text-slate-600 mt-2">
              Try adjusting your search criteria to find your perfect home.
            </p>
            <Button 
              className="mt-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl px-8"
              onClick={() => {
                setSearchQuery("");
                setPriceRange([1000, 6000]);
                setBedrooms("any");
                setPetFriendly(false);
                setParking(false);
                setFurnished(false);
                setSortBy("recommended");
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredApartments.map((apartment) => (
              <div key={apartment.id} className="hover:transform hover:scale-[1.02] transition-all duration-300">
                <ApartmentCard
                  apartment={apartment}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[calc(100vh-350px)] min-h-[550px] rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
            <MapView
              lat={mapCenter.lat}
              lng={mapCenter.lng}
              zoom={12}
              apartments={filteredApartments.map((apt) => ({
                id: apt.id,
                title: apt.title,
                price: apt.price,
                lat: apt.lat,
                lng: apt.lng,
                bedrooms: apt.bedrooms,
                bathrooms: apt.bathrooms,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function Home() {
  return <BrowseContent />;
}
