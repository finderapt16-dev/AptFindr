import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const EMPTY_UNIT_FORM = { name: "", bedrooms: "", price: "", capacity: "", area: "", status: "available" };

export function AddUnitDialog({ apartmentId, apartmentName, open, onClose, onSave }) {
    const draftKey = useMemo(() => apartmentId ? `aptfindr:add-unit-draft:${apartmentId}` : null, [apartmentId]);
    const [form, setForm] = useState(() => {
        if (!draftKey)
            return { ...EMPTY_UNIT_FORM };
        try {
            const saved = window.sessionStorage.getItem(draftKey);
            return saved ? { ...EMPTY_UNIT_FORM, ...JSON.parse(saved) } : { ...EMPTY_UNIT_FORM };
        }
        catch {
            return { ...EMPTY_UNIT_FORM };
        }
    });
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!draftKey || !open)
            return;
        try {
            window.sessionStorage.setItem(draftKey, JSON.stringify(form));
        }
        catch {
            // Draft saving is a convenience only; the form remains usable if storage is unavailable.
        }
    }, [draftKey, form, open]);
    const discardDraft = () => {
        if (draftKey)
            window.sessionStorage.removeItem(draftKey);
        setForm({ ...EMPTY_UNIT_FORM });
    };
    const field = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
    const submit = async event => {
        event.preventDefault();
        if (saving) return;
        if (!Number.isInteger(Number(form.area)) || Number(form.area) < 0) {
            toast.error("Floor area must be a whole number of square meters.");
            return;
        }
        if (!form.name.trim() || !Number.isInteger(Number(form.bedrooms)) || Number(form.bedrooms) < 0 || Number(form.price) < 0 || Number(form.capacity) < 1 || Number(form.area) < 0) {
            toast.error("Please enter valid unit details.");
            return;
        }
        setSaving(true);
        try {
            await onSave({ name: form.name.trim(), bedrooms: Number(form.bedrooms), price: Number(form.price), maxOccupants: Number(form.capacity), sqft: Math.round(Number(form.area) / 0.09290304), status: form.status });
            discardDraft();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to add the unit.");
        } finally { setSaving(false); }
    };
    const cancel = () => {
        discardDraft();
        onClose();
    };
    return <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="add-unit-dialog"
        overlayClassName="add-unit-overlay"
        showCloseButton={false}
        aria-describedby={undefined}
        onPointerDownOutside={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
        onEscapeKeyDown={event => event.preventDefault()}
      >
        <DialogTitle>Add New Unit for {apartmentName || "Apartment"}</DialogTitle>
        <form onSubmit={submit}>
          <fieldset disabled={saving} className="add-unit-fields">
            <label>Unit Number<input autoFocus value={form.name} onChange={field("name")} placeholder="e.g., Room 103" required/></label>
            <label>Bedroom<input type="number" min="0" step="1" value={form.bedrooms} onChange={field("bedrooms")} placeholder="e.g., 3" required/></label>
            <label>Monthly Rent (₱)<input type="number" min="0" step="0.01" value={form.price} onChange={field("price")} placeholder="e.g., 16,000" required/></label>
            <label>Capacity<select value={form.capacity} onChange={field("capacity")} required><option value="" disabled>Select capacity</option>{Array.from({ length: 30 }, (_, index) => index + 1).map(value => <option value={value} key={value}>{value} pax</option>)}</select></label>
            <label>Floor Area (sqm)<input type="number" min="0" step="1" value={form.area} onChange={field("area")} placeholder="e.g., 60 sqm" required/></label>
            <label className="add-unit-status">Status<select value={form.status} onChange={field("status")}><option value="available">Available</option><option value="occupied">Occupied</option><option value="maintenance">Under Maintenance</option></select></label>
          </fieldset>
          <footer><button type="button" onClick={cancel} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Unit"}</button></footer>
        </form>
      </DialogContent>
    </Dialog>;
}
