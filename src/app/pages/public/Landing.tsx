import { AppLogo } from "@/app/components/common/AppLogo";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { LandingListingsSection } from "@/app/components/landing/LandingApartmentPreview";
import { Button } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Bot,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Flag,
  GraduationCap,
  Heart,
  Mail,
  Map,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Star,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
  Zap
} from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/* ─── Animation helpers ──────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Hero images ───────────────────────────────────────── */
const heroImages = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600",
];

/* ─── Barangay data ─────────────────────────────────────── */
const barangays = [
  { name: "Divinagracia", count: "12+ units", emoji: "🏘️" },
  { name: "Benedicto", count: "8+ units", emoji: "🏢" },
  { name: "Sto. Rosario", count: "15+ units", emoji: "🏠" },
  { name: "Rizal", count: "10+ units", emoji: "🏗️" },
  { name: "Baldoza", count: "6+ units", emoji: "🏡" },
  { name: "Pale Benedicto", count: "9+ units", emoji: "🏬" },
];

/* ─── Categories ────────────────────────────────────────── */
const categories = [
  { icon: Building2, label: "Apartments", color: "from-amber-400 to-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { icon: GraduationCap, label: "Student Housing", color: "from-rose-400 to-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  { icon: Users, label: "Family Units", color: "from-pink-400 to-pink-600", bg: "bg-pink-50", border: "border-pink-200" },
  { icon: Briefcase, label: "Professional Housing", color: "from-orange-400 to-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { icon: BedDouble, label: "Furnished Units", color: "from-amber-500 to-rose-500", bg: "bg-amber-50", border: "border-amber-200" },
];

/* ─── Community users ───────────────────────────────────── */
const communityCards = [
  {
    role: "Student",
    icon: GraduationCap,
    name: "College student near CPU",
    quote: "Found a verified, affordable boarding house within walking distance from my university without having to do multiple walk-ins.",
    color: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
  },
  {
    role: "Working Professional",
    icon: Briefcase,
    name: "Office worker in La Paz",
    quote: "I needed something close to work with a verified permit. The map view made it easy to compare apartments near my office.",
    color: "border-orange-200",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-700",
  },
  {
    role: "Family",
    icon: Users,
    name: "Young family relocating",
    quote: "The ranking feature helped us filter by number of rooms and budget. We found a safe, family-friendly unit faster than expected.",
    color: "border-rose-200",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-700",
  },
];

export function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [landingSearch, setLandingSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [budget, setBudget] = useState("");
  const [roomType, setRoomType] = useState("");
  const [rooms, setRooms] = useState("");
  const [availability, setAvailability] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setHeroIndex((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashboardPath = user?.role === "admin" ? "/admin" : "/dashboard";

  const handleProtectedAction = (e: React.MouseEvent) => {
    if (!user) { e.preventDefault(); navigate("/login"); }
  };

  const handleLandingSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    const params = new URLSearchParams();
    if (landingSearch.trim()) params.set("search", landingSearch.trim());
    if (budget) params.set("budget", budget);
    if (roomType) params.set("type", roomType);
    if (rooms) params.set("rooms", rooms);
    if (availability) params.set("availability", availability);
    navigate(params.toString() ? `/browse?${params}` : "/browse");
  };

  const activeFiltersCount = [budget, roomType, rooms, availability].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white">

      {/* ─── Sticky Header ──────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-xl shadow-md border-b border-amber-100" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <AppLogo className="h-10 w-10 rounded-xl transition-all group-hover:scale-105" iconClassName="h-5 w-5" />
              <div>
                <span className={`text-xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent`}>
                  AptFindr
                </span>
                <p className="text-[10px] text-amber-600/60 font-semibold -mt-0.5 leading-none">La Paz, Iloilo City</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {[
                { to: "/browse", label: "Browse", protected: true },
                { to: "/favorites", label: "Favorites", protected: true, icon: <Heart className="h-3.5 w-3.5" /> },
              ].map(({ to, label, protected: isProtected, icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={isProtected ? handleProtectedAction : undefined}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors rounded-lg ${
                    scrolled ? "text-slate-700 hover:text-amber-600 hover:bg-amber-50" : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {icon}{label}
                </Link>
              ))}
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-current/20">
                {!user ? (
                  <>
                    <Link to="/login">
                      <Button variant="ghost" size="sm" className={`font-semibold ${scrolled ? "text-slate-700 hover:text-amber-600" : "text-white hover:bg-white/10"}`}>
                        Login
                      </Button>
                    </Link>
                    <Link to="/signup">
                      <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg font-semibold rounded-lg px-5">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to={dashboardPath}>
                    <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg font-semibold rounded-lg px-5">
                      Dashboard
                    </Button>
                  </Link>
                )}
              </div>
            </nav>

            <Sheet>
              <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg h-9 w-9 hover:bg-white/10">
                <Menu className={`h-5 w-5 ${scrolled ? "text-slate-700" : "text-white"}`} />
              </SheetTrigger>
              <SheetContent className="bg-white border-amber-100">
                <SheetTitle className="text-amber-900">Menu</SheetTitle>
                <SheetDescription className="text-amber-700/60">AptFindr — La Paz, Iloilo City</SheetDescription>
                <nav className="flex flex-col gap-2 mt-8">
                  {[
                    { to: "/browse", label: "Browse Apartments", protected: true },
                    { to: "/favorites", label: "Favorites", protected: true },
                    ...(!user ? [{ to: "/login", label: "Login", protected: false }, { to: "/signup", label: "Sign Up", protected: false }] : [{ to: dashboardPath, label: "Dashboard", protected: false }]),
                  ].map(({ to, label, protected: isProtected }) => (
                    <Link key={to} to={to} onClick={isProtected ? handleProtectedAction : undefined}
                      className="px-4 py-3 text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-xl font-semibold transition-colors">
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden">
        {/* Background carousel */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="sync">
            <motion.div
              key={heroIndex}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <ImageWithFallback
                src={heroImages[heroIndex]}
                alt="Apartment in La Paz"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>
          {/* Multi-layer overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-900/30 via-transparent to-transparent" />
        </div>

        {/* Carousel controls */}
        <button onClick={() => setHeroIndex((i) => (i - 1 + heroImages.length) % heroImages.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 flex items-center justify-center transition-colors">
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <button onClick={() => setHeroIndex((i) => (i + 1) % heroImages.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 flex items-center justify-center transition-colors">
          <ChevronRight className="h-5 w-5 text-white" />
        </button>

        {/* Carousel dots */}
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroImages.map((_, i) => (
            <button key={i} onClick={() => setHeroIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === heroIndex ? "w-8 bg-amber-400" : "w-2 bg-white/40"}`} />
          ))}
        </div>

        {/* Hero content */}
        <div className="relative z-10 container mx-auto px-4 lg:px-8 pt-20 pb-28">
          <motion.div className="max-w-4xl mx-auto text-center" initial="hidden" animate="show" variants={stagger}>

            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-amber-500/20 backdrop-blur-md border border-amber-400/30 rounded-full">
              <motion.span animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <MapPin className="h-4 w-4 text-amber-400" />
              </motion.span>
              <span className="text-sm font-bold text-amber-200">La Paz, Iloilo City · Verified Listings</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-[1.05] tracking-tight text-white">
              Find Your{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">Perfect Home</span>
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.7 }}
                />
              </span>
              <br />in La Paz
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed">
              Browse verified apartment listings, compare locations on a live map, and find your ideal rental — all in one platform.
            </motion.p>

            {/* ── Search panel ── */}
            <motion.div variants={fadeUp} className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden max-w-3xl mx-auto">
              <form onSubmit={handleLandingSearch}>
                {/* Main search bar */}
                <div className="flex items-center gap-3 p-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                    <input
                      value={landingSearch}
                      onChange={(e) => setLandingSearch(e.target.value)}
                      placeholder="Search by area, address, or apartment name..."
                      className="w-full h-13 rounded-xl bg-amber-50/60 border border-amber-100 pl-12 pr-4 py-3.5 text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-base"
                    />
                  </div>
                  <button type="button" onClick={() => setShowFilters(!showFilters)}
                    className={`relative flex items-center gap-2 px-4 py-3.5 rounded-xl border font-semibold text-sm transition-all ${
                      showFilters || activeFiltersCount > 0
                        ? "bg-amber-100 border-amber-300 text-amber-800"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-300"
                    }`}>
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                  <Button type="submit"
                    className="px-6 py-3.5 h-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold text-base shadow-lg whitespace-nowrap">
                    Search
                  </Button>
                </div>

                {/* Quick filters panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-3 pb-3 border-t border-slate-100 pt-3">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                            <DollarSign className="inline h-3 w-3 mr-1" />Budget
                          </label>
                          <select value={budget} onChange={(e) => setBudget(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400">
                            <option value="">Any budget</option>
                            <option value="0-3000">Under ₱3,000</option>
                            <option value="3000-5000">₱3,000–5,000</option>
                            <option value="5000-8000">₱5,000–8,000</option>
                            <option value="8000+">₱8,000+</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                            <Building2 className="inline h-3 w-3 mr-1" />Type
                          </label>
                          <select value={roomType} onChange={(e) => setRoomType(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400">
                            <option value="">All types</option>
                            <option value="apartment">Apartment</option>
                            <option value="studio">Studio</option>
                            <option value="family">Family Unit</option>
                            <option value="furnished">Furnished Unit</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                            <BedDouble className="inline h-3 w-3 mr-1" />Rooms
                          </label>
                          <select value={rooms} onChange={(e) => setRooms(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400">
                            <option value="">Any</option>
                            <option value="1">1 Room</option>
                            <option value="2">2 Rooms</option>
                            <option value="3">3 Rooms</option>
                            <option value="4+">4+ Rooms</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                            <CalendarCheck className="inline h-3 w-3 mr-1" />Available
                          </label>
                          <select value={availability} onChange={(e) => setAvailability(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400">
                            <option value="">Any time</option>
                            <option value="now">Available now</option>
                            <option value="soon">Available soon</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mt-6 text-sm text-white/70">
              <span className="font-semibold text-white/50">Popular:</span>
              {["Divinagracia", "Sto. Rosario", "Near CPU", "Near schools"].map((s) => (
                <button key={s} type="button"
                  onClick={() => { setLandingSearch(s); }}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-colors font-medium">
                  {s}
                </button>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats bar ───────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 py-6 shadow-lg">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { label: "Available Apartments", value: "50+", icon: Building2 },
              { label: "Available Rooms", value: "120+", icon: BedDouble },
              { label: "Verified Landlords", value: "30+", icon: BadgeCheck },
              { label: "Active Listings", value: "80+", icon: TrendingUp },
            ].map(({ label, value, icon: Icon }, i) => (
              <AnimatedSection key={label} delay={i * 0.06}>
                <div className="flex items-center gap-3 text-white">
                  <div className="flex-shrink-0 h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black leading-none">{value}</div>
                    <div className="text-xs text-white/80 font-medium mt-0.5">{label}</div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Categories ──────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-white to-amber-50/40">
        <div className="container mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <p className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-2">Browse by Type</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Apartment Categories</h2>
            <p className="text-slate-500 max-w-lg mx-auto">Find the right type of rental that fits your lifestyle and needs</p>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {categories.map(({ icon: Icon, label, color, bg, border }, i) => (
              <AnimatedSection key={label} delay={i * 0.07}>
                <Link to="/browse" onClick={handleProtectedAction}>
                  <motion.div
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className={`${bg} ${border} border-2 rounded-2xl p-5 text-center cursor-pointer transition-shadow hover:shadow-lg group`}
                  >
                    <div className={`inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br ${color} items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{label}</p>
                  </motion.div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Listings (preserved component) ─────────── */}
      <div className="bg-white">
        <div className="container mx-auto px-4 lg:px-8 pt-4 pb-2">
          <AnimatedSection className="text-center mb-2">
            <p className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-2">Live from the platform</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Featured Listings</h2>
            <p className="text-slate-500 max-w-lg mx-auto">Recently posted, verified apartments in La Paz</p>
          </AnimatedSection>
        </div>
        <LandingListingsSection onBrowseClick={handleProtectedAction} />
      </div>

      {/* ─── Browse by Location ───────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-amber-50/40 to-white">
        <div className="container mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <p className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-2">Explore the area</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Browse by Location</h2>
            <p className="text-slate-500 max-w-lg mx-auto">Apartments across barangays within La Paz, Iloilo City</p>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {barangays.map(({ name, count, emoji }, i) => (
              <AnimatedSection key={name} delay={i * 0.07}>
                <Link to="/browse" onClick={handleProtectedAction}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white border-2 border-amber-100 hover:border-amber-300 rounded-2xl p-5 flex items-center gap-4 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                  >
                    <span className="text-3xl">{emoji}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors text-sm leading-snug">{name}</p>
                      <p className="text-xs text-amber-600 font-semibold mt-0.5">{count}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-400 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who It's For ────────────────────────────────────── */}
      <section className="py-20 bg-slate-900">
        <div className="container mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <p className="text-amber-400 font-bold text-sm uppercase tracking-widest mb-2">Built for everyone</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Who Uses AptFindr</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Designed around the distinct needs of renters, landlords, and administrators</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              { icon: GraduationCap, role: "Students", desc: "Find affordable, accessible housing near schools with verified information — no more random walk-ins.", gradient: "from-amber-500 to-amber-600" },
              { icon: Briefcase, role: "Employees", desc: "Search within budget and commute range. Check verified details before scheduling a visit.", gradient: "from-orange-500 to-orange-600" },
              { icon: Building2, role: "Landlords", desc: "Submit permits for review, get verified, and reach tenants through a centralized listing platform.", gradient: "from-rose-500 to-rose-600" },
              { icon: UserCog, role: "Administrators", desc: "Review permits, manage verified listings, monitor compliance, and oversee platform activity.", gradient: "from-pink-500 to-pink-600" },
            ].map(({ icon: Icon, role, desc, gradient }, i) => (
              <AnimatedSection key={role} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -8 }}
                  className="bg-slate-800 border border-slate-700 rounded-2xl p-6 h-full"
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} mb-4 shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2">{role}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Choose Us ───────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <p className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-2">Platform advantages</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Why Choose Our Platform</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Features designed for safer, more informed rental decisions</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {[
              { icon: BadgeCheck, title: "Verified Landlords", desc: "Landlords are reviewed and approved before listings go live. Look for the verified badge.", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
              { icon: ShieldCheck, title: "Permit-Checked Listings", desc: "Listings with valid business permits are marked and monitored by platform administrators.", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
              { icon: Flag, title: "Community Reporting", desc: "Users can report suspicious or inaccurate listings. Admins review and act on reports promptly.", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
              { icon: Map, title: "GIS Map View", desc: "See all apartments on a live map. Compare locations and find what's closest to your destination.", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
              { icon: Bot, title: "AI Assistance", desc: "A built-in assistant helps you navigate the platform and understand rental options quickly.", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
              { icon: TrendingUp, title: "Listing Activity", desc: "Landlords see views and saves on their listings. Renters get ranked suggestions based on verified availability.", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
            ].map(({ icon: Icon, title, desc, color, bg, border }, i) => (
              <AnimatedSection key={title} delay={i * 0.07}>
                <motion.div
                  whileHover={{ y: -6 }}
                  className={`${bg} ${border} border-2 rounded-2xl p-6 h-full`}
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white border ${border} mb-4 shadow-sm`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <h3 className="font-black text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-amber-50/60 to-white">
        <div className="container mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <p className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-2">Simple process</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">How AptFindr Works</h2>
            <p className="text-slate-500 max-w-xl mx-auto">From account creation to informed rental decision in three steps</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-[52px] left-1/4 right-1/4 h-px bg-gradient-to-r from-amber-300 to-orange-300" />

            {[
              { icon: UserCheck, title: "Create your account", desc: "Sign up as a renter or landlord. Landlords submit permit details for admin review before their listings go live." },
              { icon: Search, title: "Browse & compare", desc: "Filter listings by budget, type, and location. Use the GIS map to compare apartments and view them side by side." },
              { icon: CheckCircle2, title: "Decide with confidence", desc: "Use verified listings, ranked suggestions, and map-based comparisons to make informed housing decisions." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <AnimatedSection key={title} delay={i * 0.12}>
                <motion.div whileHover={{ y: -6 }} className="relative bg-white border-2 border-amber-100 rounded-3xl p-8 text-center shadow-sm">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg mb-5 mx-auto">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-8 w-8 bg-white border-2 border-amber-200 rounded-full flex items-center justify-center text-xs font-black text-amber-600 shadow-sm">
                    {i + 1}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Community Section ───────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <p className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-2">Our community</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Built for La Paz Renters</h2>
            <p className="text-slate-500 max-w-lg mx-auto">AptFindr supports the needs of students, families, and working professionals across La Paz</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {communityCards.map(({ role, icon: Icon, name, quote, color, iconBg, iconColor }, i) => (
              <AnimatedSection key={role} delay={i * 0.09}>
                <motion.div whileHover={{ y: -6 }} className={`bg-white border-2 ${color} rounded-2xl p-6 shadow-sm h-full flex flex-col`}>
                  <div className={`inline-flex h-10 w-10 ${iconBg} rounded-xl items-center justify-center mb-4`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{role}</p>
                  <p className="font-bold text-slate-800 text-sm mb-3">{name}</p>
                  <p className="text-slate-500 text-sm leading-relaxed flex-1 italic">"{quote}"</p>
                  <div className="flex gap-0.5 mt-4">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 container mx-auto px-4 lg:px-8 text-center">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/20 backdrop-blur rounded-full border border-white/30">
              <Zap className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">Ready to find your next home?</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
              Start browsing verified<br />apartments today
            </h2>
            <p className="text-white/85 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Create a free account to access all listings, view the GIS map, get personalized recommendations, and connect with verified landlords in La Paz.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="bg-white text-amber-700 hover:bg-amber-50 shadow-xl font-black text-base px-8 py-4 h-auto rounded-xl inline-flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Create Free Account
                </Button>
              </Link>
              <Link to="/browse" onClick={handleProtectedAction}>
                <Button size="lg" variant="outline" className="border-2 border-white/50 text-white hover:bg-white/10 backdrop-blur font-bold text-base px-8 py-4 h-auto rounded-xl inline-flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Browse Listings
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-8">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <AppLogo className="h-10 w-10 rounded-xl" iconClassName="h-5 w-5" />
                <span className="font-black text-white text-xl">AptFindr</span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-xs text-sm">
                A Progressive Web Application for verified apartment listings and smart rental search in La Paz, Iloilo City. Academic thesis project.
              </p>
              <div className="flex gap-3 mt-5">
                <a href="mailto:aptfindr@example.com" className="flex items-center gap-2 text-xs text-slate-500 hover:text-amber-400 transition-colors">
                  <Mail className="h-3.5 w-3.5" />aptfindr@example.com
                </a>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-black text-white text-sm uppercase tracking-widest mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {[
                  { to: "/browse", label: "Browse Listings", protected: true },
                  { to: "/favorites", label: "Favorites", protected: true },
                  { to: "/signup", label: "Create Account", protected: false },
                  { to: "/login", label: "Log In", protected: false },
                  { to: "/flowchart", label: "Platform Flowchart", protected: false },
                  { to: "/design-guide", label: "Design Guide", protected: false },
                ].map(({ to, label, protected: isProtected }) => (
                  <li key={to}>
                    <Link to={to} onClick={isProtected ? handleProtectedAction : undefined}
                      className="text-sm hover:text-amber-400 transition-colors flex items-center gap-1.5 group">
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* About / Legal */}
            <div>
              <h4 className="font-black text-white text-sm uppercase tracking-widest mb-4">About</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-slate-500">About Us</span></li>
                <li><span className="text-slate-500">Privacy Policy</span></li>
                <li><span className="text-slate-500">Terms & Conditions</span></li>
                <li><span className="text-slate-500">Contact Us</span></li>
              </ul>
              <div className="mt-6 pt-5 border-t border-slate-800">
                <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide mb-2">Coverage Area</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-slate-400">La Paz, Iloilo City, Philippines</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">© 2026 AptFindr PWA — La Paz, Iloilo City. Academic thesis project.</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-800 px-3 py-1.5 rounded-full">
                <Smartphone className="h-3 w-3" /> Progressive Web App
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
