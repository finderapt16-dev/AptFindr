export const DEFAULT_APPLICATION_SETTINGS = Object.freeze({
    application_name: "AptFindr", support_email: "support@aptfindr.com",
    contact_number: "", address: "La Paz, Iloilo City", default_currency: "PHP",
    permit_reminder_days: 30, max_apartment_photos: 10, items_per_page: 10,
});

export function validateApplicationSettings(values) {
    const result = {};
    for (const field of ["application_name", "support_email", "contact_number", "address", "default_currency"])
        result[field] = String(values[field] ?? "").trim();
    if (!result.application_name || result.application_name.length > 80) throw new Error("Application name must contain 1 to 80 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.support_email)) throw new Error("Enter a valid support email.");
    if (result.contact_number && !/^\+?[\d\s().-]{7,25}$/.test(result.contact_number)) throw new Error("Enter a valid contact number.");
    if (result.default_currency !== "PHP") throw new Error("The application currently supports Philippine Peso.");
    for (const [field, min, max] of [["max_apartment_photos", 1, 30], ["items_per_page", 5, 100], ["permit_reminder_days", 7, 90]]) {
        result[field] = Number(values[field]);
        if (!Number.isInteger(result[field]) || result[field] < min || result[field] > max) throw new Error(`${field.replaceAll("_", " ")} must be a whole number between ${min} and ${max}.`);
    }
    if (![7, 14, 30, 60, 90].includes(result.permit_reminder_days)) throw new Error("Choose a valid permit reminder period.");
    return result;
}
