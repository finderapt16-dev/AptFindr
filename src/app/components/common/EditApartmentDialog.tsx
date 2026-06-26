import { useState } from "react";
import { Apartment } from "../../data/apartments";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { MultiImageUploader, type UploadedImage } from "./MultiImageUploader";
import { Home, Plus, Trash2, Images, Star, X } from "lucide-react";

interface EditApartmentDialogProps {
  apartment: Apartment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedApartment: Apartment) => void | Promise<void>;
}

export function EditApartmentDialog({ apartment, open, onOpenChange, onSave }: EditApartmentDialogProps) {
  const [formData, setFormData] = useState<Apartment>(apartment);
  const [isSaving, setIsSaving] = useState(false);

  // ── Image Management State ─────────────────────────────────────────────
  const [existingImages, setExistingImages] = useState<UploadedImage[]>(
    (apartment.images || []).map((url, idx) => ({
      id: `existing-${idx}`,
      url,
      isPrimary: idx === 0 || url === apartment.image,
      sortOrder: idx,
    }))
  );
  const [newImages, setNewImages] = useState<UploadedImage[]>([]);
  // ───────────────────────────────────────────────────────────────────────

  const handleExistingImageDelete = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleExistingImageSetPrimary = (id: string) => {
    setExistingImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }))
    );
  };

  const createRoom = (): NonNullable<Apartment["rooms"]>[number] => ({
    id: Date.now().toString() + Math.random(),
    name: "Bedroom",
    sqft: 150,
    maxOccupants: 1,
    price: formData.price || 0,
    hasPrivateBath: false,
    bathroomType: "",
    sharedBathLocation: "",
    hasAC: false,
    isOccupied: false,
  });

  const rooms = formData.rooms ?? [];
  const availableRooms = rooms.filter((room) => !room.isOccupied).length;
  const occupiedRooms = rooms.filter((room) => room.isOccupied).length;
  const privateBathRooms = rooms.filter((room) => room.hasPrivateBath).length;

  const updateRoom = (roomId: string | undefined, patch: Partial<NonNullable<Apartment["rooms"]>[number]>) => {
    setFormData((prev) => ({
      ...prev,
      rooms: (prev.rooms ?? []).map((room) =>
        room.id === roomId ? { ...room, ...patch } : room,
      ),
    }));
  };

  const addRoom = () => {
    setFormData((prev) => ({
      ...prev,
      rooms: [...(prev.rooms ?? []), createRoom()],
    }));
  };

  const removeRoom = (roomId: string | undefined) => {
    setFormData((prev) => ({
      ...prev,
      rooms: (prev.rooms ?? []).filter((room) => room.id !== roomId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const normalizedRooms = (formData.rooms ?? []).map((room, index) => ({
      ...room,
      id: room.id ?? `room-${Date.now()}-${index}`,
      name: room.name?.trim() || "Bedroom",
      price: Math.max(0, Number(room.price) || 0),
      sqft: Math.max(0, Number(room.sqft) || 0),
      maxOccupants: Math.max(1, Number(room.maxOccupants) || 1),
      hasPrivateBath: room.hasPrivateBath === true,
      bathroomType: room.hasPrivateBath ? room.bathroomType || "en-suite" : "",
      sharedBathLocation: room.hasPrivateBath ? "" : room.sharedBathLocation ?? "",
      hasAC: room.hasAC === true,
      isOccupied: room.isOccupied === true,
    }));

    // Combine all images (existing + new)
    const allImages = [
      ...existingImages.map((img) => img.url),
      ...newImages.map((img) => img.url),
    ];

    // Find primary image
    const primaryImage =
      existingImages.find((img) => img.isPrimary)?.url ||
      newImages.find((img) => img.isPrimary)?.url ||
      allImages[0];

    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        rooms: normalizedRooms,
        images: allImages,
        image: primaryImage,
        bedrooms: normalizedRooms.length || formData.bedrooms,
        bathrooms: normalizedRooms.filter((room) => room.hasPrivateBath).length || formData.bathrooms,
        price: normalizedRooms.length > 0
          ? Math.min(...normalizedRooms.map((room) => room.price).filter((price) => price > 0)) || formData.price
          : formData.price,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Apartment</DialogTitle>
          <DialogDescription>
            Update the details of your apartment listing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Images Section */}
          <div className="space-y-3 border-b pb-4">
            <div className="flex items-center gap-2">
              <Images className="h-5 w-5 text-amber-600" />
              <Label className="text-amber-700 font-bold">Property Images</Label>
            </div>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Current Images</h4>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className={`relative group rounded-lg overflow-hidden border-2 aspect-square ${
                        img.isPrimary
                          ? "border-yellow-400 ring-2 ring-yellow-300"
                          : "border-gray-200"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt="Apartment"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title="Set as primary"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExistingImageSetPrimary(img.id);
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white p-1.5 rounded"
                        >
                          <Star className="h-3 w-3 fill-current" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={(e) => {
                            e.preventDefault();
                            handleExistingImageDelete(img.id);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {img.isPrimary && (
                        <div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-0.5">
                          <Star className="h-3 w-3 text-yellow-900 fill-current" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Images Upload */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">Add More Images</h4>
              <MultiImageUploader
                images={newImages}
                onImagesChange={setNewImages}
                maxImages={10 - existingImages.length}
                maxFileSize={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($/month)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sqft">Square Feet</Label>
              <Input
                id="sqft"
                type="number"
                value={formData.sqft}
                onChange={(e) => setFormData({ ...formData, sqft: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="availableDate">Available Date</Label>
            <Input
              id="availableDate"
              type="date"
              value={formData.availableDate}
              onChange={(e) => setFormData({ ...formData, availableDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/30 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-amber-600" />
                <div>
                  <Label className="text-amber-700">Rooms</Label>
                  <p className="text-xs text-slate-500">Add rooms, mark them available, and set rent per room.</p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRoom}>
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>

            {rooms.length === 0 ? (
              <div className="rounded-lg border border-dashed border-amber-200 bg-white p-4 text-center">
                <p className="text-sm font-medium text-slate-700">No individual rooms added yet.</p>
                <p className="text-xs text-slate-500">Use Add Room when a landlord wants to list a newly available room.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room, index) => (
                  <div key={room.id ?? index} className="space-y-3 rounded-lg border border-amber-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        Room {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRoom(room.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Room Type</Label>
                        <select
                          value={room.name ?? "Bedroom"}
                          onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {["Bedroom", "Studio", "Shared room", "Suite", "Loft", "Other"].map((type) => (
                            <option key={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Rent</Label>
                        <Input
                          type="number"
                          min={0}
                          value={room.price ?? 0}
                          onChange={(e) => updateRoom(room.id, { price: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Size (sqft)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={room.sqft ?? 0}
                          onChange={(e) => updateRoom(room.id, { sqft: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Occupants</Label>
                        <Input
                          type="number"
                          min={1}
                          value={room.maxOccupants ?? 1}
                          onChange={(e) => updateRoom(room.id, { maxOccupants: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">Available now</p>
                          <p className="text-xs text-slate-500">Turn off when occupied.</p>
                        </div>
                        <Switch
                          checked={!room.isOccupied}
                          onCheckedChange={(checked) => updateRoom(room.id, { isOccupied: !checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">Air conditioned</p>
                          <p className="text-xs text-slate-500">Room has AC.</p>
                        </div>
                        <Switch
                          checked={room.hasAC === true}
                          onCheckedChange={(checked) => updateRoom(room.id, { hasAC: checked })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Private bathroom</p>
                        <p className="text-xs text-slate-500">En-suite or separate private bath.</p>
                      </div>
                      <Switch
                        checked={room.hasPrivateBath === true}
                        onCheckedChange={(checked) =>
                          updateRoom(room.id, {
                            hasPrivateBath: checked,
                            bathroomType: checked ? room.bathroomType || "en-suite" : "",
                            sharedBathLocation: checked ? "" : room.sharedBathLocation,
                          })
                        }
                      />
                    </div>

                    {room.hasPrivateBath ? (
                      <div className="space-y-2">
                        <Label>Bathroom Type</Label>
                        <select
                          value={room.bathroomType || "en-suite"}
                          onChange={(e) => updateRoom(room.id, { bathroomType: e.target.value })}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="en-suite">Private (en-suite)</option>
                          <option value="separate">Private (separate)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Shared Bathroom Location</Label>
                        <Input
                          placeholder="e.g. 2nd floor hallway"
                          value={room.sharedBathLocation ?? ""}
                          onChange={(e) => updateRoom(room.id, { sharedBathLocation: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div className="grid grid-cols-4 gap-2 rounded-lg border border-amber-100 bg-white p-3 text-center">
                  {[
                    { label: "Total", value: rooms.length },
                    { label: "Available", value: availableRooms },
                    { label: "Occupied", value: occupiedRooms },
                    { label: "Private Bath", value: privateBathRooms },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-lg font-bold text-amber-700">{item.value}</p>
                      <p className="text-xs text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Features</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="petFriendly"
                  checked={formData.petFriendly}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, petFriendly: checked as boolean })
                  }
                />
                <Label htmlFor="petFriendly" className="cursor-pointer">Pet Friendly</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="parking"
                  checked={formData.parking}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, parking: checked as boolean })
                  }
                />
                <Label htmlFor="parking" className="cursor-pointer">Parking Available</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="furnished"
                  checked={formData.furnished}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, furnished: checked as boolean })
                  }
                />
                <Label htmlFor="furnished" className="cursor-pointer">Furnished</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
