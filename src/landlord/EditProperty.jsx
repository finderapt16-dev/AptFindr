import "./EditProperty.css";
import { ArrowLeft, X } from "lucide-react";
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
const INCLUDED_CHOICES = ["Water", "Electricity", "Internet", "Parking", "Laundry Area", "Furnished"];
const RULE_CHOICES = ["Students Only", "Visitors Allowed", "Cooking Allowed", "Quiet Hours", "No Smoking", "No Alcohol", "Pets Allowed", "No Overnight Guests"];
const CONTRACT_DURATIONS = ["1 Month", "6 Months", "12 Months", "Flexible"];

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
  rules: toList(apartment.features?.houseRules ?? apartment.features?.safetyRules ?? apartment.features?.customFeatures),
  utilityItems: toList(apartment.utilities),
  amenityItems: toList(apartment.amenities),
  furnished: apartment.furnished ?? false,
  parking: apartment.parking ?? false,
  contractDuration: apartment.features?.contractDuration || apartment.contractDuration || "",
});

export function EditProperty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canEditApartment } = useAuth();
  const { refreshApartments } = useApartmentsContext();
  const [apartment, setApartment] = useState(null);
  const [form, setForm] = useState(null);
  const [images, setImages] = useState([]);
  const [newRule, setNewRule] = useState("");
  const [newIncluded, setNewIncluded] = useState("");
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
      console.error("Unable to load apartment for editing:", error);
      toast.error("Unable to load this apartment.");
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const canEdit = apartment && (apartment.landlordId === user?.id || canEditApartment(apartment.id, apartment.landlordId));
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const addRule = () => {
    const rule = newRule.trim();
    if (!rule || form.rules.some((item) => item.toLowerCase() === rule.toLowerCase())) return;
    setField("rules", [...form.rules, rule]);
    setNewRule("");
  };
  const includedItems = form ? [...new Set([...form.utilityItems, ...form.amenityItems, ...(form.parking ? ["Parking"] : []), ...(form.furnished ? ["Furnished"] : [])])] : [];
  const toggleIncluded = (item) => {
    if (item === "Parking" || item === "Furnished") return setField(item.toLowerCase(), !form[item.toLowerCase()]);
    const selected = includedItems.includes(item);
    setForm(current => ({ ...current,
      utilityItems: selected ? current.utilityItems.filter(value => value !== item) : ["Water", "Electricity", "Internet", "Wi-Fi"].includes(item) ? [...current.utilityItems, item] : current.utilityItems,
      amenityItems: selected ? current.amenityItems.filter(value => value !== item) : ["Water", "Electricity", "Internet", "Wi-Fi"].includes(item) ? current.amenityItems : [...current.amenityItems, item],
    }));
  };
  const addIncluded = () => {
    const item = newIncluded.trim();
    if (!item || includedItems.some(value => value.toLowerCase() === item.toLowerCase())) return;
    toggleIncluded(item);
    setNewIncluded("");
  };
  const toggleRule = (rule) => setField("rules", form.rules.includes(rule) ? form.rules.filter(item => item !== rule) : [...form.rules, rule]);
  const save = async (event) => {
    event.preventDefault();
    if (!apartment || !canEdit || saving) return;
    if (!form.title.trim() || !form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim()) {
      toast.error("Please complete the apartment name and location fields.");
      return;
    }
    if (!hasValidApartmentCoordinates(form.lat, form.lng)) {
      toast.error("Please pin the apartment's exact location before saving.");
      return;
    }
    if (!form.contractDuration) {
      toast.error("Select a contract duration.");
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
          features: { ...(apartment.features && !Array.isArray(apartment.features) ? apartment.features : {}), houseRules: form.rules, ...(apartment.features?.safetyRules ? { safetyRules: form.rules } : {}), contractDuration: form.contractDuration, priceRange: { min: minPrice, max: maxPrice } },
          amenities: form.amenityItems,
          lat: form.lat,
          lng: form.lng,
        }),
        utilities: form.utilityItems.length > 0,
        utilityItems: form.utilityItems,
        contractDuration: form.contractDuration,
        houseRules: form.rules,
      }, user?.id);
      const saved = await persistApartmentImages(apartment.id, images, user?.id);
      setApartment(saved ?? savedDetails);
      await refreshApartments();
      toast.success("Apartment details saved.");
      navigate(`/apartment/${apartment.id}`, { state: { returnTo: "/landlord/dashboard", backLabel: "Back to My Apartments" } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="edit-property-status">Loading apartment…</div>;
  if (!apartment || !form) return <div className="edit-property-status">Apartment not found.</div>;
  if (!canEdit) return <div className="edit-property-status">You do not have permission to edit this apartment.</div>;

  return <main className="edit-property-page">
    <form className="edit-property-content" onSubmit={save}>
      <header className="edit-property-header">
        <button type="button" className="edit-property-back" onClick={() => navigate(`/apartment/${apartment.id}`)}><ArrowLeft/> Back to Apartment</button>
        <h1>Edit Apartment</h1>
        <p>Update the details of your apartment listing.</p>
      </header>
      <fieldset className="edit-property-fields" disabled={saving}>
        <section className="edit-property-card edit-property-photo-card">
          <h2>Apartment Images <span>*</span></h2><p>Upload clear apartment photos. You can upload multiple images.</p>
          <MultiImageUploader images={images} onImagesChange={setImages} maxImages={10} disabled={saving} compact/>
          <small>Supported JPG, PNG, WEBP. Max 5 MB each.</small>
        </section>
        <section className="edit-property-card edit-property-name"><label htmlFor="edit-title">Apartment Name</label><input id="edit-title" value={form.title} onChange={event => setField("title", event.target.value)} required/></section>
        <section className="edit-property-card"><h2>Price Range</h2><div className="edit-property-prices"><label>Minimum Monthly Rent (₱)<input type="number" min="0" step="1" value={form.minPrice} onChange={event => setField("minPrice", event.target.value)} required/></label><label>Maximum Monthly Rent (₱)<input type="number" min="0" step="1" value={form.maxPrice} onChange={event => setField("maxPrice", event.target.value)} required/></label></div></section>
        <section className="edit-property-card"><label htmlFor="edit-description">About this apartment</label><p>Provide a clear description of your apartment (maximum 500 characters).</p><textarea id="edit-description" value={form.description} maxLength={Math.max(500, form.description.length)} onChange={event => setField("description", event.target.value)} placeholder="Add description..."/><small className="edit-property-character-count">{form.description.length} / 500</small></section>
        <section className="edit-property-card"><h2>Apartment Included <span>*</span></h2><p>Select which features are included in the base rent price for your apartment.</p>
          <div className="edit-property-choice-grid">{INCLUDED_CHOICES.map(item => <button type="button" key={item} aria-pressed={includedItems.includes(item)} className={includedItems.includes(item) ? "is-selected" : ""} onClick={() => toggleIncluded(item)}>{item}</button>)}</div>
          <label className="edit-property-other-label" htmlFor="edit-other-included">Other included features (optional)</label><div className="edit-property-add-row"><input id="edit-other-included" value={newIncluded} onChange={event => setNewIncluded(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addIncluded(); } }} placeholder="Type a feature and press Enter"/><Button type="button" onClick={addIncluded} disabled={!newIncluded.trim()}>Add</Button></div>
          <div className="edit-property-tags">{includedItems.map(item => <span key={item}>{item}<button type="button" onClick={() => toggleIncluded(item)} aria-label={`Remove ${item}`}><X/></button></span>)}</div>
        </section>
        <section className="edit-property-card"><h2>HOUSE RULES &amp; POLICIES <span>*</span></h2><p>Specify rules tenants should know (including house rules and policies).</p>
          <div className="edit-property-choice-grid">{RULE_CHOICES.map(rule => <button type="button" key={rule} aria-pressed={form.rules.includes(rule)} className={form.rules.includes(rule) ? "is-selected" : ""} onClick={() => toggleRule(rule)}>{rule}</button>)}</div>
          <label className="edit-property-other-label" htmlFor="edit-other-rule">Other rule (optional)</label><div className="edit-property-add-row"><input id="edit-other-rule" value={newRule} onChange={event => setNewRule(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addRule(); } }} placeholder="Type a rule and press Enter"/><Button type="button" onClick={addRule} disabled={!newRule.trim()}>Add</Button></div>
          <div className="edit-property-tags">{form.rules.map(rule => <span key={rule}>{rule}<button type="button" onClick={() => toggleRule(rule)} aria-label={`Remove ${rule}`}><X/></button></span>)}</div>
        </section>
        <section className="edit-property-card"><h2 id="edit-property-contract-title">Contract Duration <span>*</span></h2><p>Select the rental contract duration required for this apartment.</p><div className="edit-property-choice-grid" role="group" aria-labelledby="edit-property-contract-title">{[...new Set([...CONTRACT_DURATIONS, ...(form.contractDuration ? [form.contractDuration] : [])])].map(duration => <button key={duration} type="button" aria-pressed={form.contractDuration === duration} className={form.contractDuration === duration ? "is-selected" : ""} onClick={() => setField("contractDuration", duration)}>{duration}</button>)}</div></section>
        <section className="edit-property-card"><h2>Address</h2><div className="edit-property-address-fields"><label className="edit-property-address-full">Address <span>*</span><input value={form.address} onChange={event => setField("address", event.target.value)} required/></label><label>City<input value={form.city} onChange={event => setField("city", event.target.value)} required/></label><label>Province<input value={form.state} onChange={event => setField("state", event.target.value)} required/></label><label>ZIP Code<input value={form.zip} onChange={event => setField("zip", event.target.value)} required/></label></div></section>
        <section className="edit-property-card edit-property-map-card"><div className="edit-property-map-heading"><div><h2>Map location</h2><p>Pin the exact location of your apartment.</p></div><Button type="button" variant="outline" onClick={() => setLocationLookup(value => value + 1)} disabled={resolvingLocation}>{resolvingLocation ? "Finding..." : "Find address"}</Button></div><PropertyLocationPicker lat={Number(form.lat)} lng={Number(form.lng)} addressQuery={[form.address, form.city, form.state, form.zip, "Philippines"].filter(Boolean).join(", ")} geocodeRequestKey={locationLookup} onGeocodeStatusChange={status => setResolvingLocation(status === "loading")} onLocationChange={(lat, lng) => setForm(current => ({ ...current, lat, lng }))}/></section>
        <div className="edit-property-coordinate-fields"><label>Latitude<input type="number" step="any" min="-90" max="90" value={form.lat} onChange={event => setField("lat", event.target.value)} required/></label><label>Longitude<input type="number" step="any" min="-180" max="180" value={form.lng} onChange={event => setField("lng", event.target.value)} required/></label></div>
      </fieldset>
      <footer className="edit-property-footer"><Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving || resolvingLocation}>{saving ? "Saving..." : "Save Changes"}</Button></footer>
    </form>
  </main>;
}
