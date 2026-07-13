import { Home, Images, Plus, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Apartment } from "../../data/apartments";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { LocationPicker } from "./LocationPicker";
import { MultiImageUploader, type UploadedImage } from "./MultiImageUploader";
import { DEFAULT_LA_PAZ_MAP_CENTER, hasValidApartmentCoordinates } from "../../utils/mapCoordinates";

interface EditApartmentDialogProps {
  apartment: Apartment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedApartment: Apartment) => void | Promise<void>;
}

const getEditableFeatures = (apartment: Apartment): string[] => {
  const rawFeatures = apartment.features;
  const features = Array.isArray(rawFeatures)
    ? rawFeatures.filter((item): item is string => typeof item === "string")
    : rawFeatures && typeof rawFeatures === "object" && Array.isArray(rawFeatures.customFeatures)
      ? rawFeatures.customFeatures.filter((item): item is string => typeof item === "string")
      : [];
  const addLegacyFeature = (enabled: boolean, label: string) => {
    if (enabled && !features.some((item) => item.toLowerCase() === label.toLowerCase())) features.push(label);
  };
  addLegacyFeature(apartment.petFriendly, "Pet Friendly");
  addLegacyFeature(apartment.parking, "Parking");
  addLegacyFeature(apartment.furnished, "Furnished");
  return features;
};

