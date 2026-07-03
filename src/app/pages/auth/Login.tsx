import { AppLogo } from "@/app/components/common/AppLogo";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2, Eye, EyeOff,
  Home,
  Key,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/* ─── Floating label input (identical to Signup) ─────────── */
function FloatInput({
  id, label, type = "text", value, onChange, required, icon, suffix,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
  icon?: React.ReactNode; suffix?: React.ReactNode;
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
          placeholder=" "
          required={required}
          className={`w-full bg-transparent text-slate-800 text-sm font-medium outline-none pt-5 pb-2 ${icon ? "pl-10" : "pl-4"} ${suffix ? "pr-10" : "pr-4"} placeholder:text-transparent`}
        />
        <label
          htmlFor={id}
          className={`absolute pointer-events-none transition-all duration-200 font-medium ${icon ? "left-10" : "left-4"} ${
            lifted ? "top-2 text-[10px] tracking-wide uppercase" : "top-1/2 -translate-y-1/2 text-sm"
          } ${focused ? "text-amber-500" : "text-slate-400"}`}
        >
          {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
        {suffix && <div className="absolute right-3.5">{suffix}</div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login({ email, password });
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error || "Login failed");
      }
    } catch {
      setError("Login failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">

      {/* ── LEFT PANEL ────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[420px] xl:w-[480px] flex-shrink-0 relative overflow-hidden min-h-screen">
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=960"
            alt="Modern apartment in La Paz"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/90" />
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/30 via-transparent to-transparent" />
        </div>

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
                Welcome back to<br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  your home search
                </span>
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                Sign back in to manage your listings, messages, and apartment search in La Paz, Iloilo City.
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
              { icon: MapPin,     text: "GIS map of apartments in La Paz" },
              { icon: Star,       text: "Smart ranking by your preferences" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <span className="text-sm text-white/70 font-medium">{text}</span>
              </div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.55 }}
          >
            {[
              { value: "50+",  label: "Apartments" },
              { value: "30+",  label: "Verified Landlords" },
              { value: "120+", label: "Available Rooms" },
              { value: "6+",   label: "Barangays" },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/8 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                <p className="text-xl font-black text-white">{value}</p>
                <p className="text-[11px] text-white/50 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 mt-5">
            {["Secure Sign In", "Verified Platform", "Protected Data"].map((b) => (
              <div key={b} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/8 border border-white/10 rounded-full">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-white/50 font-semibold">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
          <Link to="/" className="flex items-center gap-2.5">
            <AppLogo className="h-8 w-8 rounded-lg" iconClassName="h-4 w-4" />
            <span className="font-black text-amber-600 text-base">AptFindr</span>
          </Link>
          <Link to="/signup" className="text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors">
            Create account
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8 lg:py-12 lg:px-10 xl:px-16">
          <div className="w-full max-w-lg">

            {/* Page heading */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">Sign in to your account</h1>
              <p className="text-slate-500 text-sm mt-1.5">
                New to AptFindr?{" "}
                <Link to="/signup" className="text-amber-600 font-bold hover:text-amber-700 transition-colors">
                  Create an account
                </Link>
              </p>
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-5"
                >
                  <Alert className="rounded-xl py-3 border-emerald-200 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <AlertDescription className="font-semibold text-emerald-700 text-sm">{successMessage}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

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

              {/* Form card — same rounded-2xl border-2 treatment as Signup accordion sections */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-5 space-y-4">
                  <FloatInput
                    id="email"
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    required
                    icon={<Mail className="h-4 w-4" />}
                  />

                  <div className="space-y-1">
                    <FloatInput
                      id="password"
                      label="Password"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={setPassword}
                      required
                      icon={<Key className="h-4 w-4" />}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          aria-label={showPass ? "Hide password" : "Show password"}
                        >
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                    <div className="flex justify-end pt-1">
                      <Link
                        to="/forgot-password"
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit — exact same style as Signup */}
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
                    Verifying...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Trust badges — same as Signup */}
              <div className="flex items-center justify-center gap-4 pt-1">
                {["Secure", "Verified", "Protected"].map((b) => (
                  <div key={b} className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {b}
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Back to Home */}
              <Link
                to="/"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/40 text-sm font-bold text-slate-600 hover:text-amber-700 transition-all duration-200"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}