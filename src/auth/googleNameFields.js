export function getGoogleNameFields(authUser) {
  const googleIdentity = authUser?.identities?.find(identity => identity.provider === "google")?.identity_data ?? {};
  const metadata = { ...googleIdentity, ...(authUser?.user_metadata ?? {}) };
  const text = value => typeof value === "string" ? value.trim() : "";
  const parts = (text(metadata.full_name) || text(metadata.name)).split(/\s+/).filter(Boolean);
  return {
    firstName: text(metadata.given_name) || parts[0] || "",
    lastName: text(metadata.family_name) || parts.slice(1).join(" "),
  };
}
