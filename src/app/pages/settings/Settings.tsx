import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { updateUserProfile } from "@/app/services/dashboardSupabaseService";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, User, Bell, Shield, Search as SearchIcon, Trash2, Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";

// ── UI Components ────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      checked ? "bg-amber-500" : "bg-slate-200"
    } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-slate-400 font-medium">{hint}</p>}
  </div>
);

const SettingsInput = (props: any) => (
  <input
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
  />
);

const SettingsSelect = ({ children, ...props }: any) => (
  <select
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
  >
    {children}
  </select>
);

const SettingsTextarea = (props: any) => (
  <textarea
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-sm font-semibold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all resize-none"
  />
);

const SectionTitle = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-base shadow-md shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="text-base font-black text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
    </div>
  </div>
);

const AlertRow = ({ label, hint, pushVal, onPush }: { label: string; hint?: string; pushVal: boolean; onPush: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-800">{label}</p>
      {hint && <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>}
    </div>
    <Toggle checked={pushVal} onChange={onPush} />
  </div>
);

export function Settings({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [settingsTab, setSettingsTab] = useState("profile");

  // ── Profile state ────────────────────────────────────────────────────────
  type UserSettingsProfile = {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    bio: string;
    language: string;
    timezone: string;
    avatar: string;
    company?: string;
    workAddress?: string;
    permitNumber?: string;
  };

  const [profile, setProfile] = useState<UserSettingsProfile>(() => {
    if (user) {
      const storageKey = `userProfile_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved) as UserSettingsProfile;
        } catch {
          // Fall through to default
        }
      }
    }
    
    // Initialize from user object with role-specific fields
    const profileObj: UserSettingsProfile = {
      firstName: user?.name?.split(" ")[0] || "",
      lastName: user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
      mobile: user?.mobileNumber || "",
      bio: user?.bio || `${user?.role === "student" ? "Student" : "Employee"} looking for quality apartments in Iloilo City.`,
      language: user?.language || "en",
      timezone: user?.timezone || "Asia/Manila",
      avatar: user?.avatar || "",
    };
    
    // Add role-specific fields
    if (user?.role === "employee") {
      profileObj.company = user?.company || "";
      profileObj.workAddress = "";
    }
    
    return profileObj;
  });

  // ── Alerts state ─────────────────────────────────────────────────────────
  type UserAlerts = {
    newListings: boolean;
    priceDrop: boolean;
    favoriteAvailable: boolean;
    recommendations: boolean;
    systemPush: boolean;
    digest: string;
    quietStart: string;
    quietEnd: string;
    quietEnabled: boolean;
  };

  const [alerts, setAlerts] = useState<UserAlerts>(() => {
    if (user) {
      const storageKey = `userAlerts_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved) as UserAlerts;
        } catch {
          // Fall through to default
        }
      }
    }
    return {
      newListings: true,
      priceDrop: true,
      favoriteAvailable: true,
      recommendations: true,
      systemPush: false,
      digest: "daily",
      quietStart: "22:00",
      quietEnd: "07:00",
      quietEnabled: true,
    };
  });

  // ── Preferences state ────────────────────────────────────────────────────
  type UserPreferences = {
    preferredArea: string;
    maxBudget: string;
    minBedrooms: string;
    petFriendly: boolean;
    parking: boolean;
    furnished: boolean;
    sortBy: string;
  };

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (user) {
      const storageKey = `userPreferences_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved) as UserPreferences;
        } catch {
          // Fall through to default
        }
      }
    }
    return {
      preferredArea: "La Paz",
      maxBudget: user?.role === "student" ? "4000" : "7000",
      minBedrooms: "1",
      petFriendly: false,
      parking: false,
      furnished: false,
      sortBy: "price_low",
    };
  });

  // ── Security state ───────────────────────────────────────────────────────
  const [security, setSecurity] = useState(() => {
    if (user) {
      const storageKey = `userSecurity_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            passwordLastChanged: parsed.passwordLastChanged || "2024-11-14",
          };
        } catch {
          // Fall through to default
        }
      }
    }
    return {
      passwordLastChanged: "2024-11-14",
    };
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  // ── Update functions ─────────────────────────────────────────────────────
  const updateProfile = (updater: (prev: typeof profile) => typeof profile) => {
    setProfile((p) => {
      const updated = updater(p);
      if (user) {
        const storageKey = `userProfile_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const setA = (key: string, val: unknown) => {
    setAlerts((p) => {
      const updated = { ...p, [key]: val };
      if (user) {
        const storageKey = `userAlerts_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const setP = (key: string, val: unknown) => {
    setPreferences((p) => {
      const updated = { ...p, [key]: val };
      if (user) {
        const storageKey = `userPreferences_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const updateSecurity = (updater: (prev: any) => any) => {
    setSecurity((p) => {
      const updated = updater(p);
      if (user) {
        const storageKey = `userSecurity_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAvatarUpload = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile photo must be 2MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const avatar = reader.result as string;
      updateProfile((p) => ({ ...p, avatar }));
      if (user) {
        void updateUserProfile({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: avatar,
        }).then(() => toast.success("Profile photo uploaded!"))
          .catch(() => toast.success("Photo saved locally; sync to cloud failed."));
      } else {
        toast.success("Profile photo uploaded!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    updateProfile((p) => ({ ...p, avatar: "" }));
    if (user) {
      try {
        await updateUserProfile({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: "",
        });
      } catch {
        // Profile UI still updates locally
      }
    }
    toast.success("Profile photo removed.");
  };

  const handleUpdateProfile = async () => {
    if (user) {
      if (!profile.firstName.trim() || !profile.lastName.trim()) {
        toast.error("Please enter your first and last name.");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
        toast.error("Please enter a valid email address.");
        return;
      }

      try {
        await updateUser(user.id, {
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          email: profile.email,
        });

        await updateUserProfile({
          id: user.id,
          email: profile.email,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          role: user.role,
          mobile: profile.mobile,
          avatar_url: profile.avatar,
          bio: profile.bio,
          language: profile.language,
          timezone: profile.timezone,
          permit_number: user.role === "landlord" ? profile.permitNumber : undefined,
          company: profile.company,
          work_address: profile.workAddress,
        });

        toast.success("Profile updated successfully!");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update profile.";
        toast.error(message);
      }
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    if (passwordForm.next.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      await updateUser(user.id, { password: passwordForm.next });
      const passwordLastChanged = new Date().toISOString();
      updateSecurity((p) => ({ ...p, passwordLastChanged }));
      setPasswordForm({ current: "", next: "", confirm: "" });
      toast.success("Password updated successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update password.";
      toast.error(message);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      if (user) {
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        localStorage.setItem("users", JSON.stringify(users.filter((u: any) => u.id !== user.id)));

        const passwords = JSON.parse(localStorage.getItem("passwords") || "{}");
        delete passwords[user.email];
        localStorage.setItem("passwords", JSON.stringify(passwords));

        localStorage.removeItem(`userProfile_${user.id}`);
        localStorage.removeItem(`userAlerts_${user.id}`);
        localStorage.removeItem(`userPreferences_${user.id}`);
        localStorage.removeItem(`userSecurity_${user.id}`);
      }

      logout();
      toast.success("Account deleted successfully");
      navigate("/");
    }
  };

  // ── Profile Tab ──────────────────────────────────────────────────────────
  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-100 rounded-2xl">
        <div className="relative h-20 w-20 shrink-0">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-black shadow-lg overflow-hidden">
            {profile.avatar ? (
              <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              profile.firstName[0] || user?.name?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-white border border-amber-100 shadow-md flex items-center justify-center">
            <Camera className="h-4 w-4 text-amber-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900">{profile.firstName} {profile.lastName}</p>
          <p className="text-sm text-slate-500 font-medium mb-3">{profile.email}</p>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white capitalize">{user?.role}</Badge>
        </div>
        <div className="flex flex-col sm:items-end gap-2">
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black cursor-pointer transition-colors">
            <Upload className="h-4 w-4" />
            Upload Photo
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
          </label>
          {profile.avatar && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-100 text-red-600 hover:bg-red-50 text-xs font-black transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Remove Photo
            </button>
          )}
          <p className="text-[11px] text-slate-400 font-medium">JPG, PNG, or WebP up to 2MB</p>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
        <SectionTitle icon="👤" title="Personal Information" subtitle="Your profile details" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name">
            <SettingsInput value={profile.firstName} onChange={(e: any) => updateProfile(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
          </Field>
          <Field label="Last Name">
            <SettingsInput value={profile.lastName} onChange={(e: any) => updateProfile(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
          </Field>
        </div>
        <Field label="Email Address" hint="Used for account login and notifications">
          <SettingsInput type="email" value={profile.email} onChange={(e: any) => updateProfile(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" />
        </Field>
        <Field label="Mobile Number" hint="Optional contact number">
          <SettingsInput type="tel" value={profile.mobile} onChange={(e: any) => updateProfile(p => ({ ...p, mobile: e.target.value }))} placeholder="09XXXXXXXXX" />
        </Field>
        <Field label="Bio / About You" hint="Short description (max 200 characters)">
          <SettingsTextarea rows={3} value={profile.bio} onChange={(e: any) => updateProfile(p => ({ ...p, bio: e.target.value.slice(0, 200) }))} placeholder="Tell us about yourself…" />
          <p className="text-[11px] text-slate-400 font-medium text-right">{profile.bio.length}/200</p>
        </Field>
      </div>

      {/* Employee-specific fields */}
      {user?.role === "employee" && (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
          <SectionTitle icon="💼" title="Employment Information" subtitle="Your company and work address" />
          <Field label="Company / Organization" hint="Your current employer">
            <SettingsInput value={profile.company || ""} onChange={(e: any) => updateProfile(p => ({ ...p, company: e.target.value }))} placeholder="e.g. Accenture, PLDT, BPO Company" />
          </Field>
          <Field label="Work Address" hint="Your company address">
            <SettingsInput value={profile.workAddress || ""} onChange={(e: any) => updateProfile(p => ({ ...p, workAddress: e.target.value }))} placeholder="Complete work address" />
          </Field>
        </div>
      )}

      {/* Preferences */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
        <SectionTitle icon="⚙️" title="Preferences" subtitle="Language and timezone settings" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Language">
            <SettingsSelect value={profile.language} onChange={(e: any) => updateProfile(p => ({ ...p, language: e.target.value }))}>
              <option value="en">English</option>
              <option value="fil">Filipino</option>
              <option value="hil">Hiligaynon</option>
            </SettingsSelect>
          </Field>
          <Field label="Timezone">
            <SettingsSelect value={profile.timezone} onChange={(e: any) => updateProfile(p => ({ ...p, timezone: e.target.value }))}>
              <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
            </SettingsSelect>
          </Field>
        </div>
      </div>

      <Button onClick={handleUpdateProfile} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200">
        Save Profile Changes
      </Button>
    </div>
  );

  // ── Alerts Tab ───────────────────────────────────────────────────────────
  const renderAlertsTab = () => (
    <div className="space-y-5">
      {/* New Listings */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
        <SectionTitle icon="🏠" title="Apartment Alerts" subtitle="Get notified about new listings and updates" />
        <AlertRow label="New Listings" hint="Notify when new apartments match your preferences" pushVal={alerts.newListings} onPush={(v) => setA("newListings", v)} />
        <AlertRow label="Price Drops" hint="Alert when saved apartments reduce their price" pushVal={alerts.priceDrop} onPush={(v) => setA("priceDrop", v)} />
        <AlertRow label="Favorite Available" hint="Notify when favorited apartments become available" pushVal={alerts.favoriteAvailable} onPush={(v) => setA("favoriteAvailable", v)} />
        <AlertRow label="Personalized Recommendations" hint="Get apartment suggestions based on your activity" pushVal={alerts.recommendations} onPush={(v) => setA("recommendations", v)} />
      </div>

      {/* System */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5">
        <SectionTitle icon="🛠️" title="System & Platform" subtitle="Account and platform announcements" />
        <AlertRow label="Platform Announcements" hint="New features, updates, and maintenance notices" pushVal={alerts.systemPush} onPush={(v) => setA("systemPush", v)} />
      </div>

      {/* Digest & Quiet Hours */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
        <SectionTitle icon="🕐" title="Delivery Preferences" subtitle="Digest schedule and quiet hours" />
        <Field label="Activity Digest" hint="Receive a summary instead of individual notifications">
          <SettingsSelect value={alerts.digest} onChange={(e: any) => setA("digest", e.target.value)}>
            <option value="realtime">Real-time (no digest)</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly digest</option>
          </SettingsSelect>
        </Field>
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <div>
            <p className="text-sm font-bold text-slate-800">Quiet Hours</p>
            <p className="text-xs text-slate-500 font-medium">Pause push notifications during rest hours</p>
          </div>
          <Toggle checked={alerts.quietEnabled} onChange={(v) => setA("quietEnabled", v)} />
        </div>
        {alerts.quietEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quiet From">
              <SettingsInput type="time" value={alerts.quietStart} onChange={(e: any) => setA("quietStart", e.target.value)} />
            </Field>
            <Field label="Quiet Until">
              <SettingsInput type="time" value={alerts.quietEnd} onChange={(e: any) => setA("quietEnd", e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      <Button onClick={() => toast.success("Alert preferences saved!")} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200">
        Save Alert Preferences
      </Button>
    </div>
  );

  // ── Preferences Tab ──────────────────────────────────────────────────────
  const renderPreferencesTab = () => (
    <div className="space-y-5">
      {/* Search Preferences */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
        <SectionTitle icon="🔍" title="Search Preferences" subtitle="Default search criteria for faster browsing" />
        <Field label="Preferred Area" hint="Your preferred location in Iloilo City">
          <SettingsInput value={preferences.preferredArea} onChange={(e: any) => setP("preferredArea", e.target.value)} placeholder="e.g. La Paz, Jaro" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Max Budget (₱/month)">
            <SettingsInput type="number" min="1000" value={preferences.maxBudget} onChange={(e: any) => setP("maxBudget", e.target.value)} placeholder="5000" />
          </Field>
          <Field label="Min Bedrooms">
            <SettingsSelect value={preferences.minBedrooms} onChange={(e: any) => setP("minBedrooms", e.target.value)}>
              <option value="1">1 bedroom</option>
              <option value="2">2 bedrooms</option>
              <option value="3">3 bedrooms</option>
              <option value="4">4+ bedrooms</option>
            </SettingsSelect>
          </Field>
        </div>
      </div>

      {/* Amenity Preferences */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
        <SectionTitle icon="✨" title="Amenity Preferences" subtitle="Filter apartments by your required amenities" />
        <div className="space-y-3">
          {[
            { key: "petFriendly", label: "Pet-Friendly", hint: "Show only pet-friendly apartments" },
            { key: "parking", label: "Parking Available", hint: "Must have parking space" },
            { key: "furnished", label: "Fully Furnished", hint: "Only show furnished units" },
          ].map(({ key, label, hint }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">{label}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{hint}</p>
              </div>
              <Toggle checked={(preferences as any)[key]} onChange={(v) => setP(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Sort Preferences */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
        <SectionTitle icon="📊" title="Display Preferences" subtitle="How to sort and display search results" />
        <Field label="Default Sort Order">
          <SettingsSelect value={preferences.sortBy} onChange={(e: any) => setP("sortBy", e.target.value)}>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
          </SettingsSelect>
        </Field>
      </div>

      <Button onClick={() => toast.success("Search preferences saved!")} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200">
        Save Preferences
      </Button>
    </div>
  );

  // ── Security Tab ─────────────────────────────────────────────────────────
  const renderSecurityTab = () => (
    <div className="space-y-5">
      {/* Password */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 space-y-4">
        <SectionTitle
          icon="🔑"
          title="Password"
          subtitle={`Last changed: ${new Date(security.passwordLastChanged).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`}
        />
        <Field label="Current Password">
          <SettingsInput
            type="password"
            value={passwordForm.current}
            onChange={(e: any) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
            placeholder="Enter current password"
          />
        </Field>
        <Field label="New Password" hint="At least 6 characters">
          <SettingsInput
            type="password"
            value={passwordForm.next}
            onChange={(e: any) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
            placeholder="New password"
          />
        </Field>
        <Field label="Confirm New Password">
          <SettingsInput
            type="password"
            value={passwordForm.confirm}
            onChange={(e: any) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
            placeholder="Repeat new password"
          />
        </Field>
        <button
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-xl transition-colors"
          onClick={handlePasswordChange}
        >
          Update Password
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-5 space-y-4">
        <SectionTitle icon="⚠️" title="Danger Zone" subtitle="Irreversible account actions" />
        <p className="text-xs text-slate-600 font-medium">Once you delete your account, there is no going back. Please be certain.</p>
        <Button variant="destructive" className="w-full rounded-xl font-bold" onClick={handleDeleteAccount}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete My Account
        </Button>
      </div>
    </div>
  );

  return (
    <div className={embedded ? "pb-6" : "min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 pb-12"}>
      <div className={embedded ? "" : "container mx-auto px-4 py-8"}>
        {!embedded && (
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-slate-600 hover:text-amber-600 hover:bg-amber-50 font-bold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="inline-block mb-3 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full shadow-sm">
              <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
                ⚙️ Account Management
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">Settings</h1>
            <p className="text-slate-600 mt-2 font-medium">Manage your profile, preferences, and security</p>
          </div>

          <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white/80 border border-amber-100 rounded-2xl p-1 shadow-sm">
              <TabsTrigger value="profile" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
                <User className="h-3.5 w-3.5 mr-1.5" /> Profile
              </TabsTrigger>
              <TabsTrigger value="alerts" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
                <Bell className="h-3.5 w-3.5 mr-1.5" /> Alerts
              </TabsTrigger>
              <TabsTrigger value="preferences" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
                <SearchIcon className="h-3.5 w-3.5 mr-1.5" /> Search
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
                <Shield className="h-3.5 w-3.5 mr-1.5" /> Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">{renderProfileTab()}</TabsContent>
            <TabsContent value="alerts">{renderAlertsTab()}</TabsContent>
            <TabsContent value="preferences">{renderPreferencesTab()}</TabsContent>
            <TabsContent value="security">{renderSecurityTab()}</TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
