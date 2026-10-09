import "./ManageRooms.css";
import { getRoomStatus, sortRoomsByAvailability } from "@/utils/roomAvailability";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, ImagePlus, MoreVertical, Pencil, Plus, Star, Upload, Users, Wrench, X } from "lucide-react";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { LandlordMenuTrigger } from "@/landlord/LandlordMenuTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { safeRandomId } from "@/utils/safeRandomId";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabaseClient";
import { createApartmentRoom, deleteApartmentRoom, fetchApartmentRooms, fetchApartmentWithImages, updateApartmentRoom, uploadApartmentRoomImage, } from "@/data/apartments";

const ROOM_TYPES = ["Bedroom", "Studio", "Shared unit", "Suite", "Loft", "Other"];
const ROOM_STATUS_OPTIONS = [
    { value: "available", label: "Available", className: "manage-rooms-badge" },
    { value: "occupied", label: "Occupied", className: "manage-rooms-badge-2" },
    { value: "maintenance", label: "Under Maintenance", className: "manage-rooms-badge-3" },
];
const MAX_ROOM_IMAGES = 10;
const MAX_ROOM_IMAGE_MB = 8;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const emptyRoomForm = () => ({
    name: "",
    type: "Bedroom",
    price: "",
    maxOccupants: "",
    bedrooms: "",
    sqft: "",
    description: "",
    hasPrivateBath: false,
    bathroomType: "",
    sharedBathLocation: "",
    hasAC: false,
    status: "available",
});
const roomToForm = (room) => ({
    id: room.id,
    name: room.name ?? "",
    type: room.type || "Bedroom",
    price: room.price ? String(room.price) : "",
    maxOccupants: room.maxOccupants ? String(room.maxOccupants) : "",
    bedrooms: room.bedrooms == null ? "" : String(room.bedrooms),
    sqft: String(room.sqft ?? ""),
    description: room.description ?? "",
    hasPrivateBath: room.hasPrivateBath === true,
    bathroomType: room.bathroomType || "en-suite",
    sharedBathLocation: room.sharedBathLocation ?? "",
    hasAC: room.hasAC === true,
    status: room.status ?? (room.isOccupied ? "occupied" : "available"),
});
const statusForRoom = getRoomStatus;
const getStatusOption = (status) => ROOM_STATUS_OPTIONS.find((option) => option.value === status) ?? ROOM_STATUS_OPTIONS[0];

// Cover photo is always the first image; keep isPrimary / sortOrder in sync with the order.
const normalizeImages = (list) => list.map((image, index) => ({ ...image, isPrimary: index === 0, sortOrder: index }));
const imagesFromRoom = (room) => normalizeImages((room?.images ?? []).filter(Boolean).map((url, index) => ({ id: `existing-${index}`, url })));
const revokeIfBlob = (url) => { if (typeof url === "string" && url.startsWith("blob:"))
    URL.revokeObjectURL(url); };

// Used to tell whether a card has unsaved edits, including the status chosen in Edit Unit.
const DIRTY_FIELDS = ["name", "type", "price", "maxOccupants", "bedrooms", "sqft", "description", "hasPrivateBath", "bathroomType", "sharedBathLocation", "hasAC", "status"];
const snapshotOf = (form, images) => JSON.stringify([
    DIRTY_FIELDS.map((key) => form[key] ?? ""),
    images.map((image) => (image.file ? `file:${image.id}` : image.url)),
]);

const compressRoomImage = async (source) => {
    if (source.size <= 1.5 * 1024 * 1024 || typeof createImageBitmap !== "function")
        return source;
    try {
        const bitmap = await createImageBitmap(source);
        const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? source), "image/webp", 0.82));
    }
    catch {
        return source;
    }
};

// Uploads new files (keeps already-uploaded URLs) and returns the final ordered URL list.
const uploadPendingRoomImages = async (propertyId, roomId, images, onProgress) => {
    const ordered = [...images].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary)
            return a.isPrimary ? -1 : 1;
        return a.sortOrder - b.sortOrder;
    });
    const roomUploadId = roomId || safeRandomId();
    const urls = [];
    const pendingCount = ordered.filter((image) => image.file || image.url.startsWith("data:")).length;
    let completedUploads = 0;
    onProgress(pendingCount > 0 ? 0 : null);
    for (let index = 0; index < ordered.length; index += 1) {
        const image = ordered[index];
        if (!image.file && !image.url.startsWith("data:")) {
            urls.push(image.url);
        }
        else {
            const source = image.file ?? await (await fetch(image.url)).blob();
            const compressed = await compressRoomImage(source);
            const originalName = image.file instanceof File ? image.file.name : `room-image-${index}.webp`;
            const uploadName = compressed !== source && compressed.type === "image/webp"
                ? `${originalName.replace(/\.[^.]+$/, "")}.webp`
                : originalName;
            urls.push(await uploadApartmentRoomImage(propertyId, roomUploadId, compressed, uploadName));
            completedUploads += 1;
            onProgress((completedUploads / pendingCount) * 100);
        }
    }
    return urls;
};

