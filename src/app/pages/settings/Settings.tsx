import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronRight,
  Clock,
  HelpCircle,
  Lock,
  Settings as SettingsIcon,
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
  User
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/contexts/AuthContext";
import { deleteUser as deleteUserAccount } from "@/app/services/authService";
import { fetchUserPreferenceSections, saveUserPreferenceSection, updateUserProfile, uploadUserAvatar } from "@/app/services/dashboardSupabaseService";

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

const inputClass = "h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100";
const textareaClass = "min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100";

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-orange-500" : "bg-slate-200"} ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-black uppercase tracking-wide text-slate-500">{label}</label>
    {children}
    {hint && <p className="text-xs font-medium text-slate-400">{hint}</p>}
  </div>
);

const CardTitle = ({ icon: Icon, title, subtitle, tone = "bg-orange-50 text-orange-600" }: { icon: typeof User; title: string; subtitle?: string; tone?: string }) => (
  <div className="mb-5 flex items-center gap-3">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h3 className="font-black text-slate-950">{title}</h3>
      {subtitle && <p className="text-sm font-medium text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

const AlertRow = ({ label, hint, pushVal, onPush }: { label: string; hint?: string; pushVal: boolean; onPush: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-0">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-slate-800">{label}</p>
      {hint && <p className="mt-0.5 text-xs font-medium text-slate-400">{hint}</p>}
    </div>
    <Toggle checked={pushVal} onChange={onPush} />
  </div>
);

export function Settings({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [settingsTab, setSettingsTab] = useState<"profile" | "alerts" | "security">("profile");
  const [settingsMenu, setSettingsMenu] = useState<"personal" | "employment">("personal");

  const [profile, setProfile] = useState<UserSettingsProfile>(() => {
    if (user) {
      const storageKey = `userProfile_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved) as UserSettingsProfile;
        } catch {
          // Fall through to session data.
        }
      }
    }

    return {
      firstName: user?.name?.split(" ")[0] || "",
      lastName: user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
      mobile: user?.mobileNumber || "",
      bio: user?.bio || "",
      language: user?.language || "en",
      timezone: user?.timezone || "Asia/Manila",
      avatar: user?.avatar || "",
      company: user?.company || "",
      workAddress: "",
    };
  });

  const [alerts, setAlerts] = useState<UserAlerts>(() => {
    if (user) {
      const storageKey = `userAlerts_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved) as UserAlerts;
        } catch {
          // Fall through to default app settings.
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

  const [security, setSecurity] = useState(() => {
    if (user) {
      const storageKey = `userSecurity_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { passwordLastChanged: parsed.passwordLastChanged || "" };
        } catch {
          // Fall through to empty state.
        }
      }
    }
    return { passwordLastChanged: "" };
  });

  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    let active = true;
    if (!user?.id) return () => { active = false; };
    void fetchUserPreferenceSections(user.id)
      .then((sections) => {
        if (!active) return;
        if (sections.alerts && typeof sections.alerts === "object" && !Array.isArray(sections.alerts)) {
          setAlerts((current) => ({ ...current, ...sections.alerts as Partial<UserAlerts> }));
        }
        if (sections.security && typeof sections.security === "object" && !Array.isArray(sections.security)) {
          const saved = sections.security as Record<string, unknown>;
          if (typeof saved.passwordLastChanged === "string") setSecurity({ passwordLastChanged: saved.passwordLastChanged });
        }
      })
      .catch((error) => console.error("Unable to load account preferences:", error));
    return () => { active = false; };
  }, [user?.id]);

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const roleLabel = user?.role === "student" ? "Student" : user?.role === "employee" ? "Employee" : user?.role || "Tenant";
  const hasEmploymentInfo = Boolean(profile.company?.trim() || profile.workAddress?.trim());

  const updateProfile = (updater: (prev: UserSettingsProfile) => UserSettingsProfile) => {
    setProfile((p) => {
      const updated = updater(p);
      if (user) localStorage.setItem(`userProfile_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const setA = (key: keyof UserAlerts, val: unknown) => {
    setAlerts((p) => {
      const updated = { ...p, [key]: val };
      if (user) localStorage.setItem(`userAlerts_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const updateSecurity = (updater: (prev: typeof security) => typeof security) => {
    setSecurity((p) => {
      const updated = updater(p);
      if (user) localStorage.setItem(`userSecurity_${user.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!user) return;
    try {
      const avatar = await uploadUserAvatar(user.id, file);
      updateProfile((p) => ({ ...p, avatar }));
      const synced = await updateUserProfile({ id: user.id, email: user.email, name: user.name, avatar_url: avatar });
      if (!synced) throw new Error("Unable to update the profile photo.");
      toast.success("Profile photo uploaded!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload the profile photo.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    updateProfile((p) => ({ ...p, avatar: "" }));
    if (user) {
      try {
        await updateUserProfile({ id: user.id, email: user.email, name: user.name, avatar_url: "" });
      } catch {
        // Profile UI still updates locally.
      }
    }
    toast.success("Profile photo removed.");
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error("Please enter your first and last name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      const name = `${profile.firstName} ${profile.lastName}`.trim();
      await updateUser(user.id, { name, email: profile.email, mobileNumber: profile.mobile });
      await updateUserProfile({
        id: user.id,
        email: profile.email,
        name,
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
      updateSecurity(() => ({ passwordLastChanged }));
      await saveUserPreferenceSection(user.id, "security", { passwordLastChanged });
      setPasswordForm({ current: "", next: "", confirm: "" });
      toast.success("Password updated successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update password.";
      toast.error(message);
    }
  };

  const handleSaveAlerts = async () => {
    if (!user?.id) return;
    try {
      await saveUserPreferenceSection(user.id, "alerts", alerts);
      toast.success("Settings saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save alert preferences.");
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      if (!user) return;
      try {
        await deleteUserAccount(user.id);
        logout();
        toast.success("Account deleted successfully");
        navigate("/");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete the account.");
      }
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <section className="rounded-lg border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-rose-50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="relative h-28 w-28 shrink-0">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-lime-300 to-orange-500 text-3xl font-black text-white shadow-lg">
              {profile.avatar ? <img src={profile.avatar} alt="Profile" className="h-full w-full object-cover" /> : (profile.firstName[0] || user?.name?.[0] || "U").toUpperCase()}
            </div>
            <div className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-orange-500 shadow-lg">
              <Camera className="h-4 w-4" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-slate-950">{fullName || "Not provided"}</h2>
            <Badge className="mt-3 rounded-full bg-orange-50 text-orange-700 ring-1 ring-orange-200">{roleLabel}</Badge>
            <p className="mt-3 text-sm font-medium text-slate-500">{profile.email || "Not provided"}</p>
            {!profile.avatar && <p className="mt-1 text-xs font-semibold text-slate-400">No profile photo uploaded</p>}
          </div>
          <div className="flex flex-col gap-3 lg:w-56">
            <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-4 text-sm font-black text-white shadow-lg transition hover:from-orange-600 hover:to-rose-600">
              <Upload className="h-4 w-4" />
              Upload Photo
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
            </label>
            <button type="button" onClick={handleRemoveAvatar} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
              <Trash2 className="h-4 w-4 text-rose-500" />
              Remove Photo
            </button>
            <p className="text-center text-xs font-medium text-slate-400">JPG, PNG, or WebP up to 2MB</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 px-2 text-sm font-black text-slate-950">Settings Menu</h3>
          <MenuButton icon={User} label="Personal Information" active={settingsMenu === "personal"} onClick={() => setSettingsMenu("personal")} />
          <MenuButton icon={BriefcaseBusiness} label="Employment Information" active={settingsMenu === "employment"} onClick={() => setSettingsMenu("employment")} />
          <div className="mt-8 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <HelpCircle className="mb-3 h-7 w-7 text-orange-500" />
            <p className="font-black text-slate-950">Need help?</p>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">If you need assistance, please visit our Help Center.</p>
            <Button variant="outline" onClick={() => navigate("/dashboard?section=help")} className="mt-4 w-full rounded-lg border-rose-200 font-black text-rose-600 hover:bg-rose-50">
              Go to Help Center
            </Button>
          </div>
        </aside>

        <div className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <CardTitle icon={User} title="Personal Information" subtitle="Update your personal details." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name">
                <input className={inputClass} value={profile.firstName} onChange={(e) => updateProfile((p) => ({ ...p, firstName: e.target.value }))} placeholder="Not provided" />
              </Field>
              <Field label="Last Name">
                <input className={inputClass} value={profile.lastName} onChange={(e) => updateProfile((p) => ({ ...p, lastName: e.target.value }))} placeholder="Not provided" />
              </Field>
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Email Address" hint="Used for account login and notifications">
                <input className={inputClass} type="email" value={profile.email} onChange={(e) => updateProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Not provided" />
              </Field>
              <Field label="Mobile Number" hint="Optional contact number">
                <input className={inputClass} type="tel" value={profile.mobile} onChange={(e) => updateProfile((p) => ({ ...p, mobile: e.target.value }))} placeholder="Not provided" />
              </Field>
              <Field label="Bio / About You" hint="Short description (max 200 characters)">
                <textarea className={textareaClass} value={profile.bio} onChange={(e) => updateProfile((p) => ({ ...p, bio: e.target.value.slice(0, 200) }))} placeholder="Not provided" />
                <p className="text-right text-xs font-medium text-slate-400">{profile.bio.length}/200</p>
              </Field>
            </div>
          </section>

          <DisclosureCard icon={BriefcaseBusiness} title="Employment Information" subtitle={hasEmploymentInfo ? "Your company and work details." : "No employment information added"} tone="bg-violet-50 text-violet-600">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company / Organization">
                <input className={inputClass} value={profile.company || ""} onChange={(e) => updateProfile((p) => ({ ...p, company: e.target.value }))} placeholder="Not provided" />
              </Field>
              <Field label="Work Address">
                <input className={inputClass} value={profile.workAddress || ""} onChange={(e) => updateProfile((p) => ({ ...p, workAddress: e.target.value }))} placeholder="Not provided" />
              </Field>
            </div>
          </DisclosureCard>

          <DisclosureCard icon={SlidersHorizontal} title="Language & Region" subtitle="Language and timezone settings." tone="bg-emerald-50 text-emerald-600">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Language">
                <select className={inputClass} value={profile.language} onChange={(e) => updateProfile((p) => ({ ...p, language: e.target.value }))}>
                  <option value="en">English</option>
                  <option value="fil">Filipino</option>
                  <option value="hil">Hiligaynon</option>
                </select>
              </Field>
              <Field label="Timezone">
                <select className={inputClass} value={profile.timezone} onChange={(e) => updateProfile((p) => ({ ...p, timezone: e.target.value }))}>
                  <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                </select>
              </Field>
            </div>
          </DisclosureCard>
        </div>
      </div>

      <SaveBar onSave={handleUpdateProfile} />
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <CardTitle icon={Bell} title="Apartment Alerts" subtitle="Get notified about new listings and updates." />
        <AlertRow label="New Listings" hint="Notify when new apartments match your preferences" pushVal={alerts.newListings} onPush={(v) => setA("newListings", v)} />
        <AlertRow label="Price Drops" hint="Alert when saved apartments reduce their price" pushVal={alerts.priceDrop} onPush={(v) => setA("priceDrop", v)} />
        <AlertRow label="Favorite Available" hint="Notify when favorited apartments become available" pushVal={alerts.favoriteAvailable} onPush={(v) => setA("favoriteAvailable", v)} />
        <AlertRow label="Personalized Recommendations" hint="Get apartment suggestions based on your activity" pushVal={alerts.recommendations} onPush={(v) => setA("recommendations", v)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <CardTitle icon={Clock} title="Delivery Preferences" subtitle="Digest schedule and quiet hours." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Activity Digest">
            <select className={inputClass} value={alerts.digest} onChange={(e) => setA("digest", e.target.value)}>
              <option value="realtime">Real-time</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-bold text-slate-800">Quiet Hours</p>
              <p className="text-xs font-medium text-slate-500">Pause notifications during rest hours</p>
            </div>
            <Toggle checked={alerts.quietEnabled} onChange={(v) => setA("quietEnabled", v)} />
          </div>
        </div>
        {alerts.quietEnabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Quiet From">
              <input className={inputClass} type="time" value={alerts.quietStart} onChange={(e) => setA("quietStart", e.target.value)} />
            </Field>
            <Field label="Quiet Until">
              <input className={inputClass} type="time" value={alerts.quietEnd} onChange={(e) => setA("quietEnd", e.target.value)} />
            </Field>
          </div>
        )}
      </section>

      <SaveBar onSave={() => void handleSaveAlerts()} />
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <CardTitle icon={Lock} title="Password" subtitle={security.passwordLastChanged ? `Last changed: ${new Date(security.passwordLastChanged).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}` : "Password change date not provided."} tone="bg-blue-50 text-blue-600" />
        <div className="space-y-4">
          <Field label="Current Password">
            <input className={inputClass} type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))} placeholder="Current password" />
          </Field>
          <Field label="New Password" hint="At least 6 characters">
            <input className={inputClass} type="password" value={passwordForm.next} onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))} placeholder="New password" />
          </Field>
          <Field label="Confirm New Password">
            <input className={inputClass} type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
          </Field>
          <Button onClick={handlePasswordChange} className="rounded-lg bg-orange-500 font-black text-white hover:bg-orange-600">Update Password</Button>
        </div>
      </section>

      <section className="rounded-lg border border-red-100 bg-red-50 p-6 shadow-sm">
        <CardTitle icon={Trash2} title="Danger Zone" subtitle="Irreversible account actions." tone="bg-white text-red-600" />
        <p className="text-sm font-medium text-slate-600">Once you delete your account, there is no going back. Please be certain.</p>
        <Button variant="destructive" onClick={handleDeleteAccount} className="mt-4 rounded-lg font-black">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete My Account
        </Button>
      </section>
    </div>
  );

  return (
    <div className={embedded ? "pb-6" : "min-h-screen bg-[#f8fafc] pb-12"}>
      <div className={embedded ? "" : "mx-auto max-w-7xl px-4 py-8"}>
        {!embedded && (
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}

        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 shadow-sm">
                <SettingsIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-950">Settings</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">Manage your account, preferences, and security settings.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm">
                <Bell className="h-5 w-5" />
              </button>
              <button onClick={() => navigate("/dashboard?section=help")} className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </header>

          <nav className="grid rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:grid-cols-3">
            <TabButton icon={User} label="Profile" active={settingsTab === "profile"} onClick={() => setSettingsTab("profile")} />
            <TabButton icon={Bell} label="Alerts" active={settingsTab === "alerts"} onClick={() => setSettingsTab("alerts")} />
            <TabButton icon={Shield} label="Security" active={settingsTab === "security"} onClick={() => setSettingsTab("security")} />
          </nav>

          {settingsTab === "profile" && renderProfileTab()}
          {settingsTab === "alerts" && renderAlertsTab()}
          {settingsTab === "security" && renderSecurityTab()}
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon: Icon, label, active, onClick }: { icon: typeof User; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex h-14 items-center justify-center gap-2 rounded-md text-sm font-black transition ${active ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function MenuButton({ icon: Icon, label, active, onClick }: { icon: typeof User; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`mb-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold transition ${active ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function DisclosureCard({ icon: Icon, title, subtitle, tone, children }: { icon: typeof User; title: string; subtitle: string; tone: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-slate-950">{title}</h3>
          <p className="text-sm font-medium text-slate-500">{subtitle}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </div>
      {children}
    </section>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-orange-100 bg-orange-50 p-5 shadow-sm sm:flex-row sm:items-center">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
        <Shield className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-black text-slate-950">Your changes are saved securely.</p>
        <p className="text-sm font-medium text-slate-500">Make sure to save your changes before leaving.</p>
      </div>
      <Button onClick={onSave} className="rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-8 font-black text-white hover:from-orange-600 hover:to-rose-600">
        <Check className="mr-2 h-4 w-4" />
        Save Changes
      </Button>
    </section>
  );
}
