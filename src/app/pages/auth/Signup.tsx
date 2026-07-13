import { AppLogo } from "@/app/components/common/AppLogo";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { useAuth, UserRole } from "@/app/contexts/AuthContext";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Briefcase, Building2,
  Check,
  CheckCircle2,
  ChevronDown, ChevronRight,
  ClipboardList,
  Eye, EyeOff,
  GraduationCap,
  Key,
  Lock, Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  User,
  Users
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/* ─── Floating label input ─────────────────────────────────── */
function FloatInput({
  id, label, type = "text", value, onChange, required, icon, suffix, placeholder = " ",
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
  icon?: React.ReactNode; suffix?: React.ReactNode; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <div className={`relative flex items-center border-2 rounded-xl transition-all duration-200 bg-white ${
        focused ? "border-amber-400 shadow-sm shadow-amber-100" : "border-slate-200 hover:border-slate-300"
      }`}>
        {icon && (
          <span className={`absolute left-3.5 transition-colors duration-200 ${focused ? "text-amber-500" : "text-slate-400"}`}>
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-transparent text-slate-800 text-sm font-medium outline-none pt-5 pb-2 ${icon ? "pl-10" : "pl-4"} ${suffix ? "pr-10" : "pr-4"} placeholder:text-transparent`}
        />
        <label
          htmlFor={id}
          className={`absolute pointer-events-none transition-all duration-200 font-medium ${icon ? "left-10" : "left-4"} ${
            lifted
              ? "top-2 text-[10px] tracking-wide uppercase"
              : "top-1/2 -translate-y-1/2 text-sm"
          } ${focused ? "text-amber-500" : "text-slate-400"}`}
        >
          {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
        {suffix && <div className="absolute right-3.5">{suffix}</div>}
      </div>
    </div>
  );
}

/* ─── Password strength ────────────────────────────────────── */
function getStrength(p: string) {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
const strengthColor = ["", "bg-rose-400", "bg-orange-400", "bg-amber-400", "bg-lime-500", "bg-emerald-500"];
const strengthText  = ["", "text-rose-500", "text-orange-500", "text-amber-600", "text-lime-600", "text-emerald-600"];

/* ─── Accordion section ────────────────────────────────────── */
function AccordionSection({
  title, icon, open, onToggle, done, children,
}: {
  title: string; icon: React.ReactNode;
  open: boolean; onToggle: () => void; done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
      open ? "border-amber-300 shadow-md shadow-amber-50" : done ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"
    }`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
          open ? "bg-amber-50/60" : "bg-white hover:bg-slate-50"
        }`}
      >
        <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
          open ? "bg-amber-500 text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
        }`}>
          {done && !open ? <Check className="h-4 w-4" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${open ? "text-amber-700" : done ? "text-emerald-700" : "text-slate-700"}`}>{title}</p>
          {done && !open && <p className="text-xs text-emerald-600 font-medium">Completed</p>}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className={`h-4 w-4 ${open ? "text-amber-500" : "text-slate-400"}`} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-5 pb-5 pt-1 space-y-4 bg-white">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();
  const requestedRedirect = new URLSearchParams(location.search).get("redirect");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : null;
  const loginPath = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [openSection, setOpenSection] = useState<string>("personal");
  const permitRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", middleInitial: "",
    email: "", mobileNumber: "", address: "",
    password: "", confirmPassword: "",
    role: "" as UserRole | "",
    school: "", guardian: "", guardianAddress: "", guardianContact: "",
    company: "", workAddress: "", permitNumber: "",
  });

  const set = (key: string, value: string) =>
    setFormData((p) => ({ ...p, [key]: value }));

  const strength = getStrength(formData.password);

  /* ── Section completion checks ─────────────────────────── */
  const donePersonal =
    !!formData.firstName && !!formData.lastName && !!formData.address;
  const doneContact = !!formData.email && !!formData.mobileNumber;
  const doneRole = (() => {
    if (!formData.role) return false;
    if (formData.role === "student")
      return !!formData.school && !!formData.guardian && !!formData.guardianContact;
    if (formData.role === "employee")
      return !!formData.company && !!formData.workAddress;
    if (formData.role === "landlord") return !!formData.permitNumber;
    return false;
  })();
  const doneSecurity =
    !!formData.password &&
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword;

  /* ── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.role) { setError("Please select a role."); return; }
    if (!formData.firstName || !formData.lastName) { setError("Full name is required."); return; }
    if (!formData.address) { setError("Home address is required."); return; }
    if (!formData.mobileNumber) { setError("Mobile number is required."); return; }
    if (!formData.email) { setError("Email is required."); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    const fullName = `${formData.firstName} ${formData.middleInitial ? formData.middleInitial + ". " : ""}${formData.lastName}`.trim();
    try {
      const result = await signup({
        name: fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role as UserRole,
        middleInitial: formData.middleInitial,
        address: formData.address,
        mobileNumber: formData.mobileNumber,
        school: formData.school,
        guardianName: formData.guardian,
        guardianAddress: formData.guardianAddress,
        guardianContact: formData.guardianContact,
        company: formData.company,
        workAddress: formData.workAddress,
        permitNumber: formData.permitNumber,
        permitDocument: permitFile ?? undefined,
        idDocument: idFile ?? undefined,
      });
      if (result.success) {
        navigate(loginPath, { state: { message: "Account created successfully! Please login." } });
      } else {
        setError(result.error || "Signup failed");
      }
    } catch {
      setError("Signup failed. Check your connection and Supabase setup.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => setOpenSection((o) => o === id ? "" : id);

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">

      {/* ── LEFT PANEL ────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[420px] xl:w-[480px] flex-shrink-0 relative overflow-hidden min-h-screen">
        {/* Full-height apartment photo */}
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=960"
            alt="Modern apartment in La Paz"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/90" />
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/30 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group mb-auto">
            <AppLogo className="h-10 w-10 rounded-xl group-hover:scale-105 transition-transform" iconClassName="h-5 w-5" />
            <div>
              <span className="text-lg font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">AptFindr</span>
              <p className="text-[10px] text-white/40 font-semibold -mt-0.5 uppercase tracking-widest">La Paz, Iloilo City</p>
            </div>
          </Link>

          {/* Hero copy */}
          <div className="mt-16 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-400/30 rounded-full mb-5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 tracking-wide">Trusted Housing Platform</span>
              </div>
              <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
                Find your next<br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  verified home
                </span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                Join the community of students, employees, and families who found safe, verified apartments in La Paz through AptFindr.
              </p>
            </motion.div>
          </div>

          {/* Benefits list */}
          <motion.div
            className="space-y-3 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {[
              { icon: BadgeCheck, text: "Landlords verified with business permits" },
              { icon: ShieldCheck, text: "Permit-checked, flagged listings" },
              { icon: MapPin, text: "GIS map of apartments in La Paz" },
              { icon: Star, text: "Smart ranking by your preferences" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <span className="text-sm text-white/70 font-medium">{text}</span>
              </div>
            ))}
          </motion.div>

          {/* Stats frosted bar */}
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.55 }}
          >
            {[
              { value: "50+", label: "Apartments" },
              { value: "30+", label: "Verified Landlords" },
              { value: "120+", label: "Available Rooms" },
              { value: "6+", label: "Barangays" },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/8 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                <p className="text-xl font-black text-white">{value}</p>
                <p className="text-[11px] text-white/50 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 mt-5">
            {["Secure Registration", "Verified Platform", "Protected Data"].map((b) => (
              <div key={b} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/8 border border-white/10 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-white/50 font-semibold">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
          <Link to="/" className="flex items-center gap-2.5">
            <AppLogo className="h-8 w-8 rounded-lg" iconClassName="h-4 w-4" />
            <span className="font-black text-amber-600 text-base">AptFindr</span>
          </Link>
          <Link to={loginPath} className="text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors">
            Sign in
          </Link>
        </div>

        <div className="flex-1 flex items-start justify-center px-4 py-8 lg:py-12 lg:px-10 xl:px-16">
          <div className="w-full max-w-lg">

            {/* Page heading */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">Create your account</h1>
              <p className="text-slate-500 text-sm mt-1.5">
                Already registered?{" "}
                <Link to={loginPath} className="text-amber-600 font-bold hover:text-amber-700 transition-colors">Sign in here</Link>
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5"
                >
                  <Alert variant="destructive" className="rounded-xl py-3 border-rose-200 bg-rose-50">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <AlertDescription className="font-semibold text-rose-700 text-sm">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── Role cards ─────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">I am registering as a...</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "student", label: "Student", sub: "Near school", icon: GraduationCap, grad: "from-amber-500 to-amber-600" },
                    { id: "employee", label: "Employee", sub: "Near work", icon: Briefcase, grad: "from-orange-500 to-orange-600" },
                    { id: "landlord", label: "Landlord", sub: "List units", icon: Building2, grad: "from-rose-500 to-rose-600" },
                  ].map((item) => {
                    const selected = formData.role === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileHover={{ y: -3, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => set("role", item.id)}
                        className={`relative flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                          selected
                            ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-100"
                            : "border-slate-200 bg-white hover:border-amber-200"
                        }`}
                      >
                        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${item.grad} flex items-center justify-center shadow-sm mb-2.5 transition-transform ${selected ? "scale-110" : ""}`}>
                          <item.icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">{item.label}</span>
                        <span className="text-[11px] text-slate-500 mt-0.5">{item.sub}</span>
                        {selected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center"
                          >
                            <Check className="h-3 w-3 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* ── Accordion: Personal Info ─────────────────────── */}
              <AccordionSection
                title="Personal Information"
                icon={<User className="h-4 w-4" />}
                open={openSection === "personal"}
                onToggle={() => toggle("personal")}
                done={donePersonal}
              >
                <div className="grid grid-cols-2 gap-3">
                  <FloatInput id="firstName" label="First Name" value={formData.firstName} onChange={(v) => set("firstName", v)} required icon={<User className="h-4 w-4" />} />
                  <FloatInput id="lastName" label="Last Name" value={formData.lastName} onChange={(v) => set("lastName", v)} required />
                </div>
                <FloatInput id="middleInitial" label="Middle Initial (optional)" value={formData.middleInitial} onChange={(v) => set("middleInitial", v)} />
                <FloatInput id="address" label="Home Address" value={formData.address} onChange={(v) => set("address", v)} required icon={<MapPin className="h-4 w-4" />} />
                <div className="flex justify-end">
                  <button type="button" onClick={() => toggle("contact")}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                    Next: Contact Info <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </AccordionSection>

              {/* ── Accordion: Contact Info ──────────────────────── */}
              <AccordionSection
                title="Contact Information"
                icon={<Phone className="h-4 w-4" />}
                open={openSection === "contact"}
                onToggle={() => toggle("contact")}
                done={doneContact}
              >
                <FloatInput id="email" label="Email Address" type="email" value={formData.email} onChange={(v) => set("email", v)} required icon={<Mail className="h-4 w-4" />} />
                <FloatInput id="mobile" label="Mobile Number" type="tel" value={formData.mobileNumber} onChange={(v) => set("mobileNumber", v)} required icon={<Phone className="h-4 w-4" />} />
                <div className="flex justify-end">
                  <button type="button" onClick={() => toggle("role-details")}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                    Next: {formData.role === "student" ? "Student" : formData.role === "employee" ? "Employment" : "Verification"} Details <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </AccordionSection>

              {/* ── Accordion: Role-specific ─────────────────────── */}
              <AccordionSection
                title={formData.role === "student" ? "Student Details" : formData.role === "employee" ? "Employment Details" : formData.role === "landlord" ? "Landlord Verification" : "Role Details"}
                icon={formData.role === "student" ? <GraduationCap className="h-4 w-4" /> : formData.role === "employee" ? <Briefcase className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
                open={openSection === "role-details"}
                onToggle={() => toggle("role-details")}
                done={doneRole}
              >
                {!formData.role && (
                  <p className="text-sm text-slate-400 italic py-2">Select a role above to see the relevant fields.</p>
                )}

                {formData.role === "student" && (
                  <div className="space-y-4">
                    <FloatInput id="school" label="School / University" value={formData.school} onChange={(v) => set("school", v)} required icon={<GraduationCap className="h-4 w-4" />} />
                    <div className="rounded-xl border-2 border-amber-100 bg-amber-50/40 p-4 space-y-4">
                      <div className="flex items-center gap-2 text-amber-700 mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Guardian Information</span>
                      </div>
                      <FloatInput id="guardian" label="Guardian Full Name" value={formData.guardian} onChange={(v) => set("guardian", v)} required />
                      <FloatInput id="guardianContact" label="Guardian Contact Number" type="tel" value={formData.guardianContact} onChange={(v) => set("guardianContact", v)} required icon={<Phone className="h-4 w-4" />} />
                      <FloatInput id="guardianAddress" label="Guardian Address" value={formData.guardianAddress} onChange={(v) => set("guardianAddress", v)} required icon={<MapPin className="h-4 w-4" />} />
                    </div>
                  </div>
                )}

                {formData.role === "employee" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border-2 border-orange-100 bg-orange-50/40 p-4 space-y-4">
                      <div className="flex items-center gap-2 text-orange-700 mb-1">
                        <Briefcase className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Employment Information</span>
                      </div>
                      <FloatInput id="company" label="Company / Organization" value={formData.company} onChange={(v) => set("company", v)} required icon={<Building2 className="h-4 w-4" />} />
                      <FloatInput id="workAddress" label="Work Address" value={formData.workAddress} onChange={(v) => set("workAddress", v)} required icon={<MapPin className="h-4 w-4" />} />
                    </div>
                  </div>
                )}

                {formData.role === "landlord" && (
                  <div className="space-y-4">
                    <FloatInput id="permitNumber" label="Business Permit Number" value={formData.permitNumber} onChange={(v) => set("permitNumber", v)} required icon={<ClipboardList className="h-4 w-4" />} />
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Business Permit", ref: permitRef, file: permitFile, setFile: setPermitFile },
                        { label: "Valid ID", ref: idRef, file: idFile, setFile: setIdFile },
                      ].map(({ label, ref, file, setFile }) => (
                        <div key={label}>
                          <p className="text-xs font-semibold text-slate-600 mb-1.5">{label}</p>
                          <button type="button" onClick={() => ref.current?.click()}
                            className={`w-full rounded-xl border-2 border-dashed p-4 flex flex-col items-center gap-1.5 transition-all text-center ${
                              file ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/50"
                            }`}>
                            {file
                              ? <><CheckCircle2 className="h-5 w-5 text-amber-500" /><span className="text-[10px] text-amber-700 font-semibold truncate w-full">{file.name}</span></>
                              : <><Upload className="h-5 w-5 text-slate-400" /><span className="text-[11px] text-slate-400">Upload file</span></>
                            }
                          </button>
                          <input ref={ref} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                      <ShieldCheck className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-700 font-medium leading-relaxed">
                        Verification is required before publishing apartment listings. Your account will be reviewed within 1–2 business days.
                      </p>
                    </div>
                  </div>
                )}

                {formData.role && (
                  <div className="flex justify-end pt-1">
                    <button type="button" onClick={() => toggle("security")}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                      Next: Account Security <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </AccordionSection>

              {/* ── Accordion: Account Security ──────────────────── */}
              <AccordionSection
                title="Account Security"
                icon={<Lock className="h-4 w-4" />}
                open={openSection === "security"}
                onToggle={() => toggle("security")}
                done={doneSecurity}
              >
                {/* Password field */}
                <div>
                  <FloatInput
                    id="password"
                    label="Password"
                    type={showPass ? "text" : "password"}
                    value={formData.password}
                    onChange={(v) => set("password", v)}
                    required
                    icon={<Key className="h-4 w-4" />}
                    suffix={
                      <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  {/* Strength meter */}
                  {formData.password && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((i) => (
                          <motion.div
                            key={i}
                            className={`flex-1 h-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor[strength] : "bg-slate-200"}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: i <= strength ? 1 : 0.3 }}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${strengthText[strength]}`}>{strengthLabel[strength]}</p>
                    </div>
                  )}
                </div>

                <FloatInput
                  id="confirm"
                  label="Confirm Password"
                  type={showConfirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(v) => set("confirmPassword", v)}
                  required
                  icon={<Lock className="h-4 w-4" />}
                  suffix={
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Passwords do not match
                  </p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
                  <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                  </p>
                )}

                {/* Requirements checklist */}
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {[
                    { label: "6+ characters", met: formData.password.length >= 6 },
                    { label: "Uppercase letter", met: /[A-Z]/.test(formData.password) },
                    { label: "Number", met: /[0-9]/.test(formData.password) },
                    { label: "Passwords match", met: !!formData.password && formData.password === formData.confirmPassword },
                  ].map(({ label, met }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${met ? "text-emerald-600" : "text-slate-400"}`}>
                      <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${met ? "bg-emerald-500" : "bg-slate-200"}`}>
                        {met && <Check className="h-2 w-2 text-white" />}
                      </div>
                      {label}
                    </div>
                  ))}
                </div>
              </AccordionSection>

              {/* ── Progress summary bar ─────────────────────────── */}
              {(donePersonal || doneContact || doneRole || doneSecurity) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl"
                >
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                      animate={{ width: `${([donePersonal, doneContact, doneRole, doneSecurity].filter(Boolean).length / 4) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {[donePersonal, doneContact, doneRole, doneSecurity].filter(Boolean).length}/4 sections done
                  </span>
                </motion.div>
              )}

              {/* ── Submit ──────────────────────────────────────────── */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-13 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl font-black text-base shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <motion.div
                      className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                    />
                    Creating your account...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Trust badges below submit */}
              <div className="flex items-center justify-center gap-4 pt-1">
                {["Secure", "Verified", "Protected"].map((b) => (
                  <div key={b} className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {b}
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
