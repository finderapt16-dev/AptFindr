import {
  Bath,
  Bed,
  Bookmark,
  Building2,
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  Flame,
  Grid2X2,
  Heart,
  HelpCircle,
  Home as HomeIcon,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  Map,
  MapPin,
  PawPrint,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sofa,
  Sparkles,
  Square,
  Star,
  Tag,
  TrendingUp,
  TriangleAlert
} from "lucide-react";
import { LogoutConfirmation } from "@/app/components/common/LogoutConfirmation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { VerifiedBadge } from "@/app/components/common/VerifiedBadge";
import { MapView } from "@/app/components/features/map/MapView";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import { useAuth } from "@/app/contexts/AuthContext";
import type { Apartment } from "@/app/data/apartments";
import { useFavorites } from "@/app/hooks/useFavorites";
import {
  fetchApartmentViews,
  fetchFavorites as fetchDashboardFavorites,
  fetchTenantPreferences,
  getCachedTenantPreferences,
  saveTenantPreferences,
  type DashboardApartmentViewRow,
  type DashboardFavoriteRow,
  type TenantPreferenceSortOption,
} from "@/app/services/dashboardSupabaseService";
import { getImageUrl } from "@/app/utils/images";
import {
  getAvailableRoomCount,
  getLowestAvailableRoomPrice,
  isTenantVisibleApartment,
} from "@/app/utils/listingVisibility";
import { rankApartments, type TenantPreferences } from "@/app/utils/rankingEngine";
import { toast } from "sonner";
import { LandlordBrowse } from "./LandlordBrowse";

type SortOption = TenantPreferenceSortOption;

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Maintenance",
};

const STATUS_CLASS: Record<string, string> = {
  available: "bg-emerald-600 text-white",
  occupied: "bg-rose-600 text-white",
  reserved: "bg-amber-500 text-white",
  maintenance: "bg-slate-600 text-white",
};

function BrowseContent() {
  const { user } = useAuth();

  if (user?.role === "landlord") {
    return <LandlordBrowse />;
  }

  return <TenantBrowse />;
}

