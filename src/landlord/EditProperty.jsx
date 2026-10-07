import "./EditProperty.css";
import { ArrowLeft, Building2, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { MultiImageUploader } from "@/components/MultiImageUploader";
import { Button } from "@/components/ui/button";
import { PropertyLocationPicker } from "@/landlord/PropertyLocationPicker";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { apartmentToFormValues } from "@/utils/apartmentMappers";
import { fetchApartmentWithImages, persistApartmentImages, updateApartment } from "@/data/apartments";
import { DEFAULT_LA_PAZ_MAP_CENTER, hasValidApartmentCoordinates } from "@/utils/mapCoordinates";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const toList = (value) => Array.isArray(value)
  ? value.filter((item) => typeof item === "string" && item.trim())
  : typeof value === "string" ? value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean) : [];
const DEFAULT_UTILITIES = ["Electricity", "Water", "Wi-Fi"];

const initialForm = (apartment) => ({
  title: apartment.title ?? "",
  description: apartment.description ?? "",
  address: apartment.address ?? "",
  city: apartment.city ?? "",
  state: apartment.state ?? "",
  zip: apartment.zip ?? "",
  lat: hasValidApartmentCoordinates(apartment.lat, apartment.lng) ? Number(apartment.lat) : DEFAULT_LA_PAZ_MAP_CENTER.lat,
  lng: hasValidApartmentCoordinates(apartment.lat, apartment.lng) ? Number(apartment.lng) : DEFAULT_LA_PAZ_MAP_CENTER.lng,
  minPrice: String(Number(apartment.features?.priceRange?.min) || Number(apartment.price) || ""),
  maxPrice: String(Number(apartment.features?.priceRange?.max) || Number(apartment.price) || ""),
  rules: toList(apartment.features?.customFeatures),
  utilityItems: toList(apartment.utilities),
});

