import {
  Bath,
  Bed,
  Bookmark,
  Building2,
  ChevronRight,
  Clock,
  Eye,
  Grid2X2,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  List,
  LogOut,
  MapPin,
  Search,
  Settings,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { VerifiedBadge } from "@/app/shared/components/common/VerifiedBadge";
import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { listFavoriteApartments, type Apartment } from "@/app/shared/data/apartments";
import { useFavorites } from "@/app/shared/hooks/useFavorites";
import { getImageUrl } from "@/app/shared/utils/images";
import {
  getAvailableRoomCount,
  getLowestAvailableRoomPrice,
  isTenantVisibleApartment,
} from "@/app/shared/utils/listingVisibility";

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

type FavoriteFilter = "all" | "available" | "unavailable";
type FavoriteSort = "newest" | "price-low" | "price-high" | "name";
type ViewMode = "grid" | "list";

export function Favorites() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { refreshFavorites, toggleFavorite } = useFavorites();
  const { apartments } = useApartmentsContext();
  const [favoriteApartments, setFavoriteApartments] = useState<Awaited<ReturnType<typeof listFavoriteApartments>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FavoriteFilter>("all");
  const [sort, setSort] = useState<FavoriteSort>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.id) {
        setFavoriteApartments([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const apartments = await listFavoriteApartments(user.id);
        if (active) {
          setFavoriteApartments(
            apartments.filter((apt) => (
              isTenantVisibleApartment(apt) &&
              !(user.role === "landlord" && apt.landlordId === user.id)
            )),
          );
        }
      } catch (error) {
        console.error("Failed to load favorite apartments:", error);
        if (active) setFavoriteApartments([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    void refreshFavorites();

    return () => {
      active = false;
    };
  }, [apartments, user?.id, user?.role, refreshFavorites]);

  const isApartmentAvailable = isTenantVisibleApartment;
  const getAvailableRooms = getAvailableRoomCount;

  const visibleFavorites = useMemo(() => {
    return [...favoriteApartments]
      .filter((apartment) => {
        if (filter === "available") return isApartmentAvailable(apartment);
        if (filter === "unavailable") return !isApartmentAvailable(apartment);
        return true;
      })
      .sort((a, b) => {
        if (sort === "price-low") return (getLowestAvailableRoomPrice(a) ?? Number.MAX_SAFE_INTEGER) - (getLowestAvailableRoomPrice(b) ?? Number.MAX_SAFE_INTEGER);
        if (sort === "price-high") return (getLowestAvailableRoomPrice(b) ?? -1) - (getLowestAvailableRoomPrice(a) ?? -1);
        if (sort === "name") return a.title.localeCompare(b.title);

        const bDate = new Date(b.updatedAt || b.createdAt || b.availableDate).getTime();
        const aDate = new Date(a.updatedAt || a.createdAt || a.availableDate).getTime();
        return (Number.isNaN(bDate) ? 0 : bDate) - (Number.isNaN(aDate) ? 0 : aDate);
      });
  }, [favoriteApartments, filter, sort]);

  const favoriteCount = favoriteApartments.length;
  const displayName = user?.name?.trim();
  const portalLabel = user?.role === "student" ? "Student Portal" : "Employee Portal";

  const removeFavorite = async (apartmentId: string) => {
    if (!user?.id) return;

    setRemovingId(apartmentId);
    try {
      await toggleFavorite(apartmentId);
      await refreshFavorites();
      const apartments = await listFavoriteApartments(user.id);
      setFavoriteApartments(
        apartments.filter((apt) => (
          isTenantVisibleApartment(apt) &&
          !(user.role === "landlord" && apt.landlordId === user.id)
        )),
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleLogout = () => {
    logout?.();
    navigate("/");
  };

  if (user?.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const SidebarLink = ({
    icon: Icon,
    label,
    href,
    active,
    badge,
  }: {
    icon: typeof Heart;
    label: string;
    href: string;
    active?: boolean;
    badge?: number;
  }) => (
    <Link
      to={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition ${
        active ? "bg-white text-orange-600 shadow-lg shadow-orange-950/20 ring-1 ring-orange-200" : "text-white/65 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="app-sidebar-badge flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white">
          {badge}
        </span>
      )}
    </Link>
  );

  const FavoriteCard = ({ apartment }: { apartment: Apartment }) => {
    const status = apartment.status ?? "available";
    const availableRooms = getAvailableRooms(apartment);
    const images = [apartment.image, ...(apartment.images ?? [])].filter(Boolean);
    const location = [apartment.city, apartment.state].filter(Boolean).join(", ") || apartment.address;

    return (
      <article className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${viewMode === "list" ? "grid lg:grid-cols-[minmax(280px,0.9fr)_1fr]" : ""}`}>
        <div className="relative bg-slate-100">
          <div className={viewMode === "list" ? "aspect-[4/3] lg:h-full lg:aspect-auto" : "aspect-[4/3]"}>
            {images[0] ? (
              <img src={getImageUrl(images[0])} alt={apartment.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                <Building2 className="h-12 w-12 text-slate-300" />
              </div>
            )}
          </div>
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {apartment.landlordVerified === true && <VerifiedBadge label="Verified Landlord" className="bg-white/95 shadow-lg backdrop-blur-sm" />}
            {apartment.petFriendly && <Badge className="rounded-full bg-emerald-600 text-white">Pet Friendly</Badge>}
            <Badge className={`rounded-full ${STATUS_CLASS[status] ?? STATUS_CLASS.available}`}>{STATUS_LABEL[status] ?? "Available"}</Badge>
          </div>
          <button
            onClick={() => void removeFavorite(apartment.id)}
            disabled={removingId === apartment.id}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-500 shadow-lg transition hover:scale-105 disabled:opacity-60"
            aria-label="Remove from favorites"
          >
            <Heart className="h-6 w-6 fill-current" />
          </button>
          {images.length > 1 && (
            <div className="absolute inset-x-4 bottom-4 grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((image, index) => (
                <div key={`${image}-${index}`} className="aspect-[4/3] overflow-hidden rounded-md bg-white/80 shadow">
                  <img src={getImageUrl(image)} alt={`${apartment.title} ${index + 2}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-2xl font-black text-slate-950">{apartment.title}</h2>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <MapPin className="h-4 w-4 text-rose-500" />
                <span>{location}</span>
              </div>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-sm font-black text-orange-600">View room prices</p>
            </div>
          </div>

          <div className="my-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 sm:grid-cols-4">
            <InfoPill icon={Bookmark} value={availableRooms.toLocaleString()} label={availableRooms === 1 ? "Room" : "Rooms"} tone="text-orange-600 bg-orange-50" />
            <InfoPill icon={Bed} value={apartment.rooms?.length ? apartment.rooms.length.toLocaleString() : apartment.bedrooms.toLocaleString()} label={apartment.rooms?.length ? "Room count" : "Beds"} tone="text-rose-600 bg-rose-50" />
            <InfoPill icon={Bath} value={apartment.bathrooms.toLocaleString()} label={apartment.bathrooms === 1 ? "Bath" : "Baths"} tone="text-purple-600 bg-purple-50" />
            <InfoPill icon={Square} value={Number(apartment.sqft || 0).toLocaleString()} label="Sqft" tone="text-sky-600 bg-sky-50" />
          </div>

          {apartment.description && (
            <p className="line-clamp-2 text-sm font-medium leading-6 text-slate-600">{apartment.description}</p>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row">
            <Button asChild variant="outline" className="h-12 flex-1 rounded-lg border-slate-200 font-black text-slate-700 hover:bg-slate-50">
              <Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/favorites", backLabel: "Back to Favorites" }}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={removingId === apartment.id}
              onClick={() => void removeFavorite(apartment.id)}
              className="h-12 flex-1 rounded-lg border-red-200 bg-red-50 font-black text-red-600 hover:bg-red-100"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {removingId === apartment.id ? "Removing..." : "Remove"}
            </Button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="app-shell fixed inset-0 z-50 overflow-hidden bg-[#f8fafc]">
      <div className="app-shell-frame flex h-full">
        <aside className="app-shell-sidebar hidden h-full w-64 shrink-0 flex-col bg-[#07142f] shadow-2xl shadow-slate-900/40 lg:flex">
          <div className="app-sidebar flex h-full w-full flex-col overflow-y-auto">
          <div className="app-sidebar-brand px-5 pb-5 pt-6">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-950/30">
                <Home className="h-6 w-6 fill-white/20 text-white" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white">Rent<span className="text-orange-500">Iloilo</span></span>
                <p className="-mt-0.5 text-xs font-medium text-white/50">{portalLabel}</p>
              </div>
            </Link>
          </div>

          <div className="px-4 pb-5">
            <div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-3 shadow-inner shadow-white/5">
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
            <SidebarLink icon={Heart} label="My Favorites" href="/favorites" active badge={favoriteCount} />
            <SidebarLink icon={Sparkles} label="Suggested" href="/dashboard?section=suggested" />
            <SidebarLink icon={TrendingUp} label="Popular" href="/dashboard?section=popular" />
          </nav>

          <nav className="space-y-1 border-t border-white/10 px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Browse</p>
            <SidebarLink icon={Search} label="Browse All" href="/browse" />
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
              <button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10 hover:text-red-300">
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </LogoutConfirmation>
          </div>
          </div>
        </aside>

        <main className="app-shell-main min-w-0 flex-1 overflow-y-auto">
          <div className="app-shell-content mx-auto max-w-7xl px-4 py-6 md:px-8 lg:px-10 lg:py-8">
            <section className="relative overflow-hidden rounded-lg border border-orange-100 bg-white px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] md:px-9">
              <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-500 shadow-sm">
                  <Heart className="h-8 w-8 fill-current" />
                </div>
                <div>
                  <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Your Favorites</h1>
                  <p className="mt-2 text-lg font-medium text-slate-600">Apartments you've saved for later</p>
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-0 right-8 hidden h-28 w-72 rounded-t-lg bg-orange-50 md:block" />
              <div className="pointer-events-none absolute bottom-8 right-20 hidden h-16 w-36 rounded-lg bg-orange-100 md:block" />
            </section>

            <section className="mt-6 grid gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:grid-cols-2">
              <div className="flex items-center gap-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                  <Heart className="h-8 w-8 fill-current" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-600">Total Favorites</p>
                  <p className="mt-1 text-4xl font-black text-rose-500">{favoriteCount.toLocaleString()}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{favoriteCount === 1 ? "apartment saved" : "apartments saved"}</p>
                </div>
              </div>
              <div className="flex items-center gap-5 border-t border-slate-100 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                  <Bookmark className="h-8 w-8 fill-current" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-600">Save for later</p>
                  <p className="mt-2 max-w-sm text-base font-medium leading-7 text-slate-600">Compare and revisit real listings you saved from Browse and Apartment Details.</p>
                </div>
              </div>
            </section>

            <section className="mt-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.07)] lg:flex-row lg:items-center lg:justify-between">
              <select value={filter} onChange={(event) => setFilter(event.target.value as FavoriteFilter)} className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100">
                <option value="all">All Favorites ({favoriteCount})</option>
                <option value="available">Available Only</option>
                <option value="unavailable">Unavailable</option>
              </select>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select value={sort} onChange={(event) => setSort(event.target.value as FavoriteSort)} className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100">
                  <option value="newest">Newest Added</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name</option>
                </select>
                <div className="grid h-12 grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
                  <button onClick={() => setViewMode("grid")} className={`flex h-10 w-12 items-center justify-center rounded-md transition ${viewMode === "grid" ? "bg-orange-50 text-orange-600" : "text-slate-500 hover:bg-slate-50"}`} aria-label="Grid view">
                    <Grid2X2 className="h-5 w-5" />
                  </button>
                  <button onClick={() => setViewMode("list")} className={`flex h-10 w-12 items-center justify-center rounded-md transition ${viewMode === "list" ? "bg-orange-50 text-orange-600" : "text-slate-500 hover:bg-slate-50"}`} aria-label="List view">
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-6">
              {isLoading ? (
                <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-500 shadow-sm">
                  Loading favorites...
                </div>
              ) : favoriteCount === 0 ? (
                <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                    <Heart className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-950">No favorites yet</h2>
                  <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">Browse apartments to save listings.</p>
                  <Button onClick={() => navigate("/browse")} className="mt-6 rounded-lg bg-orange-500 px-6 font-black text-white hover:bg-orange-600">
                    Browse Apartments
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : visibleFavorites.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                  <Search className="mb-4 h-10 w-10 text-slate-300" />
                  <h2 className="text-xl font-black text-slate-950">No favorites match this filter</h2>
                  <Button variant="outline" onClick={() => setFilter("all")} className="mt-5 rounded-lg font-black">Show All Favorites</Button>
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-1 gap-6 xl:grid-cols-2" : "space-y-6"}>
                  {visibleFavorites.map((apartment) => (
                    <FavoriteCard key={apartment.id} apartment={apartment} />
                  ))}
                </div>
              )}
            </section>

            <section className="my-8 flex flex-col gap-4 rounded-lg border border-orange-100 bg-orange-50 p-6 shadow-[0_16px_35px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-orange-600 shadow-sm">
                <Building2 className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black text-slate-950">Explore more apartments</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">Find more places you'll love and add to your favorites.</p>
              </div>
              <Button onClick={() => navigate("/browse")} className="rounded-lg bg-orange-500 px-6 font-black text-white hover:bg-orange-600">
                Browse Apartments
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Bed;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-lg font-black leading-none text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
      </div>
    </div>
  );
}