function TenantBrowse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, users, logout } = useAuth();
  const { apartments: allApartments, isLoading: apartmentsLoading, error: apartmentsError } = useApartmentsContext();
  const { favorites: userFavorites, isFavorite, toggleFavorite } = useFavorites();

  const readSavedPreferences = () => getCachedTenantPreferences(user?.id);

  const savedPreferences = readSavedPreferences();
  const urlSearchQuery = searchParams.get("search")?.trim() || "";
  const initialPriceRange: [number, number] = [
    1000,
    savedPreferences?.saveBudgetPreferences === false ? 6000 : Number(savedPreferences?.maxBudget) || 6000,
  ];
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || savedPreferences?.preferredArea || "");
  const [priceRange, setPriceRange] = useState<[number, number]>(initialPriceRange);
  const [minPriceInput, setMinPriceInput] = useState(String(initialPriceRange[0]));
  const [maxPriceInput, setMaxPriceInput] = useState(String(initialPriceRange[1]));
  const [bedrooms, setBedrooms] = useState(savedPreferences?.minBedrooms || "any");
  const [petFriendly, setPetFriendly] = useState(Boolean(savedPreferences?.petFriendly));
  const [parking, setParking] = useState(Boolean(savedPreferences?.parking));
  const [furnished, setFurnished] = useState(Boolean(savedPreferences?.furnished));
  const [sortBy, setSortBy] = useState<SortOption>(savedPreferences?.sortBy || "recommended");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [viewRows, setViewRows] = useState<DashboardApartmentViewRow[]>([]);
  const [favoriteRows, setFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const applyPriceRange = (range: [number, number]) => {
    setPriceRange(range);
    setMinPriceInput(String(range[0]));
    setMaxPriceInput(String(range[1]));
  };

  useEffect(() => {
    let mounted = true;

    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
      return;
    }

    if (!user?.id) return;

    void fetchTenantPreferences(user.id)
      .then((preferences) => {
        if (!mounted || !preferences) return;
        setSearchQuery(preferences.preferredArea || "");
        applyPriceRange([1000, preferences.saveBudgetPreferences ? Number(preferences.maxBudget) || 6000 : 6000]);
        setBedrooms(preferences.minBedrooms || "any");
        setPetFriendly(Boolean(preferences.petFriendly));
        setParking(Boolean(preferences.parking));
        setFurnished(Boolean(preferences.furnished));
        setSortBy(preferences.sortBy || "recommended");
      })
      .catch(() => {
        if (!mounted) return;
        toast.error("Unable to load saved browse preferences.");
      });

    return () => {
      mounted = false;
    };
  }, [user?.id, urlSearchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, priceRange, bedrooms, petFriendly, parking, furnished, sortBy, itemsPerPage]);

  useEffect(() => {
    let mounted = true;

    void Promise.all([fetchApartmentViews(), fetchDashboardFavorites()])
      .then(([views, favorites]) => {
        if (!mounted) return;
        setViewRows(views);
        setFavoriteRows(favorites);
      })
      .catch(() => {
        if (!mounted) return;
        setViewRows([]);
        setFavoriteRows([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isApartmentAvailable = isTenantVisibleApartment;
  const getAvailableRooms = getAvailableRoomCount;

  const getViewCount = (apartmentId: string) =>
    viewRows
      .filter((view) => (view.apartment_id ?? view.apartmentId) === apartmentId)
      .reduce((total, view) => total + (Number(view.view_count) || 1), 0);

  const getFavoriteCount = (apartmentId: string) =>
    favoriteRows.filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === apartmentId).length;

  const landlordById = useMemo(() => new globalThis.Map(users.filter((row) => row.id).map((row) => [row.id!, row])), [users]);

  const getLandlord = (apartment: Apartment) => apartment.landlordId ? landlordById.get(apartment.landlordId) : undefined;

  const isVerifiedListing = (apartment: Apartment) => {
    if (typeof apartment.landlordVerified === "boolean") return apartment.landlordVerified;
    const landlord = getLandlord(apartment);
    return landlord?.isVerified === true;
  };

  const getVerificationStatus = (apartment: Apartment) => {
    return isVerifiedListing(apartment) ? "verified" : "pending";
  };

  const filteredApartments = useMemo(() => {
    const filtered = allApartments.filter((apt) => {
      if (apt.isPublished === false) return false;
      if (!isApartmentAvailable(apt)) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          apt.title.toLowerCase().includes(query) ||
          apt.city.toLowerCase().includes(query) ||
          apt.address.toLowerCase().includes(query) ||
          apt.description.toLowerCase().includes(query) ||
          apt.amenities.some((amenity) => amenity.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      const roomPrice = getLowestAvailableRoomPrice(apt);
      if (roomPrice !== null && (roomPrice < priceRange[0] || roomPrice > priceRange[1])) return false;

      if (bedrooms !== "any") {
        const minBeds = parseInt(bedrooms);
        if (Number.isFinite(minBeds) && apt.bedrooms < minBeds) return false;
      }

      if (petFriendly && !apt.petFriendly) return false;
      if (parking && !apt.parking) return false;
      if (furnished && !apt.furnished) return false;

      return true;
    });

    if (sortBy === "recommended") {
      const isTenant = user?.role === "student" || user?.role === "employee";

      if (isTenant) {
        const preferences: TenantPreferences = {
          maxBudget: priceRange[1],
          preferredArea: searchQuery || undefined,
          petFriendly,
          parking,
          furnished,
          tenantType: user?.role === "student" ? "student" : "employee",
        };

        const apartmentViewCounts = new globalThis.Map<string, number>();
        viewRows.forEach((row) => {
          const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
          if (apartmentId) apartmentViewCounts.set(apartmentId, (apartmentViewCounts.get(apartmentId) ?? 0) + (Number(row.view_count) || 1));
        });
        const apartmentFavoriteCounts = new globalThis.Map<string, number>();
        favoriteRows.forEach((row) => {
          const apartmentId = row.apartment_id ?? row.apartmentId ?? "";
          if (apartmentId) apartmentFavoriteCounts.set(apartmentId, (apartmentFavoriteCounts.get(apartmentId) ?? 0) + 1);
        });
        return rankApartments(filtered, preferences, userFavorites, { apartmentViewCounts, apartmentFavoriteCounts });
      }

      return filtered.sort((a, b) => new Date(b.availableDate).getTime() - new Date(a.availableDate).getTime());
    }

    return filtered.sort((a, b) => {
      if (sortBy === "price_high") return (getLowestAvailableRoomPrice(b) ?? -1) - (getLowestAvailableRoomPrice(a) ?? -1);
      if (sortBy === "newest") return new Date(b.availableDate).getTime() - new Date(a.availableDate).getTime();
      if (sortBy === "popular") {
        const leftEngagement = getViewCount(a.id) + getFavoriteCount(a.id) * 2;
        const rightEngagement = getViewCount(b.id) + getFavoriteCount(b.id) * 2;
        return rightEngagement - leftEngagement || new Date(b.availableDate).getTime() - new Date(a.availableDate).getTime();
      }
      return (getLowestAvailableRoomPrice(a) ?? Number.MAX_SAFE_INTEGER) - (getLowestAvailableRoomPrice(b) ?? Number.MAX_SAFE_INTEGER);
    });
  }, [allApartments, searchQuery, priceRange, bedrooms, petFriendly, parking, furnished, sortBy, user?.role, landlordById, userFavorites, viewRows, favoriteRows]);

  const totalPages = Math.max(1, Math.ceil(filteredApartments.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * itemsPerPage;
  const paginatedApartments = filteredApartments.slice(pageStart, pageStart + itemsPerPage);
  const activeFilterCount = [petFriendly, parking, furnished, bedrooms !== "any", priceRange[0] !== 1000 || priceRange[1] !== 6000].filter(Boolean).length;
  const mappedApartmentCount = filteredApartments.filter((apartment) => Number.isFinite(apartment.lat) && Number.isFinite(apartment.lng) && !(apartment.lat === 0 && apartment.lng === 0)).length;
  const realPriceValues = useMemo(
    () =>
      allApartments
        .filter(isTenantVisibleApartment)
        .flatMap((apt) => (apt.rooms ?? []).map((room) => Number(room.price)))
        .filter((price) => Number.isFinite(price) && price > 0),
    [allApartments],
  );
  const quickBudgetChips = useMemo(() => {
    if (!realPriceValues.length) return [];

    const minPrice = Math.min(...realPriceValues);
    const maxPrice = Math.max(...realPriceValues);

    if (minPrice === maxPrice) {
      return [{ label: `₱${minPrice.toLocaleString("en-PH")}`, value: [minPrice, maxPrice] as [number, number] }];
    }

    const roundPrice = (value: number) => Math.round(value / 100) * 100;
    const step = (maxPrice - minPrice) / 4;

    return Array.from({ length: 4 }, (_, index) => {
      const start = index === 0 ? minPrice : roundPrice(minPrice + step * index);
      const end = index === 3 ? maxPrice : roundPrice(minPrice + step * (index + 1));
      return {
        label: index === 3 ? `₱${start.toLocaleString("en-PH")}+` : `₱${start.toLocaleString("en-PH")} - ₱${end.toLocaleString("en-PH")}`,
        value: [start, end] as [number, number],
      };
    });
  }, [realPriceValues]);

  const mapCenter = { lat: 10.7202, lng: 122.5621 };
  const displayName = user?.name?.trim();
  const portalLabel = user?.role === "student" ? "Student Portal" : "Employee Portal";

  const resetFilters = () => {
    setSearchQuery("");
    applyPriceRange([1000, 6000]);
    setBedrooms("any");
    setPetFriendly(false);
    setParking(false);
    setFurnished(false);
    setSortBy("recommended");
  };

  const restoreSavedPreferences = async () => {
    if (!user?.id) {
      toast.error("Please sign in to restore browse preferences.");
      return;
    }

    const preferences = await fetchTenantPreferences(user.id);

    if (!preferences) {
      toast.error("No saved browse preferences yet.");
      return;
    }

    setSearchQuery(preferences.preferredArea || "");
    applyPriceRange([1000, preferences.saveBudgetPreferences ? Number(preferences.maxBudget) || 6000 : 6000]);
    setBedrooms(preferences.minBedrooms || "any");
    setPetFriendly(Boolean(preferences.petFriendly));
    setParking(Boolean(preferences.parking));
    setFurnished(Boolean(preferences.furnished));
    setSortBy(preferences.sortBy || "recommended");
    toast.success("Saved browse preferences restored.");
  };

  const saveBrowsePreferences = async () => {
    if (!user?.id) {
      toast.error("Please sign in to save browse preferences.");
      return;
    }

    if (!minPriceInput.trim() || !maxPriceInput.trim()) {
      toast.error("Please enter both minimum and maximum price.");
      return;
    }

    if (priceRange[0] > priceRange[1]) {
      toast.error("Minimum price cannot be higher than maximum price.");
      return;
    }

    try {
      await saveTenantPreferences(user.id, {
        preferredArea: searchQuery.trim(),
        maxBudget: priceRange[1],
        minBedrooms: bedrooms,
        petFriendly,
        parking,
        furnished,
        sortBy,
        saveBudgetPreferences: true,
      });
      toast.success("Browse preferences saved.");
      setPreferencesOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save browse preferences.";
      toast.error(message);
    }
  };

  const updateMinimumPrice = (value: string) => {
    setMinPriceInput(value);
    if (!value.trim()) return;
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setPriceRange((current) => [Math.max(0, next), current[1]]);
  };

  const updateMaximumPrice = (value: string) => {
    setMaxPriceInput(value);
    if (!value.trim()) return;
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setPriceRange((current) => [current[0], Math.max(0, next)]);
  };

  const handleLogout = () => {
    logout?.();
    navigate("/");
  };

  const SidebarLink = ({
    icon: Icon,
    label,
    href,
    active,
    badge,
  }: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    href: string;
    active?: boolean;
    badge?: number;
  }) => (
    <Link
      to={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition ${
        active ? "bg-orange-500 text-white shadow-lg shadow-orange-950/25" : "text-white/65 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
          {badge}
        </span>
      )}
    </Link>
  );

  const renderFilterTrigger = (floating = false) => (
    <DialogTrigger asChild>
      <Button className={floating ? "h-14 w-14 rounded-full bg-orange-500 p-0 text-white shadow-xl hover:bg-orange-600" : "h-12 rounded-lg border border-slate-200 bg-white px-5 font-black text-slate-800 shadow-sm hover:bg-slate-50"} variant={floating ? "default" : "outline"}>
        <SlidersHorizontal className={floating ? "h-5 w-5" : "mr-2 h-4 w-4"} />
        {!floating && `Preferences${activeFilterCount ? ` (${activeFilterCount})` : ""}`}
      </Button>
    </DialogTrigger>
  );

  const renderFilterContent = () => (
      <DialogContent
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] overflow-y-auto rounded-lg border-slate-200 bg-white p-0 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:max-w-4xl"
      >
        <div className="space-y-6 p-6 sm:p-8" onClick={(event) => event.stopPropagation()}>
          <DialogHeader className="pr-10 text-left">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <SlidersHorizontal className="h-8 w-8" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tight text-slate-950">Browse Preferences</DialogTitle>
                <DialogDescription className="mt-2 max-w-xl text-base font-semibold leading-7 text-slate-500">
                  Filter listings and save this setup as your default Browse All preference.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <section className="overflow-hidden rounded-lg border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-orange-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white text-orange-500 shadow-sm">
                <HomeIcon className="h-10 w-10" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-black text-slate-950">Make Browse All fit you</h3>
                <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  Your saved preferences will be applied automatically whenever you open Browse All.
                </p>
              </div>
              <div className="hidden h-24 w-44 shrink-0 items-end justify-center rounded-lg bg-white/65 sm:flex">
                <div className="grid grid-cols-3 items-end gap-1.5">
                  <span className="h-10 w-7 rounded-t-md bg-orange-200" />
                  <span className="h-16 w-8 rounded-t-md bg-orange-400" />
                  <span className="h-12 w-7 rounded-t-md bg-emerald-300" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Tag className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black text-slate-950">Price Range</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <PriceField label="Minimum Price" value={minPriceInput} onChange={updateMinimumPrice} />
              <span className="hidden pb-3 text-center text-xl font-black text-slate-500 sm:block">-</span>
              <PriceField label="Maximum Price" value={maxPriceInput} onChange={updateMaximumPrice} />
            </div>

            {quickBudgetChips.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-black text-slate-950">Quick Budget</Label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {quickBudgetChips.map((chip) => {
                    const active = priceRange[0] === chip.value[0] && priceRange[1] === chip.value[1];
                    return (
                      <button
                        key={`${chip.value[0]}-${chip.value[1]}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          applyPriceRange(chip.value);
                        }}
                        className={`min-h-12 rounded-lg border px-3 text-sm font-black transition ${
                          active ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50"
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Bed className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black text-slate-950">Bedrooms</h3>
            </div>
            <input
              type="text"
              value={bedrooms === "any" ? "" : bedrooms}
              placeholder="Any beds"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setBedrooms(event.target.value.trim() || "any")}
              className="h-14 w-full rounded-lg border border-slate-200 bg-white px-4 text-base font-bold text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Sofa className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black text-slate-950">Amenities</h3>
            </div>
            <div className="space-y-3">
              <AmenityToggle icon={PawPrint} label="Pet Friendly" checked={petFriendly} onChange={setPetFriendly} tone="bg-violet-50 text-violet-600" />
              <AmenityToggle icon={Car} label="Parking" checked={parking} onChange={setParking} tone="bg-blue-50 text-blue-600" />
              <AmenityToggle icon={Sofa} label="Fully Furnished" checked={furnished} onChange={setFurnished} tone="bg-orange-50 text-orange-600" />
            </div>
          </section>

          <div className="grid gap-3">
            <Button onClick={saveBrowsePreferences} className="h-14 rounded-lg bg-orange-500 text-base font-black text-white shadow-lg shadow-orange-200 hover:bg-orange-600">
              <Bookmark className="mr-2 h-5 w-5" />
              Save as My Browse Preference
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" onClick={restoreSavedPreferences} className="h-12 rounded-lg border-slate-200 font-black text-slate-700 hover:bg-slate-50">
                <Clock className="mr-2 h-5 w-5" />
                Restore Saved Preferences
              </Button>
              <Button variant="outline" onClick={resetFilters} className="h-12 rounded-lg border-orange-300 font-black text-orange-600 hover:bg-orange-50">
                <RotateCcw className="mr-2 h-5 w-5" />
                Reset Filters
              </Button>
              <Button variant="outline" onClick={() => setPreferencesOpen(false)} className="h-12 rounded-lg border-slate-200 font-black text-slate-700 hover:bg-slate-50">
                Cancel
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold leading-6 text-slate-600">Your preferences are private and stay connected to your tenant account.</p>
          </div>
        </div>
      </DialogContent>
  );

  const ApartmentBrowseCard = ({ apartment }: { apartment: Apartment }) => {
    const status = apartment.status ?? "available";
    const availableRooms = getAvailableRooms(apartment);
    const locationText = [apartment.city, apartment.state].filter(Boolean).join(", ") || apartment.address;
    const favorite = isFavorite(apartment.id);

    return (
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
        <div className="relative aspect-[4/3] bg-slate-100">
          {apartment.image ? (
            <img src={getImageUrl(apartment.image)} alt={apartment.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Building2 className="h-12 w-12 text-slate-300" />
            </div>
          )}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            <Badge className={`rounded-md ${STATUS_CLASS[status] ?? STATUS_CLASS.available}`}>{STATUS_LABEL[status] ?? "Available"}</Badge>
            {isVerifiedListing(apartment) && <VerifiedBadge label="Verified Landlord" className="bg-white/95 shadow-lg backdrop-blur-sm" />}
            {apartment.petFriendly && <Badge className="rounded-md bg-violet-500 text-white">Pet Friendly</Badge>}
          </div>
          <button
            title={favorite ? "Remove from favorites" : "Add to favorites"}
            onClick={() => void toggleFavorite(apartment.id)}
            className={`absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg transition hover:scale-105 ${favorite ? "text-rose-500" : "text-slate-500"}`}
          >
            <Heart className="h-6 w-6" fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-slate-950">{apartment.title}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-500"><MapPin className="h-4 w-4 text-orange-500" />{locationText}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black text-orange-600">View room prices</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4 text-sm">
            <Metric icon={Building2} label="rooms" value={availableRooms.toLocaleString()} />
            <Metric icon={Bed} label="bed" value={apartment.bedrooms.toLocaleString()} />
            <Metric icon={Bath} label="bath" value={apartment.bathrooms.toLocaleString()} />
            <Metric icon={Square} label="sqft" value={Number(apartment.sqft || 0).toLocaleString()} />
          </div>
          <Button asChild variant="outline" className="mt-5 h-12 w-full rounded-lg border-orange-200 font-black text-orange-600 hover:bg-orange-50">
            <Link to={`/apartment/${apartment.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </Button>
        </div>
      </article>
    );
  };

  return (
    <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
      <div className="fixed inset-0 z-50 overflow-hidden bg-[#f8fafc]">
      <div className="flex h-full">
        <aside className="hidden h-full w-64 shrink-0 flex-col bg-[#07142f] shadow-2xl shadow-slate-900/40 lg:flex">
          <div className="px-5 pb-5 pt-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-950/30">
                <HomeIcon className="h-6 w-6 fill-white/20 text-white" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white">Rent<span className="text-orange-500">Iloilo</span></span>
                <p className="-mt-0.5 text-xs font-medium text-white/50">{portalLabel}</p>
              </div>
            </Link>
          </div>

          <div className="px-4 pb-5">
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-3 shadow-inner shadow-white/5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-lime-300 to-orange-500 text-sm font-black text-white shadow">
                {user?.avatar ? <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{displayName || "Welcome"}</p>
                <p className="truncate text-xs text-white/40">{user?.email ?? ""}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/40" />
            </div>
          </div>

          <nav className="space-y-1 px-3 py-3">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Main</p>
            <SidebarLink icon={LayoutDashboard} label="Overview" href="/dashboard?section=overview" />
            <SidebarLink icon={Heart} label="My Favorites" href="/favorites" badge={userFavorites.length} />
            <SidebarLink icon={Sparkles} label="Suggested" href="/dashboard?section=suggested" />
            <SidebarLink icon={TrendingUp} label="Popular" href="/dashboard?section=popular" />
          </nav>

          <nav className="space-y-1 border-t border-white/10 px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Browse</p>
            <SidebarLink icon={Search} label="Browse All" href="/browse" active />
            <SidebarLink icon={Clock} label="Recently Added" href="/dashboard?section=recent" />
          </nav>

          <nav className="space-y-1 border-t border-white/10 px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Account</p>
            <SidebarLink icon={Settings} label="Settings" href="/dashboard?section=settings" />
            <SidebarLink icon={TriangleAlert} label="Report a Problem" href="/dashboard?section=report" />
            <SidebarLink icon={HelpCircle} label="Help" href="/dashboard?section=help" />
          </nav>

          <div className="mt-auto border-t border-white/10 px-4 py-4">
            <LogoutConfirmation onConfirm={handleLogout}>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10 hover:text-red-300">
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </LogoutConfirmation>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 lg:px-10">
            <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search apartments, buildings, or amenities..." className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100" />
                </div>
                {renderFilterTrigger()}
              </div>
            </section>

            <section className="relative mt-8 overflow-hidden rounded-lg bg-gradient-to-r from-white via-orange-50 to-orange-100 p-7">
              <div className="relative z-10">
                <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-orange-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-orange-600 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  Find Your Next Home
                </div>
                <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Available <span className="text-orange-600">Apartments</span></h1>
                <p className="mt-4 text-lg font-medium text-slate-600">{filteredApartments.length} {filteredApartments.length === 1 ? "apartment" : "apartments"} found in La Paz</p>
              </div>
              <div className="pointer-events-none absolute bottom-0 right-10 hidden h-32 w-72 rounded-t-lg bg-white/70 md:block" />
              <div className="pointer-events-none absolute bottom-10 right-24 hidden h-16 w-36 rounded-lg bg-orange-200 md:block" />
            </section>

            <section className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_14px_35px_rgba(15,23,42,0.07)] xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                <SortButton icon={Star} label="Recommended" active={sortBy === "recommended"} onClick={() => setSortBy("recommended")} />
                <SortButton icon={DollarSign} label="Price (Low)" active={sortBy === "price_low"} onClick={() => setSortBy("price_low")} />
                <SortButton icon={TrendingUp} label="Price (High)" active={sortBy === "price_high"} onClick={() => setSortBy("price_high")} />
                <SortButton icon={CalendarDays} label="Newest" active={sortBy === "newest"} onClick={() => setSortBy("newest")} />
                <SortButton icon={Flame} label="Popular" active={sortBy === "popular"} onClick={() => setSortBy("popular")} />
              </div>
              <div className="grid h-12 grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
                <button onClick={() => setViewMode("grid")} className={`flex items-center justify-center gap-2 rounded-md px-5 text-sm font-black ${viewMode === "grid" ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"}`}><Grid2X2 className="h-4 w-4" />Grid</button>
                <button onClick={() => setViewMode("map")} className={`flex items-center justify-center gap-2 rounded-md px-5 text-sm font-black ${viewMode === "map" ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"}`}><Map className="h-4 w-4" />Map</button>
              </div>
            </section>

            <section className="mt-6">
              {apartmentsLoading ? (
                <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-500 shadow-sm">Loading apartments from database...</div>
              ) : apartmentsError ? (
                <div className="flex min-h-72 items-center justify-center rounded-lg border border-red-100 bg-white text-sm font-bold text-red-600 shadow-sm">{apartmentsError}</div>
              ) : filteredApartments.length === 0 ? (
                <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                  <LocateFixed className="mb-4 h-12 w-12 text-slate-300" />
                  <h2 className="text-2xl font-black text-slate-950">No apartments match your filters.</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">Try adjusting your search criteria to find your perfect home.</p>
                  <Button onClick={resetFilters} className="mt-6 rounded-lg bg-orange-500 font-black text-white hover:bg-orange-600">Reset Filters</Button>
                </div>
              ) : viewMode === "grid" ? (
                <>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {paginatedApartments.map((apartment) => (
                      <ApartmentBrowseCard key={apartment.id} apartment={apartment} />
                    ))}
                  </div>
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalItems={filteredApartments.length}
                    pageStart={pageStart}
                    pageCount={paginatedApartments.length}
                    itemsPerPage={itemsPerPage}
                    setCurrentPage={setCurrentPage}
                    setItemsPerPage={setItemsPerPage}
                  />
                </>
              ) : (
                <div className="relative h-[calc(100vh-350px)] min-h-[550px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                  <div className="absolute left-4 top-4 z-[500] rounded-lg bg-white/95 px-4 py-3 text-xs font-bold text-slate-700 shadow-lg">
                    {mappedApartmentCount.toLocaleString()} of {filteredApartments.length.toLocaleString()} filtered listings have map coordinates
                  </div>
                  <MapView
                    lat={mapCenter.lat}
                    lng={mapCenter.lng}
                    zoom={12}
                    apartments={filteredApartments.map((apt) => ({
                      id: apt.id,
                      title: apt.title,
                      price: getLowestAvailableRoomPrice(apt) ?? 0,
                      lat: apt.lat,
                      lng: apt.lng,
                      bedrooms: apt.bedrooms,
                      bathrooms: apt.bathrooms,
                      image: apt.image ? getImageUrl(apt.image) : undefined,
                      location: [apt.city, apt.state].filter(Boolean).join(", ") || apt.address,
                      availableRooms: getAvailableRooms(apt),
                      status: apt.status ?? "available",
                      isVerified: isVerifiedListing(apt),
                      verificationStatus: getVerificationStatus(apt),
                      availabilityStatus: isApartmentAvailable(apt) ? "available" : "unavailable",
                    }))}
                    emptyMessage="No apartments found on the map. Try adjusting your filters."
                  />
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
      <div className="fixed bottom-6 right-6 z-50">
        {renderFilterTrigger(true)}
      </div>
      </div>
      {renderFilterContent()}
    </Dialog>
  );
}

function Metric({ icon: Icon, value, label }: { icon: ComponentType<{ className?: string }>; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-600">
      <Icon className="h-4 w-4 text-orange-500" />
      <span className="font-bold">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

function SortButton({ icon: Icon, label, active, onClick }: { icon: ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex h-12 items-center gap-2 rounded-lg px-5 text-sm font-black transition ${active ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "text-slate-700 hover:bg-slate-50"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-black text-slate-950">{label}</Label>
      <div className="flex h-14 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 shadow-sm focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100">
        <span className="text-base font-black text-slate-500">₱</span>
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-lg font-black text-slate-800 outline-none"
        />
      </div>
    </div>
  );
}

function AmenityToggle({
  icon: Icon,
  label,
  checked,
  onChange,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-base font-bold text-slate-800">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageStart,
  pageCount,
  itemsPerPage,
  setCurrentPage,
  setItemsPerPage,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageCount: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
}) {
  return (
    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-600">
        Showing {totalItems === 0 ? 0 : pageStart + 1} to {pageStart + pageCount} of {totalItems} apartments
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }).slice(0, 5).map((_, index) => {
          const page = index + 1;
          return (
            <button key={page} onClick={() => setCurrentPage(page)} className={`h-10 min-w-10 rounded-lg px-3 text-sm font-black ${currentPage === page ? "bg-orange-500 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
              {page}
            </button>
          );
        })}
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
        <select value={itemsPerPage} onChange={(event) => setItemsPerPage(Number(event.target.value))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
          <option value={6}>Show: 6 per page</option>
          <option value={9}>Show: 9 per page</option>
          <option value={12}>Show: 12 per page</option>
        </select>
      </div>
    </div>
  );
}

export function Home() {
  return <BrowseContent />;
}
