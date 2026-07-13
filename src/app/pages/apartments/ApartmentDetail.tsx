import {
  AlertTriangle, ArrowLeft, Bath, BedDouble, Bell, Building2, CalendarDays,
  Check, CheckCircle2, ChevronLeft, ChevronRight, DoorOpen, Edit3, Heart,
  HelpCircle, Home, LayoutDashboard, LogOut, Mail, MapPin, Menu,
  Phone,
  Plus,
  Search, Settings, Share2, ShieldCheck,
  Sparkles,
  Square,
  TrendingUp,
  User,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { EditApartmentDialog } from "@/app/components/common/EditApartmentDialog";
import { EvidenceUploader, type EvidenceFile } from "@/app/components/common/EvidenceUploader";
import { LogoutConfirmation } from "@/app/components/common/LogoutConfirmation";
import { RoomImageGallery } from "@/app/components/common/RoomImageGallery";
import { VerifiedBadge } from "@/app/components/common/VerifiedBadge";
import { MapView } from "@/app/components/features/map/MapView";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import { useAuth } from "@/app/contexts/AuthContext";
import type { Apartment, ApartmentRoom } from "@/app/data/apartments";
import { fetchApartmentWithImages, getLandlordVerification, recordApartmentView, updateApartment } from "@/app/data/apartments";
import { useFavorites } from "@/app/hooks/useFavorites";
import { createReport, fetchPublicLandlordById, type DashboardUserRow } from "@/app/services/dashboardSupabaseService";
import { uploadReportEvidence } from "@/app/services/reportEvidenceService";
import { apartmentToFormValues } from "@/app/utils/apartmentMappers";
import { getImageUrl } from "@/app/utils/images";
import { isTenantVisibleApartment } from "@/app/utils/listingVisibility";

const STATUS_LABEL: Record<string, string> = { available: "Available", occupied: "Occupied", reserved: "Reserved", maintenance: "Maintenance" };
const STATUS_STYLE: Record<string, string> = { available: "bg-emerald-50 text-emerald-700", occupied: "bg-rose-50 text-rose-700", reserved: "bg-amber-50 text-amber-700", maintenance: "bg-violet-50 text-violet-700" };
const roomStatus = (room: ApartmentRoom) => room.status ?? (room.isOccupied ? "occupied" : "available");
const dateLabel = (value?: string) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};
const listFromUnknown = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  : typeof value === "string" ? value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean) : [];

