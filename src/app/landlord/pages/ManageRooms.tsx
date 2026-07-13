import {
  ArrowLeft,
  Bath,
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  DoorOpen,
  Edit3,
  HelpCircle,
  Home,
  LayoutDashboard,
  ListPlus,
  LogOut,
  MapPin,
  Menu,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  Wind,
  Wrench,
  X,
} from "lucide-react";
import { LogoutConfirmation } from "@/app/shared/components/common/LogoutConfirmation";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { MultiImageUploader, type UploadedImage } from "@/app/shared/components/common/MultiImageUploader";
import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/shared/components/ui/card";
import { Input } from "@/app/shared/components/ui/input";
import { Label } from "@/app/shared/components/ui/label";
import { Switch } from "@/app/shared/components/ui/switch";
import { Textarea } from "@/app/shared/components/ui/textarea";
import { useApartmentsContext } from "@/app/shared/contexts/ApartmentsContext";
import { useAuth } from "@/app/shared/contexts/AuthContext";
import { supabase } from "@/lib/supabaseclient";
import {
  createApartmentRoom,
  deleteApartmentRoom,
  fetchApartmentRooms,
  fetchApartmentWithImages,
  updateApartmentRoom,
  updateApartmentRoomStatus,
  uploadApartmentRoomImage,
  type Apartment,
  type ApartmentRoom,
  type ApartmentStatus,
} from "@/app/shared/data/apartments";

const ROOM_TYPES = ["Bedroom", "Studio", "Shared room", "Suite", "Loft", "Other"];
const ROOM_STATUS_OPTIONS: Array<{ value: ApartmentStatus; label: string; className: string }> = [
  { value: "available", label: "Available", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "occupied", label: "Occupied", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { value: "maintenance", label: "Maintenance", className: "border-violet-200 bg-violet-50 text-violet-700" },
];

type RoomFormState = {
  id?: string;
  name: string;
  type: string;
  price: string;
  maxOccupants: string;
  sqft: string;
  description: string;
  hasPrivateBath: boolean;
  bathroomType: string;
  sharedBathLocation: string;
  hasAC: boolean;
  status: ApartmentStatus;
};

const emptyRoomForm = (): RoomFormState => ({
  name: "",
  type: "Bedroom",
  price: "",
  maxOccupants: "",
  sqft: "",
  description: "",
  hasPrivateBath: false,
  bathroomType: "",
  sharedBathLocation: "",
  hasAC: false,
  status: "available",
});

const roomToForm = (room: ApartmentRoom): RoomFormState => ({
  id: room.id,
  name: room.name ?? "",
  type: room.type || "Bedroom",
  price: room.price ? String(room.price) : "",
  maxOccupants: room.maxOccupants ? String(room.maxOccupants) : "",
  sqft: String(room.sqft ?? ""),
  description: room.description ?? "",
  hasPrivateBath: room.hasPrivateBath === true,
  bathroomType: room.bathroomType || "en-suite",
  sharedBathLocation: room.sharedBathLocation ?? "",
  hasAC: room.hasAC === true,
  status: room.status ?? (room.isOccupied ? "occupied" : "available"),
});

const statusForRoom = (room: ApartmentRoom): ApartmentStatus =>
  room.status ?? (room.isOccupied ? "occupied" : "available");

const getStatusOption = (status: ApartmentStatus | undefined) =>
  ROOM_STATUS_OPTIONS.find((option) => option.value === status) ?? ROOM_STATUS_OPTIONS[0];

const formatDate = (value?: string) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const compressRoomImage = async (source: File | Blob): Promise<Blob> => {
  if (source.size <= 1.5 * 1024 * 1024 || typeof createImageBitmap !== "function") return source;
  try {
    const bitmap = await createImageBitmap(source);
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob ?? source), "image/webp", 0.82));
  } catch {
    return source;
  }
};

