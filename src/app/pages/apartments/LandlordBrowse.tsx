import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Eye,
  Heart,
  HelpCircle,
  Home,
  LayoutDashboard,
  LayoutGrid,
  List,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  Settings,
  TrendingUp,
  X
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { LogoutConfirmation } from "@/app/components/common/LogoutConfirmation";

import { VerifiedBadge } from "@/app/components/common/VerifiedBadge";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import { useAuth } from "@/app/contexts/AuthContext";
import type { Apartment } from "@/app/data/apartments";
import { useFavorites } from "@/app/hooks/useFavorites";
import {
  fetchApartmentViews,
  fetchFavorites,
  fetchNotifications,
  type DashboardApartmentViewRow,
  type DashboardFavoriteRow,
} from "@/app/services/dashboardSupabaseService";

type SortOption = "newest" | "most_viewed" | "most_favorited" | "price_low" | "price_high";

function getRoomStatus(room: NonNullable<Apartment["rooms"]>[number]) {
  return room.status ?? (room.isOccupied ? "occupied" : "available");
}

function getAvailableRoomCount(apartment: Apartment) {
  return (apartment.rooms ?? []).filter((room) => getRoomStatus(room) === "available").length;
}

function getImageUrl(apartment: Apartment) {
  return /^(https?:|data:image\/|blob:)/i.test(apartment.image ?? "") ? apartment.image : "";
}

