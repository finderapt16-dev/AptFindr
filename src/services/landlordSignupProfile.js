// Seed the optional signup business name after authenticated profile creation.
// Never overwrite a business name subsequently edited in landlord Settings.
export async function seedLandlordSignupBusinessName(client, userId, businessName) {
  const name = typeof businessName === "string" ? businessName.trim() : "";
  if (!name) return;
  const { data: profile, error: readError } = await client.from("landlord_profiles")
    .select("business_name").eq("user_id", userId).maybeSingle();
  if (readError) throw new Error(`Unable to load business profile: ${readError.message}`);
  if (!profile || String(profile.business_name ?? "").trim()) return;
  let update = client.from("landlord_profiles").update({ business_name: name }).eq("user_id", userId);
  // An optimistic guard protects simultaneous Settings updates / auth hydration.
  update = profile.business_name == null
    ? update.is("business_name", null)
    : update.eq("business_name", profile.business_name);
  const { error } = await update;
  if (error) throw new Error(`Unable to save business name: ${error.message}`);
}
