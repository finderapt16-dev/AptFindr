import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export function AddUnitDialog({ apartmentName, open, onClose, onSave }) {
    const [form, setForm] = useState({ name: "", bedrooms: "", price: "", capacity: "", area: "", status: "available" });
    const [saving, setSaving] = useState(false);
    const field = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
    const submit = async event => {
        event.preventDefault();
        if (saving) return;
        if (!form.name.trim() || !Number.isInteger(Number(form.bedrooms)) || Number(form.bedrooms) < 0 || Number(form.price) < 0 || Number(form.capacity) < 1 || Number(form.area) < 0) {
            toast.error("Please enter valid unit details.");
            return;
        }
        setSaving(true);
        try {
            await onSave({ name: form.name.trim(), bedrooms: Number(form.bedrooms), price: Number(form.price), maxOccupants: Number(form.capacity), sqft: Number(form.area) / 0.09290304, status: form.status });
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to add the unit.");
        } finally { setSaving(false); }
    };
    return <Dialog open={open} onOpenChange={value => { if (!value && !saving) onClose(); }}>
      <DialogContent className="add-unit-dialog" overlayClassName="add-unit-overlay" showCloseButton={false} aria-describedby={undefined}>
        <DialogTitle>Add New Unit for {apartmentName || "Apartment"}</DialogTitle>
        <form onSubmit={submit}>
          <fieldset disabled={saving} className="add-unit-fields">
            <label>Unit Number<input autoFocus value={form.name} onChange={field("name")} placeholder="Room 103" required/></label>
            <label>Bedroom<input type="number" min="0" step="1" value={form.bedrooms} onChange={field("bedrooms")} placeholder="3" required/></label>
            <label>Monthly Rent (₱)<input type="number" min="0" step="0.01" value={form.price} onChange={field("price")} placeholder="16,000" required/></label>
            <label>Capacity<select value={form.capacity} onChange={field("capacity")} required><option value="" disabled>Select capacity</option>{Array.from({ length: 30 }, (_, index) => index + 1).map(value => <option value={value} key={value}>{value} pax</option>)}</select></label>
            <label>Floor Area (sqm)<input type="number" min="0" step="0.01" value={form.area} onChange={field("area")} placeholder="60 sqm" required/></label>
            <label className="add-unit-status">Status<select value={form.status} onChange={field("status")}><option value="available">Available</option><option value="occupied">Occupied</option><option value="maintenance">Under Maintenance</option></select></label>
          </fieldset>
          <footer><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Unit"}</button></footer>
        </form>
      </DialogContent>
    </Dialog>;
}