const buildRoomPayload = (form, imageUrls, status) => ({
    id: form.id,
    name: form.name.trim(),
    type: form.type,
    price: Number(form.price) || 0,
    maxOccupants: Number(form.maxOccupants) || 1,
    bedrooms: Number(form.bedrooms),
    sqft: Number(form.sqft) || 0,
    description: form.description.trim(),
    hasPrivateBath: form.hasPrivateBath,
    bathroomType: form.hasPrivateBath ? form.bathroomType || "en-suite" : "",
    sharedBathLocation: form.hasPrivateBath ? "" : form.sharedBathLocation.trim(),
    hasAC: form.hasAC,
    status,
    isOccupied: status === "occupied",
    images: imageUrls,
});

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                       */
/* -------------------------------------------------------------------------- */

// A boxed field (label + control + pencil). Wrapping in <label> means clicking
// anywhere on the box, including the pencil, focuses the input.
function Field({ label, prefix, suffix, chevron = false, className = "", children }) {
    return (<label className={`mr-field ${className}`}>
      <span className="mr-field-label">{label}</span>
      <span className="mr-field-control">
        {prefix ? <span className="mr-affix">{prefix}</span> : null}
        {children}
        {suffix ? <span className="mr-affix">{suffix}</span> : null}
        {chevron ? <ChevronDown className="mr-chevron" aria-hidden="true"/> : null}
        <Pencil className="mr-pencil" aria-hidden="true"/>
      </span>
    </label>);
}

/* -------------------------------------------------------------------------- */
/* One room = one inline-editable card                                         */
/* -------------------------------------------------------------------------- */