export function EditApartmentDialog({ apartment, open, onOpenChange, onSave }: EditApartmentDialogProps) {
  const [formData, setFormData] = useState<Apartment>(apartment);
  const [isSaving, setIsSaving] = useState(false);
  const [locationLookupRequest, setLocationLookupRequest] = useState(0);
  const [locationResolving, setLocationResolving] = useState(false);
  const lastAutoGeocodedAddressRef = useRef("");
  const [amenitiesInput, setAmenitiesInput] = useState(apartment.amenities.join(", "));
  const [utilitiesInput, setUtilitiesInput] = useState(
    Array.isArray(apartment.utilities) ? apartment.utilities.join(", ") : "",
  );
  const [featuresInput, setFeaturesInput] = useState(() => {
    return getEditableFeatures(apartment).join(", ");
  });

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
  useEffect(() => {
    if (!open) return;
    setFormData(apartment);
    setAmenitiesInput(apartment.amenities.join(", "));
    setUtilitiesInput(Array.isArray(apartment.utilities) ? apartment.utilities.join(", ") : "");
    setFeaturesInput(getEditableFeatures(apartment).join(", "));
    setLocationLookupRequest(0);
    setLocationResolving(false);
    lastAutoGeocodedAddressRef.current = [apartment.address, apartment.city, apartment.state, apartment.zip, "Philippines"]
      .filter(Boolean)
      .join(", ")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
    setExistingImages((apartment.images || []).map((url, index) => ({
      id: `existing-${index}`,
      url,
      isPrimary: url === apartment.image || (!apartment.image && index === 0),
      sortOrder: index,
    })));
    setNewImages([]);
  }, [apartment, open]);
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
    maxOccupants: undefined,
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
  const locationAddressQuery = useMemo(
    () => [formData.address, formData.city, formData.state, formData.zip, "Philippines"].filter(Boolean).join(", "),
    [formData.address, formData.city, formData.state, formData.zip],
  );

  useEffect(() => {
    if (!open) return;
    if (!formData.address.trim()) return;

    const normalizedQuery = locationAddressQuery.trim().replace(/\s+/g, " ").toLowerCase();
    if (!normalizedQuery || normalizedQuery === lastAutoGeocodedAddressRef.current) return;

    setLocationResolving(true);
    const timer = window.setTimeout(() => {
      lastAutoGeocodedAddressRef.current = normalizedQuery;
      setLocationLookupRequest((request) => request + 1);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [formData.address, locationAddressQuery, open]);

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

    if (!formData.address.trim()) {
      toast.error("Address is required before saving.");
      return;
    }

    if (locationResolving) {
      toast.error("Please wait for the map location to finish resolving.");
      return;
    }

    if (!hasValidApartmentCoordinates(formData.lat, formData.lng)) {
      toast.error("We could not find this address on the map. Please check the address or move the marker manually.");
      return;
    }

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
    const amenities = amenitiesInput.split(",").map((item) => item.trim()).filter(Boolean);
    const utilities = utilitiesInput.split(",").map((item) => item.trim()).filter(Boolean);
    const customFeatures = featuresInput.split(",").map((item) => item.trim()).filter(Boolean);
    const normalizedFeatureNames = customFeatures.map((item) => item.toLowerCase());
    const existingFeatureRecord = formData.features && !Array.isArray(formData.features)
      ? formData.features
      : {};

    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        rooms: normalizedRooms,
        images: allImages,
        image: primaryImage,
        amenities,
        utilities,
        petFriendly: normalizedFeatureNames.includes("pet friendly"),
        parking: normalizedFeatureNames.includes("parking"),
        furnished: normalizedFeatureNames.includes("furnished"),
        features: { ...existingFeatureRecord, customFeatures },
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
              <Label htmlFor="price">Price (₱/month)</Label>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
                className="hide-number-spinners"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sqft">Square Feet</Label>
              <Input
                id="sqft"
                type="number"
                value={formData.sqft || ""}
                onChange={(e) => setFormData({ ...formData, sqft: Number(e.target.value) })}
                required
                className="hide-number-spinners"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms || ""}
                onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                required
                className="hide-number-spinners"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                value={formData.bathrooms || ""}
                onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                required
                className="hide-number-spinners"
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
              onChange={(e) => {
                setFormData({ ...formData, address: e.target.value, lat: Number.NaN, lng: Number.NaN });
                setLocationResolving(Boolean(e.target.value.trim()));
              }}
              onBlur={() => setLocationLookupRequest((request) => request + 1)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => {
                  setFormData({ ...formData, city: e.target.value, lat: Number.NaN, lng: Number.NaN });
                  setLocationResolving(Boolean(formData.address.trim()));
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => {
                  setFormData({ ...formData, state: e.target.value, lat: Number.NaN, lng: Number.NaN });
                  setLocationResolving(Boolean(formData.address.trim()));
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => {
                  setFormData({ ...formData, zip: e.target.value, lat: Number.NaN, lng: Number.NaN });
                  setLocationResolving(Boolean(formData.address.trim()));
                }}
                required
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/30 p-4">
            <div>
              <Label className="text-amber-700">Map Location</Label>
              <p className="mt-1 text-xs text-slate-500">Use the address lookup or drag the pin to the exact apartment location.</p>
            </div>
            <LocationPicker
              lat={Number.isFinite(Number(formData.lat)) ? Number(formData.lat) : DEFAULT_LA_PAZ_MAP_CENTER.lat}
              lng={Number.isFinite(Number(formData.lng)) ? Number(formData.lng) : DEFAULT_LA_PAZ_MAP_CENTER.lng}
              addressQuery={locationAddressQuery}
              geocodeRequestKey={locationLookupRequest}
              onGeocodeStatusChange={(status) => setLocationResolving(status === "loading")}
              onLocationChange={(lat, lng) => setFormData((current) => ({ ...current, lat, lng }))}
            />
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
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={room.price || ""}
                          onChange={(e) => updateRoom(room.id, { price: Number(e.target.value) })}
                          className="hide-number-spinners"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Size (sqft)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={room.sqft || ""}
                          onChange={(e) => updateRoom(room.id, { sqft: Number(e.target.value) })}
                          className="hide-number-spinners"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Occupants</Label>
                        <Input
                          type="number"
                          min={1}
                          value={room.maxOccupants || ""}
                          onChange={(e) => updateRoom(room.id, {
                            maxOccupants: e.target.value === "" ? undefined : Number(e.target.value),
                          })}
                          className="hide-number-spinners"
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

          <div className="space-y-4 rounded-lg border border-amber-100 bg-amber-50/30 p-4">
            <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
              <Home className="h-5 w-5 text-amber-600" />
              <div>
                <Label className="font-bold text-amber-700">Amenities & Features</Label>
                <p className="text-xs text-slate-500">These values use the same format as Add Property.</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAmenities">Amenities (comma-separated)</Label>
              <Textarea id="editAmenities" rows={2} value={amenitiesInput} onChange={(event) => setAmenitiesInput(event.target.value)} placeholder="Parking, WiFi, Gym, Pool" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUtilities">Utilities Included (comma-separated)</Label>
              <Textarea id="editUtilities" rows={2} value={utilitiesInput} onChange={(event) => setUtilitiesInput(event.target.value)} placeholder="Water, Electricity, Internet" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFeatures">Additional Features (comma-separated)</Label>
              <Textarea id="editFeatures" rows={2} value={featuresInput} onChange={(event) => setFeaturesInput(event.target.value)} placeholder="Pet Friendly, Parking, Furnished" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || locationResolving}>
              {isSaving ? "Saving..." : locationResolving ? "Finding location..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