export function EditProperty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canEditApartment } = useAuth();
  const { refreshApartments } = useApartmentsContext();
  const [apartment, setApartment] = useState(null);
  const [form, setForm] = useState(null);
  const [images, setImages] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [newRule, setNewRule] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationLookup, setLocationLookup] = useState(0);
  const [resolvingLocation, setResolvingLocation] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchApartmentWithImages(id).then((listing) => {
      if (!active) return;
      setApartment(listing);
      if (listing) {
        setForm(initialForm(listing));
        setImages((listing.images ?? []).map((url, index) => ({ id: `existing-${index}`, url, isPrimary: index === 0, sortOrder: index })));
      }
    }).catch((error) => {
      console.error("Unable to load property for editing:", error);
      toast.error("Unable to load this property.");
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const canEdit = apartment && (apartment.landlordId === user?.id || canEditApartment(apartment.id, apartment.landlordId));
  const displayImages = images.map((image) => image.url).filter(Boolean);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const addRule = () => {
    const rule = newRule.trim();
    if (!rule || form.rules.some((item) => item.toLowerCase() === rule.toLowerCase())) return;
    setField("rules", [...form.rules, rule]);
    setNewRule("");
  };
  const toggleUtility = (utility) => {
    setField("utilityItems", form.utilityItems.includes(utility)
      ? form.utilityItems.filter((item) => item !== utility)
      : [...form.utilityItems, utility]);
  };
  const save = async (event) => {
    event.preventDefault();
    if (!apartment || !canEdit || saving) return;
    if (!form.title.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim()) {
      toast.error("Please complete the property name and location fields.");
      return;
    }
    if (!hasValidApartmentCoordinates(form.lat, form.lng)) {
      toast.error("Please pin the property's exact location before saving.");
      return;
    }
    const minPrice = Number(form.minPrice);
    const maxPrice = Number(form.maxPrice);
    if (!Number.isFinite(minPrice) || minPrice < 0 || !Number.isFinite(maxPrice) || maxPrice < minPrice) {
      toast.error("Enter a valid price range. The maximum rent must be at least the minimum rent.");
      return;
    }
    setSaving(true);
    try {
      const savedDetails = await updateApartment(apartment.id, {
        ...apartmentToFormValues({
          ...apartment,
          ...form,
          features: { ...(apartment.features && !Array.isArray(apartment.features) ? apartment.features : {}), customFeatures: form.rules, priceRange: { min: minPrice, max: maxPrice } },
          lat: form.lat,
          lng: form.lng,
        }),
        utilities: form.utilityItems.length > 0,
        utilityItems: form.utilityItems,
      }, user?.id);
      const saved = await persistApartmentImages(apartment.id, images, user?.id);
      setApartment(saved ?? savedDetails);
      await refreshApartments();
      toast.success("Property details saved.");
      navigate(`/apartment/${apartment.id}`, { state: { returnTo: "/landlord/dashboard", backLabel: "Back to My Properties" } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="edit-property-status">Loading property…</div>;
  if (!apartment || !form) return <div className="edit-property-status">Property not found.</div>;
  if (!canEdit) return <div className="edit-property-status">You do not have permission to edit this property.</div>;

  return <main className="edit-property-page">
    <form className="edit-property-content" onSubmit={save}>
      <header className="edit-property-header">
        <div>
          <button type="button" className="edit-property-back" onClick={() => navigate(`/apartment/${apartment.id}`, { state: { returnTo: "/landlord/dashboard", backLabel: "Back to My Properties" } })}><ArrowLeft/> Back to Property</button>
          <h1>Edit Property</h1>
          <p>Update your property information, photos, and location.</p>
        </div>
        <div className="edit-property-header-actions"><Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || resolvingLocation}>{saving ? "Saving…" : resolvingLocation ? "Finding location…" : "Save Changes"}</Button></div>
      </header>

      <div className="edit-property-grid">
        <div className="edit-property-left">
          <section className="edit-property-card edit-property-photo-card"><h2>Apartment Photos</h2><p>Upload clear photos of your property. Drag thumbnails to reorder them.</p>
            {displayImages.length > 0 && <><div className="edit-property-main-photo">{displayImages[imageIndex] ? <img src={displayImages[imageIndex]} alt={`Property photo ${imageIndex + 1}`}/> : <Building2/>}{displayImages.length > 1 && <><button type="button" className="edit-property-gallery-arrow is-left" aria-label="Previous photo" onClick={() => setImageIndex((imageIndex - 1 + displayImages.length) % displayImages.length)}><ChevronLeft/></button><button type="button" className="edit-property-gallery-arrow is-right" aria-label="Next photo" onClick={() => setImageIndex((imageIndex + 1) % displayImages.length)}><ChevronRight/></button></>}</div><div className="edit-property-thumbnails">{displayImages.slice(0, 4).map((url, index) => <button type="button" key={`${url}-${index}`} className={index === imageIndex ? "is-active" : ""} onClick={() => setImageIndex(index)}><img src={url} alt={`Property thumbnail ${index + 1}`}/></button>)}</div></>}
            <MultiImageUploader images={images} onImagesChange={setImages} maxImages={10} disabled={saving}/>
          </section>
          <section className="edit-property-card"><h2>Location</h2><p>Enter the address, then confirm the exact pin on the map.</p><div className="edit-property-address-fields"><label>Address<input value={form.address} onChange={(event) => setField("address", event.target.value)} placeholder="Street address" required/></label><label>City<input value={form.city} onChange={(event) => setField("city", event.target.value)} placeholder="City" required/></label><label>Province<input value={form.state} onChange={(event) => setField("state", event.target.value)} placeholder="Province" required/></label><label>ZIP Code<input value={form.zip} onChange={(event) => setField("zip", event.target.value)} placeholder="ZIP code" required/></label></div><Button type="button" variant="outline" className="edit-property-find-location" onClick={() => setLocationLookup((current) => current + 1)} disabled={saving}>Find address on map</Button><PropertyLocationPicker lat={form.lat} lng={form.lng} addressQuery={[form.address, form.city, form.state, form.zip, "Philippines"].filter(Boolean).join(", ")} geocodeRequestKey={locationLookup} onGeocodeStatusChange={(status) => setResolvingLocation(status === "loading")} onLocationChange={(lat, lng) => setForm((current) => ({ ...current, lat, lng }))}/></section>
        </div>

        <aside className="edit-property-right">
          <section className="edit-property-card"><h2>Property Name</h2><input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="e.g. La Paz Apartment" required/></section>
          <section className="edit-property-card"><h2>About this apartment</h2><textarea value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="Describe the property, nearby landmarks, and what renters can expect."/></section>
          <section className="edit-property-card"><div className="edit-property-card-heading"><div><h2>Price Range</h2><p>Set the monthly-rent range shown on your property page.</p></div></div><div className="edit-property-prices"><label>Minimum Monthly Rent (₱)<input type="number" min="0" step="1" value={form.minPrice} onChange={(event) => setField("minPrice", event.target.value)} placeholder="e.g. 3500" required/></label><label>Maximum Monthly Rent (₱)<input type="number" min="0" step="1" value={form.maxPrice} onChange={(event) => setField("maxPrice", event.target.value)} placeholder="e.g. 6000" required/></label></div></section>
          <section className="edit-property-card"><h2>House Rules &amp; Policies</h2><p>Add the expectations that tenants should see before inquiring.</p><div className="edit-property-rules">{form.rules.map((rule) => <span key={rule}>{rule}<button type="button" onClick={() => setField("rules", form.rules.filter((item) => item !== rule))} aria-label={`Remove ${rule}`}><X/></button></span>)}</div><div className="edit-property-rule-add"><input value={newRule} onChange={(event) => setNewRule(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addRule(); } }} placeholder="Add a house rule"/><Button type="button" onClick={addRule} disabled={!newRule.trim()}><Plus/>Add</Button></div></section>
          <section className="edit-property-card"><h2>Utilities Included</h2><p>Select the utilities included in the monthly rent.</p><div className="edit-property-utilities">{[...new Set([...DEFAULT_UTILITIES, ...form.utilityItems])].map((utility) => <button type="button" key={utility} aria-pressed={form.utilityItems.includes(utility)} className={form.utilityItems.includes(utility) ? "is-selected" : ""} onClick={() => toggleUtility(utility)}>{utility}</button>)}</div></section>
        </aside>
      </div>
    </form>
  </main>;
}