export function LandlordBrowse() {
  const navigate = useNavigate();
  const { user, users, logout } = useAuth();
  const { apartments: allApartments, isLoading: apartmentsLoading, error: apartmentsError, refreshApartments } = useApartmentsContext();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [viewRows, setViewRows] = useState<DashboardApartmentViewRow[]>([]);
  const [favoriteRows, setFavoriteRows] = useState<DashboardFavoriteRow[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [marketDataLoading, setMarketDataLoading] = useState(true);

  const [searchDraft, setSearchDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("all");
  const [minPriceDraft, setMinPriceDraft] = useState("");
  const [maxPriceDraft, setMaxPriceDraft] = useState("");
  const [sortDraft, setSortDraft] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, Number.MAX_SAFE_INTEGER]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    let active = true;

    const loadMarketData = async () => {
      setMarketDataLoading(true);
      try {
        const [views, favorites, notifications] = await Promise.all([
          fetchApartmentViews(),
          fetchFavorites(),
          user?.id ? fetchNotifications(user.id) : Promise.resolve([]),
        ]);
        if (!active) return;
        setViewRows(views);
        setFavoriteRows(favorites);
        setUnreadNotifications(notifications.filter((notification) => !(notification.read ?? notification.is_read)).length);
      } catch (error) {
        console.error("Unable to load landlord market metrics:", error);
        if (active) {
          setViewRows([]);
          setFavoriteRows([]);
          setUnreadNotifications(0);
        }
      } finally {
        if (active) setMarketDataLoading(false);
      }
    };

    void loadMarketData();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const publishedApartments = useMemo(
    () => allApartments.filter((apartment) => apartment.isPublished !== false),
    [allApartments],
  );

  const getViewCount = (apartmentId: string) =>
    viewRows
      .filter((view) => (view.apartment_id ?? view.apartmentId) === apartmentId)
      .reduce((total, view) => total + (Number(view.view_count) || 1), 0);

  const getFavoriteCount = (apartmentId: string) =>
    favoriteRows.filter((favorite) => (favorite.apartment_id ?? favorite.apartmentId) === apartmentId).length;

  const marketInsights = useMemo(() => {
    const totalListings = publishedApartments.length;
    const averageRent = totalListings > 0
      ? Math.round(publishedApartments.reduce((sum, apartment) => sum + Number(apartment.price || 0), 0) / totalListings)
      : 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentlyAddedCount = publishedApartments.filter((apartment) => {
      const timestamp = new Date(apartment.createdAt ?? 0).getTime();
      return !Number.isNaN(timestamp) && timestamp >= sevenDaysAgo;
    }).length;
    const laPazListings = publishedApartments.filter((apartment) =>
      `${apartment.address} ${apartment.city} ${apartment.state}`.toLowerCase().includes("la paz"),
    ).length;
    const laPazCoverage = totalListings > 0 ? Math.round((laPazListings / totalListings) * 100) : 0;
    const topPerformers = [...publishedApartments]
      .map((apartment) => ({ apartment, engagement: getViewCount(apartment.id) + getFavoriteCount(apartment.id) }))
      .filter((item) => item.engagement > 0)
      .sort((left, right) => right.engagement - left.engagement)
      .slice(0, 3)
      .map((item) => item.apartment);

    return { totalListings, averageRent, recentlyAddedCount, laPazCoverage, topPerformers };
  }, [publishedApartments, viewRows, favoriteRows]);

  const locations = useMemo(
    () => Array.from(new Set(publishedApartments.map((apartment) => apartment.city).filter(Boolean))).sort(),
    [publishedApartments],
  );

  const filteredApartments = useMemo(() => {
    const filtered = publishedApartments.filter((apartment) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || `${apartment.title} ${apartment.address} ${apartment.city} ${apartment.description}`.toLowerCase().includes(query);
      const matchesLocation = locationFilter === "all" || apartment.city === locationFilter;
      const price = Number(apartment.price || 0);
      return matchesSearch && matchesLocation && price >= priceRange[0] && price <= priceRange[1];
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "most_viewed") return getViewCount(right.id) - getViewCount(left.id);
      if (sortBy === "most_favorited") return getFavoriteCount(right.id) - getFavoriteCount(left.id);
      if (sortBy === "price_low") return Number(left.price || 0) - Number(right.price || 0);
      if (sortBy === "price_high") return Number(right.price || 0) - Number(left.price || 0);
      return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime();
    });
  }, [publishedApartments, searchQuery, locationFilter, priceRange, sortBy, viewRows, favoriteRows]);

  const applyFilters = () => {
    const minimum = minPriceDraft.trim() ? Math.max(0, Number(minPriceDraft)) : 0;
    const maximum = maxPriceDraft.trim() ? Math.max(0, Number(maxPriceDraft)) : Number.MAX_SAFE_INTEGER;
    setSearchQuery(searchDraft.trim());
    setLocationFilter(locationDraft);
    setPriceRange([Math.min(minimum, maximum), Math.max(minimum, maximum)]);
    setSortBy(sortDraft);
  };

  const clearFilters = () => {
    setSearchDraft("");
    setLocationDraft("all");
    setMinPriceDraft("");
    setMaxPriceDraft("");
    setSortDraft("newest");
    setSearchQuery("");
    setLocationFilter("all");
    setPriceRange([0, Number.MAX_SAFE_INTEGER]);
    setSortBy("newest");
  };

  const handleFavorite = (event: React.MouseEvent, apartment: Apartment) => {
    event.stopPropagation();
    if (apartment.landlordId === user?.id) return;
    void toggleFavorite(apartment.id);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-white/10 px-5 pb-4 pt-6">
        <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white"><Home className="h-5 w-5" /></span><div><p className="text-lg font-black text-white">Rent<span className="text-orange-500">Iloilo</span></p><p className="text-[10px] font-semibold uppercase text-white/40">Landlord Portal</p></div></div>
      </div>
      <div className="border-b border-white/10 px-4 py-4"><div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-sm font-black text-white">{user?.name?.[0]?.toUpperCase() || ""}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{user?.name || "Name unavailable"}</p><p className="truncate text-xs text-white/40">{user?.email || ""}</p></div></div></div>
      <nav className="space-y-1 px-3 py-4"><p className="mb-2 px-3 text-[10px] font-black uppercase text-white/30">Main</p><button onClick={() => navigate("/dashboard?section=overview")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white"><LayoutDashboard className="h-4 w-4" />Dashboard</button><button onClick={() => navigate("/dashboard?section=properties")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white"><Building2 className="h-4 w-4" />My Properties</button><button onClick={() => navigate("/dashboard?section=activity")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white"><TrendingUp className="h-4 w-4" />Activity</button><button onClick={() => navigate("/dashboard?section=notifications")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white"><Bell className="h-4 w-4" />Notifications{unreadNotifications > 0 && <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">{unreadNotifications}</span>}</button></nav>
      <nav className="space-y-1 border-t border-white/10 px-3 py-4"><p className="mb-2 px-3 text-[10px] font-black uppercase text-white/30">Market</p><div className="flex items-center gap-3 rounded-lg bg-orange-500 px-3 py-2.5 text-sm font-bold text-white shadow-md"><TrendingUp className="h-4 w-4" />Market Overview</div><button onClick={() => document.getElementById("market-properties")?.scrollIntoView({ behavior: "smooth" })} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white"><LayoutGrid className="h-4 w-4" />Browse All</button></nav>
      <nav className="space-y-1 border-t border-white/10 px-3 py-4"><p className="mb-2 px-3 text-[10px] font-black uppercase text-white/30">Manage</p><button onClick={() => navigate("/add-apartment")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white"><Plus className="h-4 w-4" />Add Property</button></nav>
      <nav className="space-y-1 border-t border-white/10 px-3 py-4"><p className="mb-2 px-3 text-[10px] font-black uppercase text-white/30">Account</p><button onClick={() => navigate("/dashboard?section=settings")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white"><Settings className="h-4 w-4" />Settings</button><button onClick={() => navigate("/dashboard?section=help")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 hover:text-white"><HelpCircle className="h-4 w-4" />Help</button></nav>
      <div className="mt-auto border-t border-white/10 p-4"><LogoutConfirmation onConfirm={() => { logout?.(); navigate("/"); }}><button className="flex w-full items-center gap-3 rounded-lg border border-red-500/30 px-3 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10"><LogOut className="h-4 w-4" />Log Out</button></LogoutConfirmation></div>
    </div>
  );

  const PropertyCard = ({ apartment, compact = false }: { apartment: Apartment; compact?: boolean }) => {
    const imageUrl = getImageUrl(apartment);
    const availableRooms = getAvailableRoomCount(apartment);
    const viewCount = getViewCount(apartment.id);
    const favoriteCount = getFavoriteCount(apartment.id);
    const landlord = users.find((entry) => entry.id === apartment.landlordId);
    const canFavorite = apartment.landlordId !== user?.id && user?.role !== "admin";
    const location = apartment.address || [apartment.city, apartment.state].filter(Boolean).join(", ") || "Address unavailable";

    return (
      <motion.article whileHover={{ y: -3 }} onClick={() => navigate(`/apartment/${apartment.id}`)} className="group cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
        <div className={`relative flex items-center justify-center overflow-hidden bg-slate-100 ${compact ? "aspect-[16/8]" : "aspect-[4/3]"}`}>{imageUrl ? <img src={imageUrl} alt={apartment.title || "Property"} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <Building2 className="h-10 w-10 text-slate-300" />}<Badge className="absolute left-3 top-3 rounded-md bg-orange-500 text-white"><Eye className="mr-1 h-3 w-3" />{viewCount} views</Badge>{canFavorite && <button title={isFavorite(apartment.id) ? "Remove from favorites" : "Add to favorites"} onClick={(event) => handleFavorite(event, apartment)} className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition hover:scale-105 ${isFavorite(apartment.id) ? "text-rose-500" : "text-slate-500"}`}><Heart className="h-5 w-5" fill={isFavorite(apartment.id) ? "currentColor" : "none"} /></button>}</div>
        <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-black text-slate-950">{apartment.title || "Untitled property"}</h3><p className="mt-1 flex items-center gap-1 truncate text-xs font-medium text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0 text-orange-500" />{location}</p></div><p className="shrink-0 text-xs font-black text-orange-600">View room prices</p></div>{(apartment.landlordVerified ?? landlord?.isVerified) === true && <VerifiedBadge label="Verified Landlord" className="mt-3" />}<div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-lg bg-emerald-50 p-2.5"><strong className="block text-sm text-emerald-700">{availableRooms}</strong><span className="text-[10px] font-semibold text-slate-500">Available rooms</span></div><div className="rounded-lg bg-blue-50 p-2.5"><strong className="block text-sm text-blue-700">{viewCount}</strong><span className="text-[10px] font-semibold text-slate-500">Views</span></div><div className="rounded-lg bg-rose-50 p-2.5"><strong className="block text-sm text-rose-700">{favoriteCount}</strong><span className="text-[10px] font-semibold text-slate-500">Saved</span></div></div><Button onClick={(event) => { event.stopPropagation(); navigate(`/apartment/${apartment.id}`); }} className="mt-4 h-10 w-full rounded-md bg-orange-500 font-bold text-white hover:bg-orange-600">View Details<ChevronRight className="ml-2 h-4 w-4" /></Button></div>
      </motion.article>
    );
  };

  const isLoading = apartmentsLoading || marketDataLoading;
  const summaryCards = [
    { label: "Total Listings", value: marketInsights.totalListings.toLocaleString(), detail: "Published apartments", icon: Home, tone: "bg-orange-50 text-orange-600" },
    { label: "Average Rent", value: `₱${marketInsights.averageRent.toLocaleString("en-PH")}`, detail: "Monthly rent in La Paz", icon: TrendingUp, tone: "bg-violet-50 text-violet-600" },
    { label: "Recently Added", value: marketInsights.recentlyAddedCount.toLocaleString(), detail: "Added in the last 7 days", icon: CalendarDays, tone: "bg-emerald-50 text-emerald-600" },
    { label: "La Paz Coverage", value: `${marketInsights.laPazCoverage}%`, detail: "Listings identified in La Paz", icon: MapPin, tone: "bg-blue-50 text-blue-600" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-50">
      <div className="flex h-full">
        <aside className="hidden h-full w-60 shrink-0 bg-slate-950 shadow-xl lg:block"><SidebarContent /></aside>
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed left-0 top-0 z-50 h-full w-64 bg-slate-950 shadow-2xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}><button title="Close navigation" onClick={() => setSidebarOpen(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white"><X className="h-4 w-4" /></button><SidebarContent /></aside>
        <button title="Open navigation" onClick={() => setSidebarOpen(true)} className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white shadow-lg lg:hidden"><Menu className="h-5 w-5" /></button>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 pt-16 md:px-6 lg:px-8 lg:pt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1500px] space-y-6 pb-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-2 text-xs font-black text-orange-600 hover:text-orange-700"><ArrowLeft className="h-4 w-4" />Back</button><h1 className="text-3xl font-black text-slate-950">Market Overview</h1><p className="mt-1 text-sm font-medium text-slate-500">Explore published apartment data across La Paz, Iloilo City.</p></div></header>

            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{summaryCards.map(({ label, value, detail, icon: Icon, tone }) => <motion.div key={label} whileHover={{ y: -3 }} className="flex min-h-32 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="text-xs font-bold text-slate-500">{label}</span><strong className="mt-1 block truncate text-xl text-slate-950 sm:text-2xl">{value}</strong><span className="text-[11px] font-medium text-slate-400">{detail}</span></span></motion.div>)}</section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-orange-600" /><h2 className="text-lg font-black text-slate-950">Top Performing Properties</h2></div><p className="mt-1 text-xs font-medium text-slate-500">Ranked using real views and favorites.</p></div><button onClick={() => document.getElementById("market-properties")?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-2 text-xs font-black text-orange-600">View All Properties<ArrowRight className="h-4 w-4" /></button></div>{isLoading ? <div className="flex min-h-64 items-center justify-center"><TrendingUp className="h-7 w-7 animate-pulse text-orange-500" /></div> : marketInsights.topPerformers.length > 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{marketInsights.topPerformers.map((apartment) => <PropertyCard key={apartment.id} apartment={apartment} compact />)}</div> : <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><TrendingUp className="mb-3 h-8 w-8 text-slate-300" /><h3 className="font-black text-slate-800">No performance data yet</h3><p className="mt-1 text-sm font-medium text-slate-500">Properties will appear here after views or favorites are recorded.</p></div>}</section>

            <section id="market-properties" className="scroll-mt-6 rounded-lg border border-orange-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-2"><Search className="h-5 w-5 text-orange-600" /><div><h2 className="font-black text-slate-950">Search Properties</h2><p className="text-xs font-medium text-slate-500">Apply filters to the live market inventory.</p></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><label className="space-y-1.5 xl:col-span-2"><span className="text-xs font-bold text-slate-600">Search</span><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Name, address, or keyword" className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></div></label><label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Location</span><select value={locationDraft} onChange={(event) => setLocationDraft(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"><option value="all">All La Paz locations</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label><label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Price Range (₱)</span><div className="flex gap-2"><input type="number" min="0" value={minPriceDraft} onChange={(event) => setMinPriceDraft(event.target.value)} placeholder="Min" className="h-10 min-w-0 w-full rounded-md border border-slate-200 px-3 text-sm outline-none" /><input type="number" min="0" value={maxPriceDraft} onChange={(event) => setMaxPriceDraft(event.target.value)} placeholder="Max" className="h-10 min-w-0 w-full rounded-md border border-slate-200 px-3 text-sm outline-none" /></div></label><label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Sort By</span><select value={sortDraft} onChange={(event) => setSortDraft(event.target.value as SortOption)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"><option value="newest">Newest First</option><option value="most_viewed">Most Viewed</option><option value="most_favorited">Most Favorited</option><option value="price_low">Price: Low to High</option><option value="price_high">Price: High to Low</option></select></label></div><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={clearFilters} className="rounded-md font-bold">Clear</Button><Button onClick={applyFilters} className="rounded-md bg-orange-500 px-7 font-bold text-white hover:bg-orange-600"><CheckCircle2 className="mr-2 h-4 w-4" />Apply Filters</Button></div></section>

            <section><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">Available Properties</h2><p className="text-xs font-medium text-slate-500">{filteredApartments.length} matching published {filteredApartments.length === 1 ? "listing" : "listings"}</p></div><div className="flex rounded-lg border border-slate-200 bg-white p-1"><button title="Grid view" onClick={() => setViewMode("grid")} className={`flex h-8 w-9 items-center justify-center rounded-md ${viewMode === "grid" ? "bg-orange-500 text-white" : "text-slate-500"}`}><LayoutGrid className="h-4 w-4" /></button><button title="Table view" onClick={() => setViewMode("table")} className={`flex h-8 w-9 items-center justify-center rounded-md ${viewMode === "table" ? "bg-orange-500 text-white" : "text-slate-500"}`}><List className="h-4 w-4" /></button></div></div>{isLoading ? <div className="flex min-h-96 items-center justify-center rounded-lg border border-slate-200 bg-white"><Home className="h-8 w-8 animate-pulse text-orange-500" /></div> : apartmentsError ? <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-red-200 bg-white p-8 text-center"><Home className="mb-3 h-9 w-9 text-red-300" /><h3 className="font-black text-slate-800">Market data could not be loaded</h3><p className="mt-1 text-sm text-slate-500">{apartmentsError}</p><Button variant="outline" onClick={() => void refreshApartments()} className="mt-4 rounded-md font-bold">Try Again</Button></div> : filteredApartments.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center"><Search className="mb-3 h-9 w-9 text-slate-300" /><h3 className="font-black text-slate-800">No market properties found</h3><p className="mt-1 text-sm font-medium text-slate-500">Adjust the filters to broaden the results.</p><Button variant="outline" onClick={clearFilters} className="mt-4 rounded-md font-bold">Clear Filters</Button></div> : viewMode === "grid" ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredApartments.map((apartment) => <PropertyCard key={apartment.id} apartment={apartment} />)}</div> : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[820px]"><thead className="bg-slate-50"><tr>{["Property", "Location", "Rent", "Available Rooms", "Views", "Saved", "Action"].map((label) => <th key={label} className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredApartments.map((apartment) => { const imageUrl = getImageUrl(apartment); return <tr key={apartment.id} className="hover:bg-slate-50"><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-12 w-14 items-center justify-center overflow-hidden rounded-md bg-slate-100">{imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-slate-300" />}</span><strong className="max-w-48 truncate text-sm text-slate-900">{apartment.title || "Untitled property"}</strong></div></td><td className="px-4 py-3 text-xs font-medium text-slate-500">{apartment.address || apartment.city || "Unavailable"}</td><td className="px-4 py-3 text-sm font-black text-orange-600">₱{Number(apartment.price || 0).toLocaleString("en-PH")}</td><td className="px-4 py-3 text-sm font-bold text-emerald-700">{getAvailableRoomCount(apartment)}</td><td className="px-4 py-3 text-sm font-bold text-slate-700">{getViewCount(apartment.id)}</td><td className="px-4 py-3 text-sm font-bold text-slate-700">{getFavoriteCount(apartment.id)}</td><td className="px-4 py-3"><Button size="sm" onClick={() => navigate(`/apartment/${apartment.id}`)} className="rounded-md bg-orange-500 text-xs font-bold text-white hover:bg-orange-600">View Details</Button></td></tr>; })}</tbody></table></div>}</section>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