export function ApartmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { user, canEditApartment, logout } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { apartments: contextApartments, refreshApartments } = useApartmentsContext();
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [landlord, setLandlord] = useState<DashboardUserRow | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDetails, setReportDetails] = useState("");
  const [reportContact, setReportContact] = useState("");
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ApartmentRoom | null>(null);
  const listingUpdatedAt = id ? contextApartments.find((item) => item.id === id)?.updatedAt : undefined;

  const returnTo = (() => {
    const value = (routeLocation.state as { returnTo?: unknown } | null)?.returnTo;
    return typeof value === "string" && value.startsWith("/") ? value : null;
  })();
  const backLabel = (() => {
    const value = (routeLocation.state as { backLabel?: unknown } | null)?.backLabel;
    return typeof value === "string" && value.trim() ? value : null;
  })();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) return setLoading(false);
      setLoading(true);
      try {
        const listing = await fetchApartmentWithImages(id);
        if (!active) return;
        setApartment(listing);
        let landlordVerified = false;
        if (listing?.landlordId) {
          const [owner, isVerified] = await Promise.all([fetchPublicLandlordById(listing.landlordId), getLandlordVerification(listing.landlordId)]);
          landlordVerified = isVerified;
          if (active) { setLandlord(owner); setVerified(isVerified); }
        } else if (active) {
          setLandlord(null);
          setVerified(false);
        }
        if (listing && isTenantVisibleApartment({ ...listing, landlordVerified }) && (user?.role === "student" || user?.role === "employee") && listing.landlordId !== user.id) {
          void recordApartmentView(listing.id, { id: user.id, authId: user.authId, email: user.email, name: user.name, role: user.role })
            .catch((error) => console.error("Unable to record apartment view:", error));
        }
      } catch (error) {
        console.error("Failed to load apartment:", error);
        if (active) setApartment(null);
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [id, listingUpdatedAt, user?.authId, user?.email, user?.id, user?.name, user?.role]);

  useEffect(() => {
    if (!selectedRoom?.id || !apartment?.rooms) return;
    setSelectedRoom(apartment.rooms.find((room) => room.id === selectedRoom.id) ?? null);
  }, [apartment?.rooms, selectedRoom?.id]);

  const images = useMemo(() => apartment
    ? [...new Set([apartment.image, ...apartment.images].filter(Boolean).map(getImageUrl))]
    : [], [apartment]);
  const favorite = apartment ? isFavorite(apartment.id) : false;
  const canEdit = apartment ? canEditApartment(apartment.id, apartment.landlordId) : false;
  const ownListing = user?.role === "landlord" && (apartment?.landlordId === user.id || canEdit);
  const renter = user?.role === "student" || user?.role === "employee";

  const handleBack = () => {
    if (returnTo) return navigate(returnTo);
    if (ownListing) return navigate("/dashboard?section=properties");
    navigate("/browse");
  };
  const shareListing = async () => {
    const data = { title: apartment?.title || "Apartment listing", text: apartment?.description || "", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Listing link copied."); }
    } catch (error) { if ((error as Error).name !== "AbortError") toast.error("Unable to share this listing."); }
  };
  const saveApartment = async (updated: Apartment) => {
    if (!apartment) return;
    try {
      const saved = await updateApartment(apartment.id, apartmentToFormValues(updated), user?.id);
      setApartment(saved); await refreshApartments(); toast.success("Apartment updated successfully.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update apartment."); }
  };
  const submitReport = async () => {
    if (!apartment || !user?.id) return;
    if (!reportDetails.trim()) return void toast.error("Please describe the problem.");
    setSubmittingReport(true);
    try {
      const report = await createReport({ reporter_id: user.id, reporter_role: user.role, apartment_id: apartment.id, category: "Apartment problem", issue_type: "Tenant-submitted problem", tags: [], details: reportDetails.trim(), contact: reportContact.trim() || user.email, date_of_incident: null, landlord_id: apartment.landlordId, has_evidence: true, evidence_count: evidence.length });
      if (!report?.id) throw new Error("Unable to save report.");
      const uploads = await Promise.all(evidence.map((item) => uploadReportEvidence({ reportId: report.id!, file: item.file, fileName: item.fileName, fileType: item.fileType, mimeType: item.mimeType, uploadedBy: user.id })));
      if (uploads.some((result) => !result)) throw new Error("Report saved, but one or more evidence files could not be uploaded. Please contact support.");
      setReportOpen(false); setReportDetails(""); setReportContact(""); setEvidence([]); toast.success("Report submitted for admin review.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to submit report."); }
    finally { setSubmittingReport(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 grid place-items-center text-sm font-semibold text-slate-500">Loading apartment details...</div>;
  if (!apartment) return <div className="min-h-screen bg-slate-50 grid place-items-center p-6 text-center"><div><Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" /><h1 className="text-2xl font-bold">Apartment not found</h1><Button className="mt-5" onClick={() => navigate("/browse")}>Back to Browse</Button></div></div>;
  if (!ownListing && user?.role !== "admin" && !isTenantVisibleApartment({ ...apartment, landlordVerified: verified })) return <div className="min-h-screen bg-slate-50 grid place-items-center p-6 text-center"><div><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-orange-500" /><h1 className="text-2xl font-bold">Listing not available</h1><p className="mt-2 max-w-md text-sm font-medium text-slate-500">This apartment becomes visible after the property is approved, published, active, and its landlord is verified.</p><Button className="mt-5" onClick={handleBack}>Go Back</Button></div></div>;

  const locationText = [apartment.address, apartment.city, apartment.state, apartment.zip].filter(Boolean).join(", ") || "Location not provided";
  const status = apartment.status ?? "available";
  const availableRooms = apartment.rooms?.filter((room) => roomStatus(room) === "available").length ?? 0;
  const maxOccupants = apartment.rooms?.reduce((total, room) => total + (room.maxOccupants || 0), 0) || 0;
  const featureRecord = !Array.isArray(apartment.features) && apartment.features ? apartment.features : {};
  const rules = listFromUnknown((featureRecord as Record<string, unknown>).safetyRules ?? (featureRecord as Record<string, unknown>).houseRules);
  const propertyFeatures = [apartment.petFriendly && "Pet Friendly", apartment.parking && "Parking", apartment.furnished && "Furnished", ...listFromUnknown((featureRecord as Record<string, unknown>).customFeatures)].filter(Boolean) as string[];
  const landlordName = landlord?.name || "Not provided";

  const sidebarItems = user?.role === "landlord"
    ? [{ label: "Dashboard", icon: LayoutDashboard, href: "/dashboard?section=overview" }, { label: "My Properties", icon: Building2, href: "/dashboard?section=properties" }, { label: "Activity", icon: TrendingUp, href: "/dashboard?section=activity" }, { label: "Notifications", icon: Bell, href: "/dashboard?section=notifications" }, { label: "Add Property", icon: Home, href: "/add-apartment" }, { label: "Browse All", icon: Search, href: "/browse" }, { label: "Settings", icon: Settings, href: "/dashboard?section=settings" }, { label: "Help & Support", icon: HelpCircle, href: "/dashboard?section=help" }]
    : [{ label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" }, { label: "Browse All", icon: Search, href: "/browse" }, { label: "Favorites", icon: Heart, href: "/favorites" }, { label: "Settings", icon: Settings, href: "/settings" }];

  const activeSidebarLabel = ownListing ? "My Properties" : "Browse All";
  const Sidebar = () => {
    if (user?.role !== "landlord") {
      const portalLabel = user?.role === "student" ? "Student Portal" : "Employee Portal";
      const displayName = user?.name?.trim();

      return (
        <aside className="app-sidebar flex h-full w-64 flex-col bg-[#07142f] text-white shadow-2xl shadow-slate-900/40">
          <div className="app-sidebar-brand px-5 pb-5 pt-6">
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2.5 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-950/30">
                <Home className="h-6 w-6 fill-white/20 text-white" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white">Rent<span className="text-orange-500">Iloilo</span></span>
                <p className="-mt-0.5 text-xs font-medium text-white/50">{portalLabel}</p>
              </div>
            </button>
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
            </div>
          </div>

          <nav className="space-y-1 px-3 py-3">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Main</p>
            {[
              { label: "Overview", icon: LayoutDashboard, href: "/dashboard?section=overview" },
              { label: "My Favorites", icon: Heart, href: "/favorites" },
              { label: "Suggested", icon: Sparkles, href: "/dashboard?section=suggested" },
              { label: "Popular", icon: TrendingUp, href: "/dashboard?section=popular" },
            ].map(({ label, icon: Icon, href }) => (
              <button key={label} onClick={() => navigate(href)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-white/65 transition hover:bg-white/10 hover:text-white">
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          <nav className="space-y-1 border-t border-white/10 px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Browse</p>
            <button aria-current="page" onClick={() => navigate("/browse")} className="flex w-full items-center gap-3 rounded-lg bg-orange-500 px-3 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/25">
              <Search className="h-4 w-4 shrink-0" />
              Browse All
            </button>
          </nav>

          <nav className="space-y-1 border-t border-white/10 px-3 py-4">
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/35">Account</p>
            {[
              { label: "Settings", icon: Settings, href: "/dashboard?section=settings" },
              { label: "Report a Problem", icon: AlertTriangle, href: "/dashboard?section=report" },
              { label: "Help", icon: HelpCircle, href: "/dashboard?section=help" },
            ].map(({ label, icon: Icon, href }) => (
              <button key={label} onClick={() => navigate(href)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-white/65 transition hover:bg-white/10 hover:text-white">
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/10 px-4 py-4">
            <LogoutConfirmation onConfirm={() => { logout?.(); navigate("/"); }}>
              <button className="app-sidebar-logout flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10 hover:text-red-300">
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </LogoutConfirmation>
          </div>
        </aside>
      );
    }
    const main = sidebarItems.slice(0, 4);
    const manage = sidebarItems.slice(4, 6);
    const account = sidebarItems.slice(6);
    const navGroup = (items: typeof sidebarItems) => items.map(({ label, icon: Icon, href }) => <button key={label} aria-current={label === activeSidebarLabel ? "page" : undefined} onClick={() => { navigate(href); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${label === activeSidebarLabel ? "bg-orange-500 text-white shadow-md shadow-orange-950/30" : "text-white/60 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4 shrink-0" />{label}{label === "Add Property" && <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-lg bg-orange-500"><Plus className="h-3 w-3" /></span>}</button>);
    return <aside className="app-sidebar flex h-full w-60 flex-col overflow-y-auto bg-slate-950 text-white">
      <div className="app-sidebar-brand border-b border-white/10 px-5 pb-4 pt-6"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 shadow-sm"><Sparkles className="h-4 w-4" /></span><strong className="text-lg font-black tracking-tight">RentIloilo</strong></div><p className="ml-10 mt-1 text-xs font-medium text-white/30">Landlord Portal</p></div>
      <div className="border-b border-white/10 px-4 py-4"><div className="app-sidebar-profile flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-sm font-black shadow-sm">{user.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{user.name || "Name unavailable"}</strong><span className="block truncate text-xs text-white/40">{user.email}</span></span>{verified && <ShieldCheck className="h-4 w-4 shrink-0 text-green-400" />}</div></div>
      <nav className="px-3 pb-2 pt-4"><p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/25">Main</p><div className="space-y-0.5">{navGroup(main)}</div></nav>
      <nav className="mt-2 border-t border-white/10 px-3 pb-2 pt-3"><p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/25">Manage</p><div className="space-y-0.5">{navGroup(manage)}</div></nav>
      <nav className="mt-2 border-t border-white/10 px-3 pb-2 pt-3"><p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-white/25">Account</p><div className="space-y-0.5">{navGroup(account)}</div></nav>
      <div className="flex-1" /><div className="mt-2 border-t border-white/10 px-4 py-4"><LogoutConfirmation onConfirm={() => { logout(); navigate("/"); }}><button className="app-sidebar-logout flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"><LogOut className="h-4 w-4" />Log Out</button></LogoutConfirmation></div>
    </aside>;
  };

  return (
    <div className="app-shell fixed inset-0 z-50 overflow-hidden bg-[#f6f7f9] text-slate-950">
      <div className="app-shell-frame flex h-full">
      <aside className="app-shell-sidebar hidden h-full w-64 shrink-0 flex-col bg-[#07142f] shadow-xl lg:flex">{Sidebar()}</aside>
      {mobileNav && <div className="app-sidebar-overlay fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0" onClick={() => setMobileNav(false)} /><div className="app-sidebar-drawer relative h-full w-60">{Sidebar()}<button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="app-sidebar-close absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md bg-white/10"><X className="h-4 w-4" /></button></div></div>}
      <div className="app-shell-main h-full min-w-0 flex-1 overflow-y-auto pb-24 lg:pb-20"><main className="app-shell-content app-shell-content-mobile-nav"><div className="mx-auto max-w-[1380px]">
        <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><button aria-label="Open navigation" onClick={() => setMobileNav(true)} className="app-sidebar-trigger grid h-10 w-10 place-items-center rounded-lg border bg-white lg:hidden"><Menu className="h-5 w-5" /></button><Button variant="ghost" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" />{backLabel ?? (ownListing ? "Back to My Properties" : "Back to Browse")}</Button></div><div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => void shareListing()} title="Share listing"><Share2 className="h-4 w-4" /></Button>{!ownListing && user?.role !== "admin" && <Button variant="outline" size="icon" onClick={() => void toggleFavorite(apartment.id)} title={favorite ? "Remove favorite" : "Add favorite"}><Heart className={`h-5 w-5 ${favorite ? "fill-rose-500 text-rose-500" : ""}`} /></Button>}{canEdit && <Button onClick={() => setEditOpen(true)} className="bg-orange-500 hover:bg-orange-600"><Edit3 className="mr-2 h-4 w-4" />Edit</Button>}</div></div>

        <header className="mb-5 grid gap-4 lg:grid-cols-[1fr_330px] lg:items-end"><div><Badge className="mb-3 rounded-md bg-orange-50 text-orange-700">For Rent</Badge><h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-4xl">{apartment.title || "Untitled apartment"}</h1><div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500"><span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-orange-500" />{locationText}</span>{verified && <VerifiedBadge label="Verified Landlord" />}</div></div><div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-lg"><p className="text-xl font-black">Room pricing</p><p className="mt-1 text-sm font-semibold text-orange-50">View each room for its monthly rent.</p><div className="mt-4 flex items-center justify-between border-t border-white/25 pt-3 text-xs font-bold"><span>{STATUS_LABEL[status]}</span><span>{availableRooms} rooms available</span></div></div></header>

        <section className="mb-5"><div className="relative aspect-[16/8] min-h-64 overflow-hidden rounded-lg bg-slate-200 shadow-sm">{images.length ? <img src={images[imageIndex]} alt={`${apartment.title} image ${imageIndex + 1}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm font-semibold text-slate-500">No images uploaded</div>}{images.length > 1 && <><button onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow"><ChevronLeft /></button><button onClick={() => setImageIndex((imageIndex + 1) % images.length)} className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow"><ChevronRight /></button><span className="absolute left-4 top-4 rounded-md bg-slate-950/75 px-3 py-1 text-xs font-bold text-white">{imageIndex + 1} / {images.length}</span></>}</div>{images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-1">{images.map((source, index) => <button key={`${source}-${index}`} onClick={() => setImageIndex(index)} className={`h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 ${index === imageIndex ? "border-orange-500" : "border-transparent"}`}><img src={source} alt={`${apartment.title} thumbnail ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}</section>

        <section className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-slate-200 shadow-sm sm:grid-cols-5">{[{ label: "Bedrooms", value: apartment.bedrooms || "Not provided", icon: BedDouble }, { label: "Bathrooms", value: apartment.bathrooms || "Not provided", icon: Bath }, { label: "Floor Area", value: apartment.sqft ? `${apartment.sqft} sq ft` : "Not provided", icon: Square }, { label: "Max Occupants", value: maxOccupants || "Not provided", icon: Users }, { label: "Date Posted", value: dateLabel(apartment.createdAt), icon: CalendarDays }].map(({ label, value, icon: Icon }) => <div key={label} className="flex min-h-24 items-center gap-3 bg-white p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600"><Icon className="h-5 w-5" /></span><span><strong className="block text-sm">{value}</strong><span className="text-[10px] font-semibold text-slate-500">{label}</span></span></div>)}</section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]"><div className="space-y-5">
          <section className="rounded-lg border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">About this apartment</h2><p className="mt-3 text-sm font-medium leading-7 text-slate-600">{apartment.description || "No description provided."}</p><div className="mt-4 flex flex-wrap gap-2">{[...apartment.amenities, ...propertyFeatures].length ? [...new Set([...apartment.amenities, ...propertyFeatures])].map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2 text-xs font-bold text-slate-700"><Check className="h-3.5 w-3.5 text-orange-600" />{item}</span>) : <p className="text-sm text-slate-500">No amenities provided.</p>}</div></section>
          <section className="rounded-lg border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black">Rooms & Amenities</h2><p className="text-xs text-slate-500">Current room availability from the landlord.</p></div><Badge className="bg-emerald-50 text-emerald-700">{availableRooms} available</Badge></div>{apartment.rooms?.length ? <div className="space-y-3">{apartment.rooms.map((room, index) => <button type="button" key={room.id || index} onClick={() => setSelectedRoom(room)} className="w-full overflow-hidden rounded-lg border bg-slate-50 text-left transition hover:border-orange-200 hover:bg-orange-50/40 focus:outline-none focus:ring-2 focus:ring-orange-200"><div className="grid sm:grid-cols-[150px_1fr]">{room.images?.[0] ? <img src={getImageUrl(room.images[0])} alt={room.name || `Room ${index + 1}`} className="h-36 w-full object-cover sm:h-full" /> : <div className="grid min-h-28 place-items-center bg-slate-100"><DoorOpen className="h-7 w-7 text-slate-300" /></div>}<div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{room.name || `Room ${index + 1}`}</h3><p className="text-xs text-slate-500">{room.type || "Room type not provided"}</p></div><Badge className={STATUS_STYLE[roomStatus(room)]}>{STATUS_LABEL[roomStatus(room)]}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><span><b>₱{Number(room.price || 0).toLocaleString("en-PH")}</b><small className="block text-slate-500">Monthly rent</small></span><span><b>{room.maxOccupants || "-"}</b><small className="block text-slate-500">Capacity</small></span><span><b>{room.hasPrivateBath ? "Private" : "Shared"}</b><small className="block text-slate-500">Bathroom</small></span><span><b>{room.hasAC ? "Yes" : "No"}</b><small className="block text-slate-500">Air conditioning</small></span></div>{room.description && <p className="mt-3 text-xs leading-5 text-slate-600">{room.description}</p>}<p className="mt-3 text-xs font-black text-orange-600">View room details</p></div></div></button>)}</div> : <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">No room information available.</div>}</section>
          <section className="rounded-lg border bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-black">Location</h2>{Number.isFinite(apartment.lat) && Number.isFinite(apartment.lng) ? <div className="h-[360px] overflow-hidden rounded-lg"><MapView lat={apartment.lat} lng={apartment.lng} zoom={15} showSingleMarker /></div> : <div className="grid h-48 place-items-center rounded-lg bg-slate-50 text-sm text-slate-500">Map location not provided.</div>}<p className="mt-3 flex gap-2 text-sm text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />{locationText}</p></section>
        </div><aside className="space-y-5">
          <section className="rounded-lg border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Landlord Information</h2><div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-orange-100 font-black text-orange-700">{landlordName === "Not provided" ? "L" : landlordName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</span><div><strong className="block">{landlordName}</strong>{verified && <VerifiedBadge label="Verified Landlord" className="mt-1" />}</div></div><div className="mt-4 space-y-2 text-sm text-slate-600"><p className="flex gap-2"><Mail className="h-4 w-4" />{landlord?.email || "Email not provided"}</p><p className="flex gap-2"><Phone className="h-4 w-4" />{landlord?.mobile || landlord?.mobileNumber || "Phone not provided"}</p></div></section>
          <section className="rounded-lg border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Property Details</h2><dl className="mt-4 space-y-3 text-sm">{[{ label: "Property Type", value: apartment.propertyType || "Not provided" }, { label: "Available Date", value: dateLabel(apartment.availableDate) }, { label: "Utilities", value: Array.isArray(apartment.utilities) && apartment.utilities.length ? apartment.utilities.join(", ") : "Not included" }, { label: "Status", value: STATUS_LABEL[status] }, { label: "ZIP Code", value: apartment.zip || "Not provided" }].map(({ label, value }) => <div key={label} className="flex justify-between gap-4 border-b pb-2 last:border-0"><dt className="text-slate-500">{label}</dt><dd className="text-right font-bold">{value}</dd></div>)}</dl></section>
          <section className="rounded-lg border bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Safety & Rules</h2>{rules.length ? <ul className="mt-4 space-y-2">{rules.map((rule) => <li key={rule} className="flex gap-2 text-sm text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{rule}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No safety rules provided.</p>}</section>
          {renter && <section className="rounded-lg border border-orange-100 bg-orange-50 p-5 shadow-sm"><div className="flex gap-3"><AlertTriangle className="h-6 w-6 shrink-0 text-orange-600" /><div><h2 className="font-black">Report a Problem</h2><p className="mt-1 text-xs leading-5 text-slate-600">Let us know about any issues you encountered with an apartment listing.</p></div></div><Button variant="outline" onClick={() => setReportOpen(true)} className="mt-4 w-full border-orange-300 text-orange-700 hover:bg-orange-100">Report a Problem</Button></section>}
        </aside></div>
      </div></main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur lg:left-64"><div className="mx-auto flex max-w-[1380px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8"><div className="mr-auto"><strong className="block text-sm font-black text-orange-600">Prices are listed per room</strong><span className="text-xs font-bold text-emerald-600">{STATUS_LABEL[status]}</span></div>{!ownListing && user?.role !== "admin" && <Button variant="outline" onClick={() => void toggleFavorite(apartment.id)}><Heart className={`mr-2 h-4 w-4 ${favorite ? "fill-rose-500 text-rose-500" : ""}`} /><span className="hidden sm:inline">{favorite ? "Saved" : "Add to Favorites"}</span></Button>}</div></div>
      </div>
      </div>

      {editOpen && <EditApartmentDialog apartment={apartment} open={editOpen} onOpenChange={setEditOpen} onSave={saveApartment} />}
      {selectedRoom && <div className="fixed inset-0 z-[115] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" onClick={() => setSelectedRoom(null)}>
        <div className="my-8 w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-black text-slate-950">{selectedRoom.name || "Room details"}</h2><p className="text-sm font-medium text-slate-500">{selectedRoom.type || "Room type not provided"}</p></div><button onClick={() => setSelectedRoom(null)} className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="h-4 w-4" /></button></div>
          <div className="grid gap-6 p-5 md:grid-cols-2">
            <RoomImageGallery images={selectedRoom.images} roomName={selectedRoom.name || "Room"} />
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2"><Badge className={STATUS_STYLE[roomStatus(selectedRoom)]}>{STATUS_LABEL[roomStatus(selectedRoom)]}</Badge>{selectedRoom.sqft ? <Badge className="bg-slate-100 text-slate-700">{selectedRoom.sqft} sq ft</Badge> : null}</div>
              <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Monthly rent</p><p className="mt-1 font-black text-slate-950">₱{Number(selectedRoom.price || 0).toLocaleString("en-PH")}</p></div><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Capacity</p><p className="mt-1 font-black text-slate-950">{selectedRoom.maxOccupants || "Not provided"}</p></div><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Bathroom</p><p className="mt-1 font-black text-slate-950">{selectedRoom.hasPrivateBath ? "Private" : selectedRoom.bathroomType || "Shared"}</p></div><div className="rounded-lg border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Air conditioning</p><p className="mt-1 font-black text-slate-950">{selectedRoom.hasAC ? "Yes" : "No"}</p></div></div>
              <div><h3 className="font-black text-slate-950">Amenities</h3><div className="mt-2 flex flex-wrap gap-2"><Badge className="bg-blue-50 text-blue-700">{selectedRoom.hasPrivateBath ? "Private bathroom" : "Shared bathroom"}</Badge>{selectedRoom.hasAC && <Badge className="bg-blue-50 text-blue-700">Air conditioning</Badge>}</div></div>
              {selectedRoom.sharedBathLocation && <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm"><p className="font-black text-blue-900">Shared bathroom location</p><p className="mt-1 font-medium text-blue-700">{selectedRoom.sharedBathLocation}</p></div>}
              <div><h3 className="font-black text-slate-950">Description</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-600">{selectedRoom.description || "No room description provided."}</p></div>
            </div>
          </div>
        </div>
      </div>}
      {reportOpen && <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" onClick={() => setReportOpen(false)}><div className="my-8 w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-black">Report a Problem</h2><p className="text-xs text-slate-500">Let us know about any issues you encountered with an apartment listing.</p></div><button onClick={() => setReportOpen(false)} className="grid h-9 w-9 place-items-center rounded-md bg-slate-100"><X className="h-4 w-4" /></button></div><div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto"><section className="p-5"><div className="mb-3"><p className="text-xs font-black uppercase tracking-widest text-orange-600">1 Select Apartment</p><p className="mt-1 text-xs text-slate-500">Choose the apartment listing related to your report.</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">{apartment.title || "Untitled apartment"}</div></section><section className="p-5"><div className="mb-3"><p className="text-xs font-black uppercase tracking-widest text-orange-600">2 Describe the Problem</p><p className="mt-1 text-xs text-slate-500">Please provide as much detail as possible.</p></div><div className="relative"><textarea rows={5} maxLength={500} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} className="min-h-36 w-full resize-none rounded-lg border border-slate-200 p-4 text-sm font-medium outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100" placeholder="Describe what you experienced in as much detail as possible..." /><span className="absolute bottom-3 right-4 text-xs font-bold text-slate-400">{reportDetails.length}/500</span></div></section><section className="p-5"><div className="mb-3"><p className="text-xs font-black uppercase tracking-widest text-violet-600">3 Upload Image / Evidence <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">Optional</span></p><p className="mt-1 text-xs text-slate-500">Attach images or documents that can help us understand the issue.</p></div><EvidenceUploader evidenceFiles={evidence} onEvidenceChange={setEvidence} maxFiles={5} maxFileSize={10} required={false} /><div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 p-4"><p className="text-sm font-black text-violet-900">Evidence helps us review your report faster.</p><p className="mt-1 text-xs font-medium text-violet-700">Clear screenshots, photos, or documents are very helpful.</p></div></section><section className="p-5"><div className="mb-3"><p className="text-xs font-black uppercase tracking-widest text-emerald-600">4 Contact Information</p><p className="mt-1 text-xs text-slate-500">We may contact you for more details if needed.</p></div><input value={reportContact} onChange={(event) => setReportContact(event.target.value)} placeholder={user?.email || "Enter your email address"} className="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100" /></section></div><div className="grid gap-3 border-t bg-slate-50/70 p-5 sm:grid-cols-[1fr_1.3fr]"><Button variant="outline" onClick={() => { setReportDetails(""); setReportContact(user?.email || ""); setEvidence([]); }} disabled={submittingReport} className="h-12 rounded-lg border-slate-200 font-black text-slate-600 hover:bg-white">Clear Form</Button><Button onClick={() => void submitReport()} disabled={submittingReport || !reportDetails.trim()} className="h-12 rounded-lg bg-orange-500 font-black text-white hover:bg-orange-600">{submittingReport ? "Submitting..." : "Submit Report"}</Button></div></div></div>}
    </div>
  );
}
