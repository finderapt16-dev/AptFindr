import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bath,
  Bed,
  CheckCircle2,
  DoorOpen,
  Edit,
  Plus,
  Trash2,
  Users,
  Wrench,
  Wind,
} from "lucide-react";

import { useAuth } from "@/app/contexts/AuthContext";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import {
  createApartmentRoom,
  deleteApartmentRoom,
  fetchApartmentRooms,
  fetchApartmentWithImages,
  updateApartmentRoom,
  updateApartmentRoomStatus,
  type Apartment,
  type ApartmentRoom,
  type ApartmentStatus,
} from "@/app/data/apartments";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";

const ROOM_TYPES = ["Bedroom", "Studio", "Shared room", "Suite", "Loft", "Other"];
const ROOM_STATUS_OPTIONS: Array<{ value: ApartmentStatus; label: string; className: string }> = [
  { value: "available", label: "Available", className: "bg-green-100 text-green-700 border-green-200" },
  { value: "occupied", label: "Occupied", className: "bg-red-100 text-red-700 border-red-200" },
  { value: "maintenance", label: "Under Maintenance", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
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
  maxOccupants: "1",
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
  price: String(room.price ?? ""),
  maxOccupants: String(room.maxOccupants ?? 1),
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

export function ManageRooms() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshApartments } = useApartmentsContext();
  const [property, setProperty] = useState<Apartment | null>(null);
  const [rooms, setRooms] = useState<ApartmentRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
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
        const message = error instanceof Error ? error.message : "Unable to load rooms.";
        toast.error(message);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const roomCounts = useMemo(() => ({
    total: rooms.length,
    available: rooms.filter((room) => statusForRoom(room) === "available").length,
    occupied: rooms.filter((room) => statusForRoom(room) === "occupied").length,
    maintenance: rooms.filter((room) => statusForRoom(room) === "maintenance").length,
  }), [rooms]);

  if (user?.role !== "landlord") {
    return <Navigate to="/dashboard" replace />;
  }

  const canManage = property && property.landlordId === user.id;

  const resetForm = () => {
    setForm(emptyRoomForm());
    setFormOpen(false);
  };

  const openAddForm = () => {
    setForm(emptyRoomForm());
    setFormOpen(true);
  };

  const openEditForm = (room: ApartmentRoom) => {
    setForm(roomToForm(room));
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
  });

  const saveRoom = async () => {
    if (!id) return;
    if (!form.name.trim()) {
      toast.error("Please enter a room number or name.");
      return;
    }

    setIsSaving(true);
    try {
      const room = formToRoom();
      if (form.id) {
        const updated = await updateApartmentRoom(id, form.id, room);
        setRooms((prev) => prev.map((item) => item.id === form.id ? updated : item));
        toast.success("Room updated");
      } else {
        const created = await createApartmentRoom(id, room);
        setRooms((prev) => [...prev, created]);
        toast.success("Room added");
      }
      await refreshApartments();
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save room.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const changeRoomStatus = async (room: ApartmentRoom, status: ApartmentStatus) => {
    if (!id || !room.id) return;
    try {
      await updateApartmentRoomStatus(id, room.id, status);
      setRooms((prev) => prev.map((item) => item.id === room.id ? { ...item, status, isOccupied: status === "occupied" } : item));
      await refreshApartments();
      toast.success("Room status updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update room status.";
      toast.error(message);
    }
  };

  const removeRoom = async (room: ApartmentRoom) => {
    if (!id || !room.id) return;
    const roomName = room.name || "this room";
    if (!window.confirm(`Are you sure you want to delete ${roomName}?\n\nThis action will permanently remove this room but will NOT delete the apartment.`)) {
      return;
    }

    try {
      await deleteApartmentRoom(id, room.id);
      setRooms((prev) => prev.filter((item) => item.id !== room.id));
      await refreshApartments();
      toast.success("Room deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete room.";
      toast.error(message);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12 text-center text-slate-600">Loading room management...</div>;
  }

  if (!property || !canManage) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Property Not Available</h1>
        <p className="text-slate-500 mb-6">This property could not be found or is not assigned to your account.</p>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 pb-16">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6 text-slate-600 hover:text-amber-700 font-bold">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
          <div>
            <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Room Management</p>
            <h1 className="text-4xl font-black text-slate-900">{property.title}</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">{property.address}, {property.city}, {property.state} {property.zip}</p>
          </div>
          <Button onClick={openAddForm} className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg">
            <Plus className="h-4 w-4 mr-2" /> Add Room
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Rooms", value: roomCounts.total, icon: DoorOpen, tone: "from-slate-500 to-slate-600" },
            { label: "Available", value: roomCounts.available, icon: CheckCircle2, tone: "from-green-500 to-emerald-600" },
            { label: "Occupied", value: roomCounts.occupied, icon: Bed, tone: "from-red-500 to-rose-600" },
            { label: "Maintenance", value: roomCounts.maintenance, icon: Wrench, tone: "from-yellow-500 to-amber-600" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} className="border-2 border-amber-100 bg-white/90 shadow-lg rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-3xl font-black text-slate-900">{value}</p>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
                </div>
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${tone} flex items-center justify-center shadow`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {formOpen && (
          <Card className="border-2 border-amber-200 bg-white/95 shadow-xl rounded-2xl mb-6">
            <CardHeader>
              <CardTitle>{form.id ? "Edit Room" : "Add Room"}</CardTitle>
              <CardDescription>Manage room-specific details only. Property information stays on the property record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Number / Name *</Label>
                  <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Room 101" />
                </div>
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {ROOM_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Rent</Label>
                  <Input type="number" min={0} value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input type="number" min={1} value={form.maxOccupants} onChange={(event) => setForm((prev) => ({ ...prev, maxOccupants: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Room Size</Label>
                  <Input type="number" min={0} value={form.sqft} onChange={(event) => setForm((prev) => ({ ...prev, sqft: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Room Status</Label>
                  <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ApartmentStatus }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {ROOM_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Room Description</Label>
                <Textarea rows={3} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Describe the room condition, layout, view, or included fixtures." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/30 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Private Bathroom</p>
                    <p className="text-xs text-slate-500">En-suite or separate private bathroom</p>
                  </div>
                  <Switch checked={form.hasPrivateBath} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, hasPrivateBath: checked }))} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/30 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Air Conditioning</p>
                    <p className="text-xs text-slate-500">Room has AC installed</p>
                  </div>
                  <Switch checked={form.hasAC} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, hasAC: checked }))} />
                </div>
              </div>

              {form.hasPrivateBath ? (
                <div className="space-y-2">
                  <Label>Bathroom Information</Label>
                  <select value={form.bathroomType} onChange={(event) => setForm((prev) => ({ ...prev, bathroomType: event.target.value }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="en-suite">Private en-suite bathroom</option>
                    <option value="separate">Private separate bathroom</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Bathroom Information</Label>
                  <Input value={form.sharedBathLocation} onChange={(event) => setForm((prev) => ({ ...prev, sharedBathLocation: event.target.value }))} placeholder="Shared bathroom location" />
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={saveRoom} disabled={isSaving} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold">
                  {isSaving ? "Saving..." : form.id ? "Save Room" : "Add Room"}
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={isSaving} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {rooms.length === 0 ? (
          <Card className="border-2 border-dashed border-amber-200 bg-white/80 rounded-2xl">
            <CardContent className="py-14 text-center">
              <DoorOpen className="h-12 w-12 text-amber-400 mx-auto mb-3" />
              <h2 className="text-xl font-black text-slate-900 mb-1">No Rooms Yet</h2>
              <p className="text-sm text-slate-500 font-medium mb-5">Add rooms under this property without re-entering property details.</p>
              <Button onClick={openAddForm} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold">
                <Plus className="h-4 w-4 mr-2" /> Add First Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {rooms.map((room) => {
              const status = statusForRoom(room);
              const statusOption = getStatusOption(status);
              return (
                <Card key={room.id} className="border-2 border-amber-100 bg-white/95 shadow-lg rounded-2xl overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-black text-slate-900">{room.name || "Room"}</h2>
                        <p className="text-sm font-medium text-slate-500">{room.type || "Bedroom"}</p>
                      </div>
                      <Badge className={`${statusOption.className} border font-black`}>{statusOption.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                        <p className="text-xs text-slate-500 font-bold">Rent</p>
                        <p className="font-black text-slate-900">PHP {(room.price ?? 0).toLocaleString("en-US")}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                        <Users className="h-4 w-4 text-amber-600 mb-1" />
                        <p className="font-black text-slate-900">{room.maxOccupants ?? 1}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                        <Bath className="h-4 w-4 text-amber-600 mb-1" />
                        <p className="font-black text-slate-900">{room.hasPrivateBath ? "Private" : "Shared"}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                        <Wind className="h-4 w-4 text-amber-600 mb-1" />
                        <p className="font-black text-slate-900">{room.hasAC ? "AC" : "No AC"}</p>
                      </div>
                    </div>

                    {room.description && <p className="text-sm text-slate-600 font-medium leading-relaxed">{room.description}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {status === "available" ? (
                        <Button variant="outline" onClick={() => void changeRoomStatus(room, "occupied")} className="border-red-200 text-red-700 hover:bg-red-50 font-bold">
                          Mark as Occupied
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={() => void changeRoomStatus(room, "available")} className="border-green-200 text-green-700 hover:bg-green-50 font-bold">
                          Mark as Available
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => openEditForm(room)} className="border-amber-200 text-amber-700 hover:bg-amber-50 font-bold">
                        <Edit className="h-4 w-4 mr-1" /> Edit Room
                      </Button>
                      <Button variant="outline" onClick={() => void removeRoom(room)} className="border-red-200 text-red-700 hover:bg-red-50 font-bold">
                        <Trash2 className="h-4 w-4 mr-1" /> Delete Room
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