const navGroups = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard?section=overview" },
      { label: "My Properties", icon: Building2, href: "/dashboard?section=properties", active: true },
      { label: "Activity", icon: TrendingUp, href: "/dashboard?section=activity" },
      { label: "Notifications", icon: Bell, href: "/dashboard?section=notifications" },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Add Property", icon: ListPlus, href: "/add-apartment" },
      { label: "Browse All", icon: Search, href: "/browse" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", icon: Settings, href: "/dashboard?section=settings" },
      { label: "Help", icon: HelpCircle, href: "/dashboard?section=help" },
    ],
  },
];

export function ManageRooms() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { refreshApartments } = useApartmentsContext();
  const [property, setProperty] = useState<Apartment | null>(null);
  const [rooms, setRooms] = useState<ApartmentRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openRoomMenuId, setOpenRoomMenuId] = useState<string | null>(null);
  const [roomImages, setRoomImages] = useState<UploadedImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [form, setForm] = useState<RoomFormState>(emptyRoomForm);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [loadedProperty, loadedRooms] = await Promise.all([
          fetchApartmentWithImages(id),
          fetchApartmentRooms(id),
        ]);
        if (!active) return;
        setProperty(loadedProperty);
        setRooms(loadedRooms);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load rooms.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const refreshRooms = () => { void fetchApartmentRooms(id).then(setRooms).catch(() => undefined); };
    const refreshProperty = () => { void fetchApartmentWithImages(id).then(setProperty).catch(() => undefined); };
    const channel = supabase
      .channel(`manage-rooms-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms", filter: `apartment_id=eq.${id}` }, refreshRooms)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "apartments", filter: `id=eq.${id}` }, refreshProperty)
      .subscribe();
    const refreshOnFocus = () => { refreshRooms(); refreshProperty(); };
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      void supabase.removeChannel(channel);
    };
  }, [id]);

  const roomCounts = useMemo(() => ({
    total: rooms.length,
    available: rooms.filter((room) => statusForRoom(room) === "available").length,
    occupied: rooms.filter((room) => statusForRoom(room) === "occupied").length,
    maintenance: rooms.filter((room) => statusForRoom(room) === "maintenance").length,
  }), [rooms]);

  if (user?.role !== "landlord") return <Navigate to="/dashboard" replace />;

  const canManage = property && property.landlordId === user.id;
  const resetForm = () => { setForm(emptyRoomForm()); setRoomImages([]); setUploadProgress(null); setFormOpen(false); };
  const openAddForm = () => { setForm(emptyRoomForm()); setRoomImages([]); setUploadProgress(null); setFormOpen(true); };
  const openEditForm = (room: ApartmentRoom) => {
    setForm(roomToForm(room));
    setRoomImages((room.images ?? []).map((url, index) => ({ id: `existing-${index}`, url, isPrimary: index === 0, sortOrder: index })));
    setUploadProgress(null);
    setFormOpen(true);
  };

  const formToRoom = (): ApartmentRoom => ({
    id: form.id,
    name: form.name.trim(),
    type: form.type,
    price: Number(form.price) || 0,
    maxOccupants: Number(form.maxOccupants) || 1,
    sqft: Number(form.sqft) || 0,
    description: form.description.trim(),
    hasPrivateBath: form.hasPrivateBath,
    bathroomType: form.hasPrivateBath ? form.bathroomType || "en-suite" : "",
    sharedBathLocation: form.hasPrivateBath ? "" : form.sharedBathLocation.trim(),
    hasAC: form.hasAC,
    status: form.status,
    isOccupied: form.status === "occupied",
    images: roomImages.map((image) => image.url),
  });

  const uploadPendingRoomImages = async (): Promise<string[]> => {
    if (!id) return [];
    const ordered = [...roomImages].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
    const roomUploadId = form.id || crypto.randomUUID();
    const urls: string[] = [];
    const pendingCount = ordered.filter((image) => image.file || image.url.startsWith("data:")).length;
    let completedUploads = 0;
    setUploadProgress(pendingCount > 0 ? 0 : null);
    for (let index = 0; index < ordered.length; index += 1) {
      const image = ordered[index];
      if (!image.file && !image.url.startsWith("data:")) {
        urls.push(image.url);
      } else {
        const source = image.file ?? await (await fetch(image.url)).blob();
        const compressed = await compressRoomImage(source);
        const originalName = image.file instanceof File ? image.file.name : `room-image-${index}.webp`;
        const uploadName = compressed !== source && compressed.type === "image/webp"
          ? `${originalName.replace(/\.[^.]+$/, "")}.webp`
          : originalName;
        urls.push(await uploadApartmentRoomImage(id, roomUploadId, compressed, uploadName));
        completedUploads += 1;
        setUploadProgress((completedUploads / pendingCount) * 100);
      }
    }
    return urls;
  };

  const saveRoom = async () => {
    if (!id) return;
    if (!form.name.trim()) return void toast.error("Please enter a room number or name.");
    if (!form.price || Number(form.price) < 0) return void toast.error("Please enter a valid monthly rent.");
    if (Number(form.maxOccupants) < 1) return void toast.error("Room capacity must be at least one.");
    setIsSaving(true);
    try {
      const uploadedImageUrls = await uploadPendingRoomImages();
      const room = { ...formToRoom(), images: uploadedImageUrls };
      if (form.id) {
        const updated = await updateApartmentRoom(id, form.id, room, user.id);
        setRooms((current) => current.map((item) => item.id === form.id ? updated : item));
        toast.success("Room updated");
      } else {
        const created = await createApartmentRoom(id, room, user.id);
        setRooms((current) => [...current, created]);
        toast.success("Room added");
      }
      await refreshApartments();
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save room.");
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const changeRoomStatus = async (room: ApartmentRoom, status: ApartmentStatus) => {
    if (!id || !room.id) return;
    setOpenRoomMenuId(null);
    try {
      await updateApartmentRoomStatus(id, room.id, status, user.id);
      setRooms((current) => current.map((item) => item.id === room.id
        ? { ...item, status, isOccupied: status === "occupied" }
        : item));
      await refreshApartments();
      toast.success("Room status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update room status.");
    }
  };

  const removeRoom = async (room: ApartmentRoom) => {
    if (!id || !room.id) return;
    const roomName = room.name || "this room";
    if (!window.confirm(`Are you sure you want to delete ${roomName}?\n\nThis removes only this room, not the property.`)) return;
    try {
      await deleteApartmentRoom(id, room.id, user.id);
      setRooms((current) => current.filter((item) => item.id !== room.id));
      await refreshApartments();
      toast.success("Room deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete room.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 grid place-items-center text-sm font-semibold text-slate-500">Loading room management...</div>;
  }

  if (!property || !canManage) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6 text-center">
        <div>
          <DoorOpen className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <h1 className="mb-2 text-2xl font-bold text-slate-950">Property Not Available</h1>
          <p className="mb-6 text-sm text-slate-500">This property could not be found or is not assigned to your account.</p>
          <Button onClick={() => navigate("/dashboard?section=properties")}>Back to My Properties</Button>
        </div>
      </div>
    );
  }

  const address = [property.address, property.city, property.state, property.zip].filter(Boolean).join(", ");
  const propertyStatus = property.status
    ? getStatusOption(property.status)
    : property.isPublished
      ? getStatusOption("available")
      : { label: "Unpublished", className: "border-slate-200 bg-slate-100 text-slate-600" };
  const initials = (user.name || user.email || "L").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const sidebar = (
    <aside className="app-sidebar flex h-full w-[250px] flex-col bg-[#07172b] px-4 py-5 text-white">
      <button onClick={() => navigate("/dashboard?section=overview")} className="app-sidebar-brand mb-6 flex items-center gap-3 px-2 pb-4 text-left">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-orange-500"><Home className="h-6 w-6" /></span>
        <span><strong className="block text-xl">Rent<span className="text-orange-500">Iloilo</span></strong><small className="text-slate-400">Landlord Portal</small></span>
      </button>
      <div className="app-sidebar-profile mb-6 rounded-lg border border-white/10 bg-white/[0.06] p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-500 font-bold">{initials}</span>
          <div className="min-w-0"><p className="truncate text-sm font-bold">{user.name || "Landlord"}</p><p className="truncate text-xs text-slate-400">{user.email}</p><p className="mt-1 text-xs text-emerald-400">Online</p></div>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ label, icon: Icon, href, active }) => (
                <button key={label} aria-current={active ? "page" : undefined} onClick={() => { navigate(href); setSidebarOpen(false); }} className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${active ? "bg-orange-500 text-white shadow-lg shadow-orange-950/20" : "text-slate-300 hover:bg-white/[0.07] hover:text-white"}`}>
                  <Icon className="h-[18px] w-[18px]" /><span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <LogoutConfirmation onConfirm={handleLogout}><button className="app-sidebar-logout mt-3 flex h-11 items-center justify-center gap-2 rounded-lg border border-rose-500/30 text-sm font-bold text-rose-400 hover:bg-rose-500/10"><LogOut className="h-4 w-4" />Log Out</button></LogoutConfirmation>
    </aside>
  );

  const summaryCards = [
    { label: "Total Rooms", helper: "All rooms in this property", value: roomCounts.total, icon: DoorOpen, iconClass: "bg-orange-50 text-orange-600", border: "border-orange-100" },
    { label: "Available", helper: "Ready for tenants", value: roomCounts.available, icon: CheckCircle2, iconClass: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
    { label: "Occupied", helper: "Currently rented", value: roomCounts.occupied, icon: BedDouble, iconClass: "bg-rose-50 text-rose-600", border: "border-rose-100" },
    { label: "Maintenance", helper: "Temporarily unavailable", value: roomCounts.maintenance, icon: Wrench, iconClass: "bg-violet-50 text-violet-600", border: "border-violet-100" },
  ];

  return (
    <div className="app-shell min-h-screen bg-[#f7f8fa] text-slate-950">
      <div className="app-shell-fixed-sidebar fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
      {sidebarOpen && <div className="app-sidebar-overlay fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0" onClick={() => setSidebarOpen(false)} /><div className="app-sidebar-drawer relative h-full w-[250px]">{sidebar}<button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="app-sidebar-close absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md bg-white/10"><X className="h-4 w-4" /></button></div></div>}

      <main className="app-shell-page-main min-h-screen lg:ml-[250px]">
        <div className="app-shell-content mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="app-sidebar-trigger grid h-10 w-10 place-items-center rounded-lg border bg-white"><Menu className="h-5 w-5" /></button>
            <span className="font-bold">Room Management</span>
          </div>

          <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 border-b border-orange-100 pb-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <button onClick={() => navigate("/dashboard?section=properties")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-600"><ArrowLeft className="h-4 w-4" />Back to My Properties</button>
              <Button onClick={openAddForm} className="h-11 rounded-lg bg-orange-500 px-5 font-bold text-white shadow-md shadow-orange-200 hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Add Room</Button>
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Room Management</p>
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold sm:text-4xl">{property.title}</h1><Badge className={`${propertyStatus.className} border px-3 py-1`}>{propertyStatus.label}</Badge></div>
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />{address || "Address not provided"}</p>
          </motion.header>

          <motion.section initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }} className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map(({ label, helper, value, icon: Icon, iconClass, border }) => (
              <motion.div key={label} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className={`rounded-lg border ${border} bg-white p-5 shadow-sm`}>
                <div className="flex items-center gap-4"><span className={`grid h-12 w-12 place-items-center rounded-lg ${iconClass}`}><Icon className="h-6 w-6" /></span><div><p className="text-3xl font-bold">{value}</p><p className="text-sm font-bold">{label}</p></div></div>
                <p className="mt-3 text-xs text-slate-500">{helper}</p>
              </motion.div>
            ))}
          </motion.section>

          {formOpen && (
            <Card className="mb-6 rounded-lg border-orange-200 bg-white shadow-md">
              <CardHeader><CardTitle>{form.id ? "Edit Room" : "Add Room"}</CardTitle><CardDescription>Enter the details for this room. Property information remains unchanged.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2"><Label>Room Number / Name *</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Room 101" /></div>
                  <div className="space-y-2"><Label>Room Type</Label><select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{ROOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
                  <div className="space-y-2"><Label>Monthly Rent *</Label><Input type="number" inputMode="decimal" min={0} step="any" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="hide-number-spinners" /></div>
                  <div className="space-y-2"><Label>Capacity *</Label><Input type="number" min={1} value={form.maxOccupants} onChange={(event) => setForm((current) => ({ ...current, maxOccupants: event.target.value }))} className="hide-number-spinners" /></div>
                  <div className="space-y-2"><Label>Room Size (sq ft)</Label><Input type="number" min={0} value={form.sqft} onChange={(event) => setForm((current) => ({ ...current, sqft: event.target.value }))} className="hide-number-spinners" /></div>
                  <div className="space-y-2"><Label>Room Status</Label><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ApartmentStatus }))} className="h-10 w-full rounded-md border bg-white px-3 text-sm">{ROOM_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                </div>
                <div className="space-y-2"><Label>Room Description</Label><Textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the room, layout, or included fixtures." /></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4"><div><p className="text-sm font-bold">Private Bathroom</p><p className="text-xs text-slate-500">Private or en-suite bathroom</p></div><Switch checked={form.hasPrivateBath} onCheckedChange={(checked) => setForm((current) => ({ ...current, hasPrivateBath: checked }))} /></div>
                  <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4"><div><p className="text-sm font-bold">Air Conditioning</p><p className="text-xs text-slate-500">Room has AC installed</p></div><Switch checked={form.hasAC} onCheckedChange={(checked) => setForm((current) => ({ ...current, hasAC: checked }))} /></div>
                </div>
                <div className="space-y-2"><Label>Bathroom Information</Label>{form.hasPrivateBath ? <select value={form.bathroomType} onChange={(event) => setForm((current) => ({ ...current, bathroomType: event.target.value }))} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="en-suite">Private en-suite bathroom</option><option value="separate">Private separate bathroom</option></select> : <Input value={form.sharedBathLocation} onChange={(event) => setForm((current) => ({ ...current, sharedBathLocation: event.target.value }))} placeholder="Shared bathroom location" />}</div>
                <div className="space-y-3 border-t pt-5">
                  <div><Label className="text-base font-bold">Room Images</Label><p className="mt-1 text-xs text-slate-500">Upload up to 10 JPG, PNG, or WebP images. Drag thumbnails to reorder and select a cover photo.</p></div>
                  <MultiImageUploader images={roomImages} onImagesChange={setRoomImages} maxImages={10} maxFileSize={8} uploadProgress={uploadProgress} disabled={isSaving} />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row"><Button onClick={() => void saveRoom()} disabled={isSaving} className="bg-orange-500 font-bold hover:bg-orange-600">{isSaving ? "Saving..." : form.id ? "Save Room" : "Add Room"}</Button><Button variant="outline" onClick={resetForm} disabled={isSaving}>Cancel</Button></div>
              </CardContent>
            </Card>
          )}

          {rooms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-orange-200 bg-white py-16 text-center shadow-sm"><DoorOpen className="mx-auto mb-4 h-12 w-12 text-orange-400" /><h2 className="text-xl font-bold">No rooms have been added yet.</h2><p className="mx-auto mb-5 mt-2 max-w-md text-sm text-slate-500">Add the first room to make availability visible across your property listing.</p><Button onClick={openAddForm} className="bg-orange-500 hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Add First Room</Button></div>
          ) : (
            <motion.section initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }} className="space-y-5">
              {rooms.map((room) => {
                const status = statusForRoom(room);
                const statusOption = getStatusOption(status);
                const roomImage = room.images?.find(Boolean);
                const amenities = [room.hasPrivateBath ? "Private bathroom" : "Shared bathroom", room.hasAC ? "Air conditioning" : "No air conditioning"].filter(Boolean);
                return (
                  <motion.article key={room.id} variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }} className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                    <div className="p-5 sm:p-6">
                      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
                        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                          {roomImage ? <img src={roomImage} alt={`${room.name || "Room"} interior`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-center text-slate-400"><div><DoorOpen className="mx-auto mb-2 h-10 w-10" /><p className="text-xs font-semibold">No room image uploaded</p></div></div>}
                        </div>
                        <div className="min-w-0">
                          <div className="mb-5 flex items-start justify-between gap-3">
                            <div><h2 className="text-2xl font-bold">{room.name || "Room"}</h2><p className="mt-1 text-sm text-slate-500">{room.description || "No room description provided."}</p></div>
                            <div className="relative flex items-center gap-2"><Badge className={`${statusOption.className} border px-3 py-1`}>{statusOption.label}</Badge><button aria-label={`Actions for ${room.name || "room"}`} onClick={() => setOpenRoomMenuId((current) => current === room.id ? null : room.id ?? null)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100"><MoreVertical className="h-5 w-5" /></button>{openRoomMenuId === room.id && <div className="absolute right-0 top-11 z-20 w-52 rounded-lg border bg-white p-1.5 shadow-xl">{status !== "maintenance" && <button onClick={() => void changeRoomStatus(room, "maintenance")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-violet-700 hover:bg-violet-50"><Wrench className="h-4 w-4" />Mark as Maintenance</button>}<button onClick={() => { openEditForm(room); setOpenRoomMenuId(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"><Edit3 className="h-4 w-4" />Edit Room</button><button onClick={() => void removeRoom(room)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete Room</button></div>}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            <div className="rounded-lg bg-orange-50 p-3"><p className="text-xs font-semibold text-slate-500">Monthly Rent</p><p className="mt-1 font-bold">₱{(room.price ?? 0).toLocaleString("en-PH")}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Capacity</p><p className="mt-1 flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-orange-500" />{room.maxOccupants ?? 1}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Room Type</p><p className="mt-1 font-bold">{room.type || "Not provided"}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Room Size</p><p className="mt-1 font-bold">{room.sqft ? `${room.sqft.toLocaleString("en-PH")} sq ft` : "Not provided"}</p></div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">{amenities.map((amenity) => <span key={amenity} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">{amenity.includes("bathroom") ? <Bath className="h-3.5 w-3.5" /> : <Wind className="h-3.5 w-3.5" />}{amenity}</span>)}</div>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-3">
                        <Button variant="outline" onClick={() => void changeRoomStatus(room, status === "available" ? "occupied" : "available")} className={status === "available" ? "border-emerald-300 font-bold text-emerald-700 hover:bg-emerald-50" : "border-emerald-300 font-bold text-emerald-700 hover:bg-emerald-50"}>{status === "available" ? <><Users className="mr-2 h-4 w-4" />Mark as Occupied</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Mark as Available</>}</Button>
                        <Button variant="outline" onClick={() => openEditForm(room)} className="border-orange-300 font-bold text-orange-700 hover:bg-orange-50"><Edit3 className="mr-2 h-4 w-4" />Edit Room</Button>
                        <Button variant="outline" onClick={() => void removeRoom(room)} className="border-rose-300 font-bold text-rose-600 hover:bg-rose-50"><Trash2 className="mr-2 h-4 w-4" />Delete Room</Button>
                      </div>
                    </div>
                    <div className="grid gap-px border-t bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                      {[{ label: "Created", value: formatDate(room.createdAt), icon: CalendarDays }, { label: "Created By", value: "Not recorded", icon: Users }, { label: "Last Updated", value: "Not recorded", icon: TrendingUp }, { label: "Room ID", value: room.id || "Not recorded", icon: Tag }].map(({ label, value, icon: Icon }) => <div key={label} className="min-w-0 bg-slate-50 px-5 py-4"><p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Icon className="h-4 w-4 text-orange-500" />{label}</p><p className="mt-1 truncate text-sm font-bold" title={value}>{value}</p></div>)}
                    </div>
                  </motion.article>
                );
              })}
            </motion.section>
          )}

          <section className="mt-6 flex items-start gap-4 rounded-lg border border-violet-100 bg-violet-50 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-violet-600"><Wrench className="h-5 w-5" /></span><div><h2 className="font-bold">Room Status Guide</h2><p className="mt-1 text-sm leading-6 text-slate-600">Keep room availability current so tenants, administrators, and your property dashboard all show the same status. Maintenance rooms remain unavailable until you mark them available.</p></div></section>
        </div>
      </main>
    </div>
  );
}