// room === null means "new unit" (unsaved draft card).
function RoomEditorCard({ room, busy, onSave, onDelete, onCancelNew }) {
    const isNew = room === null;
    const [draft, setDraft] = useState(() => (room ? roomToForm(room) : emptyRoomForm()));
    const [images, setImages] = useState(() => imagesFromRoom(room));
    const [activeIndex, setActiveIndex] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [selectedAmenities, setSelectedAmenities] = useState(() => new Set([
        ...(room?.hasAC ? ["Air Conditioning"] : []),
        ...(room?.hasPrivateBath ? ["Private Bathroom"] : []),
    ]));
    const [selectedUtilities, setSelectedUtilities] = useState(() => new Set(["Water", "Electricity", "Internet"]));
    const fileInputRef = useRef(null);
    const nameInputRef = useRef(null);
    const menuRef = useRef(null);
    const mountedRef = useRef(true);
    const imagesRef = useRef(images);
    imagesRef.current = images;

    const status = draft.status;
    const statusOption = getStatusOption(status);
    const controlsLocked = busy || isSaving;

    // ---- keep the card in sync with the server without wiping unsaved edits ----
    const baseSnapshot = snapshotOf(room ? roomToForm(room) : emptyRoomForm(), imagesFromRoom(room));
    const currentSnapshot = snapshotOf(draft, images);
    const isDirty = currentSnapshot !== baseSnapshot;
    const previousBaseRef = useRef(baseSnapshot);
    const currentSnapshotRef = useRef(currentSnapshot);
    currentSnapshotRef.current = currentSnapshot;
    useEffect(() => {
        if (previousBaseRef.current === baseSnapshot)
            return;
        const wasClean = currentSnapshotRef.current === previousBaseRef.current;
        previousBaseRef.current = baseSnapshot;
        if (wasClean && room) {
            setDraft(roomToForm(room));
            setImages(imagesFromRoom(room));
        }
    }, [baseSnapshot, room]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            imagesRef.current.forEach((image) => revokeIfBlob(image.url));
        };
    }, []);

    useEffect(() => {
        if (!menuOpen)
            return;
        const closeOnOutsideClick = (event) => {
            if (!menuRef.current?.contains(event.target))
                setMenuOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [menuOpen]);

    const setField = (key) => (event) => {
        const { value } = event.target;
        setDraft((current) => ({ ...current, [key]: value }));
    };
    const bathroomValue = !draft.hasPrivateBath ? "shared" : draft.bathroomType === "separate" ? "separate" : "en-suite";
    const setBathroom = (event) => {
        const { value } = event.target;
        setDraft((current) => value === "shared"
            ? { ...current, hasPrivateBath: false }
            : { ...current, hasPrivateBath: true, bathroomType: value });
    };
    const setAirCon = (event) => {
        const hasAC = event.target.value === "yes";
        setDraft((current) => ({ ...current, hasAC }));
    };
    const toggleSelection = (setSelection, item) => setSelection((current) => {
        const next = new Set(current);
        next.has(item) ? next.delete(item) : next.add(item);
        return next;
    });

    // ---- gallery ----
    const safeActiveIndex = Math.min(activeIndex, Math.max(images.length - 1, 0));
    const activeImage = images[safeActiveIndex];
    const openPicker = () => fileInputRef.current?.click();
    const showPrevious = () => setActiveIndex((safeActiveIndex - 1 + images.length) % images.length);
    const showNext = () => setActiveIndex((safeActiveIndex + 1) % images.length);
    const handleFiles = (event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (files.length === 0)
            return;
        const accepted = [];
        for (const file of files) {
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                toast.error(`${file.name} is not a JPG, PNG, or WebP image.`);
            }
            else if (file.size > MAX_ROOM_IMAGE_MB * 1024 * 1024) {
                toast.error(`${file.name} is larger than ${MAX_ROOM_IMAGE_MB}MB.`);
            }
            else {
                accepted.push(file);
            }
        }
        const slotsLeft = Math.max(MAX_ROOM_IMAGES - images.length, 0);
        if (accepted.length > slotsLeft)
            toast.error(`You can upload up to ${MAX_ROOM_IMAGES} photos per unit.`);
        const toAdd = accepted.slice(0, slotsLeft);
        if (toAdd.length === 0)
            return;
        setImages((current) => normalizeImages([
            ...current,
            ...toAdd.map((file) => ({ id: safeRandomId(), url: URL.createObjectURL(file), file })),
        ]));
        setActiveIndex(images.length);
    };
    const removeImage = (index) => {
        revokeIfBlob(images[index]?.url);
        setImages((current) => normalizeImages(current.filter((_, position) => position !== index)));
        setActiveIndex((current) => Math.max(0, Math.min(current, images.length - 2)));
    };
    const makeCover = (index) => {
        setImages((current) => normalizeImages([current[index], ...current.filter((_, position) => position !== index)]));
        setActiveIndex(0);
    };

    // ---- actions ----
    const applyStatus = (next) => {
        setMenuOpen(false);
        setDraft((current) => ({ ...current, status: next }));
    };
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const saved = await onSave(room, draft, images, setUploadProgress);
            if (saved && room && mountedRef.current) {
                const previous = images;
                setDraft(roomToForm(saved));
                setImages(imagesFromRoom(saved));
                setActiveIndex(0);
                previous.forEach((image) => revokeIfBlob(image.url));
            }
        }
        finally {
            if (mountedRef.current) {
                setIsSaving(false);
                setUploadProgress(null);
            }
        }
    };

    return (<article className="mr-reference-editor">
      <div className="mr-reference-layout">
        <div className="mr-reference-main">
          <section className="mr-reference-section">
            <h3>Unit Photos</h3><p>Add or update photos of this unit. You can upload multiple images.</p>
            <div className="mr-reference-photos">
              {images.map((image, index) => <div className="mr-reference-photo" key={image.id}><img src={image.url} alt={`Unit photo ${index + 1}`}/><button type="button" aria-label="Remove photo" onClick={() => removeImage(index)}><X /></button></div>)}
              {images.length < MAX_ROOM_IMAGES && <button type="button" className="mr-reference-add-photo" onClick={openPicker}><Plus /><span>Add Photo</span></button>}
            </div>
            <small>Support: JPG, PNG, WebP, Max {MAX_ROOM_IMAGE_MB}MB each. ({images.length}/{MAX_ROOM_IMAGES} photos)</small>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple hidden onChange={handleFiles}/>
          </section>
          <section className="mr-reference-section">
            <h3>Unit Information</h3>
            <div className="mr-reference-fields mr-unit-information">
              <label className="mr-unit-field"><span>Unit Number / Name *</span><input required value={draft.name} onChange={setField("name")} className="mr-input" disabled={isSaving}/></label>
              <label className="mr-unit-field"><span>Capacity *</span><span className="mr-unit-capacity"><input required type="number" min={1} step={1} value={draft.maxOccupants} onChange={setField("maxOccupants")} className="mr-input" disabled={isSaving}/><span>pax</span></span></label>
              <label className="mr-unit-field"><span>Bedroom *</span><input required type="number" min={0} step={1} value={draft.bedrooms} onChange={setField("bedrooms")} className="mr-input" disabled={isSaving}/></label>
              <label className="mr-unit-field"><span>Monthly Rent *</span><input required type="number" min={0} step="0.01" value={draft.price} onChange={setField("price")} className="mr-input" disabled={isSaving}/></label>
              <label className="mr-unit-field mr-unit-description"><span>Description *</span><small>Provide a short description of this unit (maximum 500 characters).</small><textarea required rows={3} maxLength={500} value={draft.description} onChange={setField("description")} className="mr-textarea" disabled={isSaving}/><small className="mr-unit-description-count">{draft.description.length} / 500</small></label>
            </div>
          </section>
          <section className="mr-reference-section">
            <h3>Amenities</h3><p>Select the amenities available in this unit.</p>
            <div className="mr-reference-chips">{["WiFi", "Air Conditioning", "Bed", "Study Table", "Balcony", "Private Bathroom", "Hot & Cold Shower", "Window"].map((item) => <button type="button" key={item} onClick={() => toggleSelection(setSelectedAmenities, item)} className={selectedAmenities.has(item) ? "is-selected" : ""}>{item}</button>)}</div>
          </section>
          <section className="mr-reference-section">
            <h3>Utilities Included</h3><p>Select which utilities are included in the monthly rent.</p>
            <div className="mr-reference-chips mr-reference-utilities">{["Water", "Electricity", "Internet"].map((item) => <button type="button" key={item} onClick={() => toggleSelection(setSelectedUtilities, item)} className={selectedUtilities.has(item) ? "is-selected" : ""}>{item}</button>)}</div>
          </section>
        </div>
        <aside className="mr-reference-side">
          <section className="mr-reference-section"><h3>Unit Status</h3><p>Set the current status of this unit.</p>
            {["available", "occupied", "maintenance"].map((value) => <button type="button" key={value} aria-pressed={status === value} onClick={() => applyStatus(value)} className={`mr-reference-status ${status === value ? "is-selected" : ""}`}><span aria-hidden="true"/><strong>{getStatusOption(value).label}</strong><small>{value === "available" ? "Unit is available for rent." : value === "occupied" ? "Unit is currently rented out." : "Unit is temporarily unavailable."}</small></button>)}
          </section>
          <section className="mr-reference-section"><h3>Unit Preview</h3><p>This is how this unit will appear to tenants.</p>
            <div className="mr-reference-preview"><div>{activeImage && <img src={activeImage.url} alt="Unit preview"/>}</div><section><b>{draft.name || "Unit"}</b><span>{draft.type} &nbsp;–&nbsp; {draft.maxOccupants || 1} pax</span><strong>₱{Number(draft.price || 0).toLocaleString("en-PH")}/month</strong><div className="mr-reference-preview-tags">{[...selectedAmenities].slice(0, 4).map((item) => <em key={item}>{item}</em>)}</div></section><small>{draft.description || "No unit description provided."}</small></div>
          </section>
        </aside>
      </div>
      <footer className="mr-reference-footer"><Button type="button" variant="outline" onClick={onCancelNew} disabled={isSaving}>Cancel</Button><Button type="button" onClick={() => void handleSave()} disabled={isSaving || busy || (!isNew && !isDirty)}>{isSaving ? "Saving..." : "Save Changes"}</Button></footer>
    </article>);

    const bathroomSelect = (<select value={bathroomValue} onChange={setBathroom} disabled={isSaving} className="mr-input mr-select">
      <option value="shared">Shared</option>
      <option value="en-suite">Private (en-suite)</option>
      <option value="separate">Private (separate)</option>
    </select>);

    return (<article className={`mr-card${isNew ? " mr-card--new" : ""}`}>
      <div className="mr-card-body">
        {/* ------------------------------ gallery ------------------------------ */}
        <div className="mr-gallery">
          <div className="mr-stage">
            {activeImage ? (<>
                <img src={activeImage.url} alt={`${draft.name || "Unit"} photo ${safeActiveIndex + 1}`} className="mr-stage-image"/>
                {safeActiveIndex === 0 ? <span className="mr-cover-tag">Cover</span> : null}
                <div className="mr-stage-tools">
                  {safeActiveIndex > 0 ? <button type="button" className="mr-chip" onClick={() => makeCover(safeActiveIndex)} disabled={isSaving}><Star className="mr-icon-sm"/>Make cover</button> : null}
                  <button type="button" className="mr-chip mr-chip--danger" aria-label="Remove this photo" onClick={() => removeImage(safeActiveIndex)} disabled={isSaving}><X className="mr-icon-sm"/></button>
                </div>
              </>) : (<button type="button" className="mr-stage-empty" onClick={openPicker} disabled={isSaving}><ImagePlus className="mr-stage-empty-icon"/><span>No photo yet</span></button>)}
            {images.length > 1 ? (<>
                <button type="button" className="photo-navigation-arrow mr-arrow mr-arrow--prev" aria-label="Previous photo" onClick={showPrevious}><ChevronLeft className="mr-icon-md"/></button>
                <button type="button" className="photo-navigation-arrow mr-arrow mr-arrow--next" aria-label="Next photo" onClick={showNext}><ChevronRight className="mr-icon-md"/></button>
              </>) : null}
          </div>

          <div className="mr-thumbs">
            {images.map((image, index) => (<button key={image.id} type="button" aria-label={`Show photo ${index + 1}`} onClick={() => setActiveIndex(index)} className={`mr-thumb${index === safeActiveIndex ? " is-active" : ""}`}><img src={image.url} alt=""/></button>))}
            {images.length < MAX_ROOM_IMAGES ? <button type="button" className="mr-thumb mr-thumb--add" onClick={openPicker} disabled={isSaving}><Plus className="mr-icon-md"/><span>Add Photo</span></button> : null}
          </div>

          <p className="mr-hint">Upload up to {MAX_ROOM_IMAGES} images (JPG, PNG, WebP). Max {MAX_ROOM_IMAGE_MB}MB each.</p>
          {uploadProgress !== null ? <div className="mr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uploadProgress)}><span style={{ width: `${uploadProgress}%` }}/></div> : null}
          <button type="button" className="mr-upload" onClick={openPicker} disabled={isSaving}><Upload className="mr-icon-md"/>Upload a Photo / Change Photos</button>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple hidden onChange={handleFiles}/>
        </div>

        {/* ------------------------------ details ------------------------------ */}
        <div className="mr-details">
          <div className="mr-head">
            <div className="mr-head-main">
              <div className="mr-title-row">
                <label className="mr-name">
                  <input ref={nameInputRef} value={draft.name} onChange={setField("name")} placeholder="Unit number / name" aria-label="Unit number or name" className="mr-name-input" disabled={isSaving}/>
                  <Pencil className="mr-pencil" aria-hidden="true"/>
                </label>
                <Badge className={`${statusOption.className} manage-rooms-badge-5`}>{statusOption.label}</Badge>
              </div>
              <p className="mr-muted">{(room?.description ?? "").trim() || "No unit description provided."}</p>
            </div>

            <div className="mr-head-actions">
              <div className="mr-mini">
                {isNew ? (<button type="button" className="mr-mini-btn" onClick={onCancelNew} disabled={isSaving}>Cancel</button>) : (<>
                    <button type="button" className="mr-mini-btn" onClick={() => nameInputRef.current?.focus()} disabled={controlsLocked}>Edit Unit</button>
                    <button type="button" className="mr-mini-btn mr-mini-btn--danger" onClick={() => void onDelete(room)} disabled={controlsLocked}>Delete Unit</button>
                  </>)}
              </div>
              <div className="mr-menu" ref={menuRef}>
                <button type="button" aria-label={`Actions for ${draft.name || "unit"}`} aria-expanded={menuOpen} disabled={controlsLocked} onClick={() => setMenuOpen((open) => !open)} className="mr-kebab"><MoreVertical className="mr-icon-md"/></button>
                {menuOpen ? (<div className="mr-menu-list" role="menu">
                    {status !== "maintenance"
                ? <button type="button" role="menuitem" onClick={() => applyStatus("maintenance")}><Wrench className="mr-icon-sm"/>Mark as Under Maintenance</button>
                : <button type="button" role="menuitem" onClick={() => applyStatus("occupied")}><Users className="mr-icon-sm"/>Mark as Occupied</button>}
                  </div>) : null}
              </div>
            </div>
          </div>

          <div className="mr-fields">
            <Field label="Monthly Rent" prefix="₱" className="mr-span-1"><input type="number" inputMode="decimal" min={0} step="any" value={draft.price} onChange={setField("price")} className="mr-input hide-number-spinners" placeholder="0" disabled={isSaving}/></Field>
            <Field label="Capacity" suffix={Number(draft.maxOccupants) === 1 ? "person" : "people"} className="mr-span-1"><input type="number" min={1} value={draft.maxOccupants} onChange={setField("maxOccupants")} className="mr-input hide-number-spinners" placeholder="1" disabled={isSaving}/></Field>
            <Field label="Unit Type" chevron className="mr-span-1"><select value={draft.type} onChange={setField("type")} className="mr-input mr-select" disabled={isSaving}>{ROOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
            <Field label="Unit Size" suffix="sq ft" className="mr-span-1"><input type="number" min={0} value={draft.sqft} onChange={setField("sqft")} className="mr-input hide-number-spinners" placeholder="0" disabled={isSaving}/></Field>
            <Field label="Bathroom" chevron className="mr-span-2">{bathroomSelect}</Field>
            <Field label="Air Conditioning" chevron className="mr-span-2"><select value={draft.hasAC ? "yes" : "no"} onChange={setAirCon} className="mr-input mr-select" disabled={isSaving}><option value="no">No air conditioning</option><option value="yes">With air conditioning</option></select></Field>
            {bathroomValue === "shared" ? <Field label="Shared bathroom location (optional)" className="mr-span-4"><input value={draft.sharedBathLocation} onChange={setField("sharedBathLocation")} className="mr-input" placeholder="e.g. End of the hallway" disabled={isSaving}/></Field> : null}
          </div>

          <label className="mr-desc">
            <span className="mr-desc-label">Unit description</span>
            <span className="mr-desc-control">
              <textarea rows={3} value={draft.description} onChange={setField("description")} placeholder="Add unit description..." className="mr-textarea" disabled={isSaving}/>
              <Pencil className="mr-pencil mr-pencil--corner" aria-hidden="true"/>
            </span>
          </label>

          <div className="mr-footer">
            <Button type="button" variant="outline" disabled={controlsLocked} onClick={() => applyStatus(status === "available" ? "occupied" : "available")} className="mr-btn-status">
              {status === "available" ? <><Users className="mr-icon-sm"/>Mark as Occupied</> : <><CheckCircle2 className="mr-icon-sm"/>Mark as Available</>}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving || busy || (!isNew && !isDirty)} className="mr-btn-save">{isSaving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </div>
    </article>);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export function ManageRooms({ propertyId }) {
    const { id: routeId, roomId } = useParams();
    const id = propertyId ?? routeId;
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { refreshApartments } = useApartmentsContext();
    const [property, setProperty] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingRoomId, setProcessingRoomId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const mainRef = useRef(null);
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!id)
                return;
            setIsLoading(true);
            try {
                const [loadedProperty, loadedRooms] = await Promise.all([
                    fetchApartmentWithImages(id),
                    fetchApartmentRooms(id),
                ]);
                if (!active)
                    return;
                setProperty(loadedProperty);
                setRooms(loadedRooms);
            }
            catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to load units.");
            }
            finally {
                if (active)
                    setIsLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [id]);
    useEffect(() => {
        if (!id)
            return;
        const refreshRooms = () => { void fetchApartmentRooms(id).then(setRooms).catch(() => undefined); };
        const refreshProperty = () => { void fetchApartmentWithImages(id).then(setProperty).catch(() => undefined); };
        const channel = supabase
            .channel(`manage-rooms-${id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "apartment_rooms", filter: `apartment_id=eq.${id}` }, refreshRooms)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "apartments", filter: `id=eq.${id}` }, refreshProperty)
            .subscribe();
        const refreshOnFocus = () => { refreshRooms(); refreshProperty(); };
        const refreshOnVisibility = () => {
            if (document.visibilityState === "visible")
                refreshOnFocus();
        };
        window.addEventListener("focus", refreshOnFocus);
        window.addEventListener("online", refreshOnFocus);
        document.addEventListener("visibilitychange", refreshOnVisibility);
        return () => {
            window.removeEventListener("focus", refreshOnFocus);
            window.removeEventListener("online", refreshOnFocus);
            document.removeEventListener("visibilitychange", refreshOnVisibility);
            void supabase.removeChannel(channel);
        };
    }, [id]);
    const roomCounts = useMemo(() => ({
        total: rooms.length,
        available: rooms.filter((room) => statusForRoom(room) === "available").length,
        occupied: rooms.filter((room) => statusForRoom(room) === "occupied").length,
        maintenance: rooms.filter((room) => statusForRoom(room) === "maintenance").length,
    }), [rooms]);
    if (user?.role !== "landlord")
        return <Navigate to="/browse" replace/>;
    const canManage = property && property.landlordId === user.id;

    // Called by a card's Save button. `existing` is the saved room, or null for a new one.
    // Resolves to the saved room, or null if validation/saving failed.
    const saveRoom = async (existing, form, images, onProgress) => {
        if (!id)
            return null;
        if (!form.name.trim()) {
            toast.error("Please enter a unit number or name.");
            return null;
        }
        if (!form.price || Number(form.price) < 0) {
            toast.error("Please enter a valid monthly rent.");
            return null;
        }
        if (Number(form.maxOccupants) < 1) {
            toast.error("Unit capacity must be at least one.");
            return null;
        }
        if (!Number.isInteger(Number(form.maxOccupants)) || Number(form.maxOccupants) < 1) {
            toast.error("Capacity must be a whole number of at least one.");
            return null;
        }
        if (form.bedrooms === "" || !Number.isInteger(Number(form.bedrooms)) || Number(form.bedrooms) < 0) {
            toast.error("Please enter a whole number of bedrooms (zero for a studio).");
            return null;
        }
        if (!form.description.trim() || form.description.length > 500) {
            toast.error("Please enter a unit description of up to 500 characters.");
            return null;
        }
        try {
            const imageUrls = await uploadPendingRoomImages(id, existing?.id, images, onProgress);
            // Existing rooms keep their persisted status (changed by the status buttons, not by Save).
            const payload = buildRoomPayload({ ...form, id: existing?.id }, imageUrls, form.status);
            let saved;
            if (existing) {
                saved = await updateApartmentRoom(id, existing.id, payload, user.id);
                setRooms((current) => current.map((item) => item.id === existing.id ? saved : item));
                toast.success("Unit updated");
            }
            else {
                saved = await createApartmentRoom(id, payload, user.id);
                setRooms((current) => [...current, saved]);
                toast.success("Unit added");
            }
            try {
                await refreshApartments();
            }
            catch {
                // The room itself was saved; a failed list refresh must not look like a failed save.
            }
            return saved;
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save unit.");
            return null;
        }
    };
    const removeRoom = async (room) => {
        if (!id || !room.id || processingRoomId)
            return false;
        const roomName = room.name || "this unit";
        if (!window.confirm(`Are you sure you want to delete ${roomName}?\n\nThis removes only this unit, not the apartment.`))
            return false;
        setProcessingRoomId(room.id);
        try {
            await deleteApartmentRoom(id, room.id, user.id);
            setRooms((current) => current.filter((item) => item.id !== room.id));
            await refreshApartments();
            toast.success("Unit deleted");
            return true;
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to delete unit.");
            return false;
        }
        finally {
            setProcessingRoomId(null);
        }
    };
    const handleLogout = () => {
        logout();
        navigate("/", { replace: true });
    };
    if (isLoading) {
        return <div className="manage-rooms-loading-room-management">Loading unit management...</div>;
    }
    if (!property || !canManage) {
        return (<div className="manage-rooms-grid">
        <div>
          <DoorOpen className="manage-rooms-door-open-icon"/>
          <h1 className="manage-rooms-property-not-available">Apartment Not Available</h1>
          <p className="manage-rooms-text">This apartment could not be found or is not assigned to your account.</p>
          <Button onClick={() => navigate("/landlord/dashboard?section=overview")}>Back to My Apartments</Button>
        </div>
      </div>);
    }
    const roomsPerPage = 4;
    const totalPages = Math.max(1, Math.ceil(rooms.length / roomsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const visibleRooms = sortRoomsByAvailability(rooms).slice((safePage - 1) * roomsPerPage, safePage * roomsPerPage);
    const formatRent = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;
    const statusLabel = (room) => getStatusOption(statusForRoom(room)).label;
    const editorRoom = roomId === "new" ? null : rooms.find((room) => room.id === roomId);
    const returnToRooms = () => navigate(`/landlord/properties/${id}/rooms`, { replace: true });

    if (roomId) {
        if (!editorRoom && roomId !== "new") {
            return <div className="manage-rooms-grid"><div><DoorOpen className="manage-rooms-door-open-icon"/><h1 className="manage-rooms-property-not-available">Unit Not Available</h1><p className="manage-rooms-text">This unit could not be found in the selected apartment.</p><Button onClick={returnToRooms}>Back to Manage Units</Button></div></div>;
        }
        return <main className="manage-rooms-editor-page">
          <div className="manage-rooms-editor-page-content">
            <header className="manage-rooms-editor-header">
              <button type="button" className="manage-rooms-editor-back" onClick={returnToRooms}><ArrowLeft /> Back to Manage Units</button>
              <div><h1>{editorRoom ? `Edit Unit — ${editorRoom.name || "Unnamed unit"}` : "Add a Unit"}</h1><p>{editorRoom ? "Update this unit's details, photos, and availability." : "Enter the details for the new rental unit."}</p></div>
            </header>
            <RoomEditorCard key={editorRoom?.id || "new-room"} room={editorRoom} busy={processingRoomId !== null} onSave={async (...args) => {
              const saved = await saveRoom(...args);
              if (saved) returnToRooms();
              return saved;
            }} onDelete={async (room) => {
              const removed = await removeRoom(room);
              if (removed) returnToRooms();
            }} onCancelNew={returnToRooms}/>
          </div>
        </main>;
    }

    const page = (<main ref={mainRef} className="manage-rooms-table-page">
      <button type="button" onClick={() => navigate(-1)} className="manage-rooms-table-back">
        <ArrowLeft /> Back to View Apartment
      </button>

      <header className="manage-rooms-table-title">
        <h1>Manage Units — {property.title || "Apartment"}</h1>
        <p>Add, edit, or update the units.</p>
      </header>

      <section className="manage-rooms-table-card">
        <div className="manage-rooms-table-heading">
          <div>
            <h2>Units ({roomCounts.total})</h2>
            <p>Manage the individual rental units inside this apartment building.</p>
          </div>
          <Button onClick={() => navigate(`/landlord/properties/${id}/rooms/new/edit`)} className="manage-rooms-table-add-room">
            <Plus /> Add Unit
          </Button>
        </div>

        {rooms.length === 0 ? (<div className="manage-rooms-table-empty">
            <DoorOpen />
            <h3>No units have been added yet.</h3>
            <p>Add the first unit to make availability visible across your apartment listing.</p>
            <Button onClick={() => navigate(`/landlord/properties/${id}/rooms/new/edit`)} className="manage-rooms-table-add-room"><Plus /> Add First Unit</Button>
          </div>) : (<>
            <div className="manage-rooms-mobile-list">
              {visibleRooms.map((room) => (
                <article className="manage-rooms-mobile-room" key={room.id}>
                  <div className="manage-rooms-mobile-room-heading">
                    <div>
                      <p>Unit</p>
                      <h3>{room.name || "Unnamed unit"}</h3>
                    </div>
                    <span className={`manage-rooms-table-status manage-rooms-table-status--${statusForRoom(room)}`}>{statusLabel(room)}</span>
                  </div>
                  <dl className="manage-rooms-mobile-room-details">
                    <div><dt>Type</dt><dd>{room.type || "Unit"}</dd></div>
                    <div><dt>Monthly rent</dt><dd>{formatRent(room.price)}</dd></div>
                    <div><dt>Capacity</dt><dd>{Number(room.maxOccupants || 1)} {Number(room.maxOccupants || 1) === 1 ? "person" : "people"}</dd></div>
                  </dl>
                  <div className="manage-rooms-mobile-room-actions">
                    <button type="button" onClick={() => navigate(`/landlord/properties/${id}/rooms/${room.id}/edit`)} disabled={processingRoomId !== null}><Pencil /> Edit unit</button>
                    <button type="button" onClick={() => void removeRoom(room)} disabled={processingRoomId !== null} className="manage-rooms-table-delete">Delete</button>
                  </div>
                </article>
              ))}
            </div>
            <div className="manage-rooms-table-scroll">
              <table className="manage-rooms-table">
                <thead><tr><th>Apartment Unit</th><th>Unit Type</th><th>Monthly Rent</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{visibleRooms.map((room) => (<tr key={room.id}>
                    <th scope="row">{room.name || "Unnamed unit"}</th>
                    <td><span className="manage-rooms-table-type">{room.type || "Unit"}</span></td>
                    <td>{formatRent(room.price)}</td>
                    <td>{Number(room.maxOccupants || 1)} {Number(room.maxOccupants || 1) === 1 ? "pax" : "pax"}</td>
                    <td><span className={`manage-rooms-table-status manage-rooms-table-status--${statusForRoom(room)}`}>{statusLabel(room)}</span></td>
                    <td><div className="manage-rooms-table-actions"><button type="button" onClick={() => navigate(`/landlord/properties/${id}/rooms/${room.id}/edit`)} disabled={processingRoomId !== null}><Pencil /> Edit</button><button type="button" onClick={() => void removeRoom(room)} disabled={processingRoomId !== null} className="manage-rooms-table-delete">Delete</button></div></td>
                  </tr>))}</tbody>
              </table>
            </div>
            <div className="manage-rooms-table-pagination">
              <button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft /></button>
              <span>Page {safePage} of {totalPages}</span>
              <button type="button" aria-label="Next page" disabled={safePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight /></button>
            </div>
          </>)}
      </section>
    </main>);
    return (<div className="landlord-manage-rooms landlord-shell">
      <aside className="app-shell-fixed-sidebar">
        <LandlordSidebar
          user={user}
          activeSection="overview"
          onSectionChange={(section) => navigate(section === "overview" ? "/landlord/dashboard" : `/landlord/dashboard?section=${section}`)}
          onLogout={handleLogout}
        />
      </aside>

      {sidebarOpen ? (<div className="app-sidebar-overlay" role="presentation">
          <button type="button" className="manage-rooms-close-navigation" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}/>
          <aside className="app-sidebar-drawer is-open">
            <button type="button" className="app-sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><X className="manage-rooms-x-icon"/></button>
            <LandlordSidebar
              user={user}
              activeSection="overview"
              onSectionChange={(section) => navigate(section === "overview" ? "/landlord/dashboard" : `/landlord/dashboard?section=${section}`)}
              onClose={() => setSidebarOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>) : null}

      <div className="app-shell-page-main">
        <LandlordMenuTrigger iconClassName="manage-rooms-menu-icon" expanded={sidebarOpen} onClick={() => setSidebarOpen(true)} />
        <div className="app-shell-content app-shell-content-mobile-nav">
          {page}
        </div>
      </div>
    </div>);
}
