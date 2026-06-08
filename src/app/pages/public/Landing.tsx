import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import {
  Search,
  Heart,
  Map,
  Home,
  CheckCircle2,
  Menu,
  Sparkles,
  Zap,
  UserCheck,
  Building2,
  GraduationCap,
  Briefcase,
  UserCog,
  ShieldCheck,
  Flag,
  Smartphone,
  Database,
  ClipboardCheck,
  BarChart3,
  Bot,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/app/components/ui/sheet";
import { useAuth } from "@/app/contexts/AuthContext";
import { LandingListingsSection } from "@/app/components/landing/LandingApartmentPreview";
import { AppLogo } from "@/app/components/common/AppLogo";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [landingSearch, setLandingSearch] = useState("");

  const dashboardPath =
    user?.role === "admin" ? "/admin" : user?.role === "landlord" ? "/dashboard" : "/dashboard";

  const handleProtectedAction = (e: React.MouseEvent, path: string) => {
    if (!user) {
      e.preventDefault();
      navigate("/login");
    }
  };

  const handleLandingSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    const query = landingSearch.trim();
    navigate(query ? `/browse?search=${encodeURIComponent(query)}` : "/browse");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* ─── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-amber-100/50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 group">
              <AppLogo className="h-11 w-11 rounded-xl transition-all group-hover:scale-105" iconClassName="h-6 w-6" />
              <div>
                <span className="text-xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  AptFindr
                </span>
                <p className="text-xs text-amber-600/60 font-medium">La Paz, Iloilo City PWA</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/browse"
                onClick={(e) => handleProtectedAction(e, "/browse")}
                className="px-4 py-2 text-slate-700 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50/50 font-medium"
              >
                Browse
              </Link>
              <Link
                to="/favorites"
                onClick={(e) => handleProtectedAction(e, "/favorites")}
                className="flex items-center space-x-2 px-4 py-2 text-slate-700 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50/50 font-medium"
              >
                <Heart className="h-4 w-4" />
                <span>Favorites</span>
              </Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-amber-200">
                {!user ? (
                  <>
                    <Link to="/login">
                      <Button
                        variant="ghost"
                        className="text-slate-700 hover:text-amber-600 hover:bg-amber-50/50 font-medium"
                      >
                        Login
                      </Button>
                    </Link>
                    <Link to="/signup">
                      <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg hover:shadow-orange-300/50 transition-all font-semibold rounded-lg">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to={dashboardPath}>
                    <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg hover:shadow-orange-300/50 transition-all font-semibold rounded-lg">
                      Go to Dashboard
                    </Button>
                  </Link>
                )}
              </div>
            </nav>

            <Sheet>
              <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg hover:bg-amber-50 h-9 w-9">
                <Menu className="h-6 w-6 text-amber-600" />
              </SheetTrigger>
              <SheetContent className="bg-white border-amber-100">
                <SheetTitle className="text-amber-900">Menu</SheetTitle>
                <SheetDescription className="text-amber-700/60">
                  AptFindr PWA for La Paz, Iloilo City
                </SheetDescription>
                <nav className="flex flex-col space-y-4 mt-8">
                  <Link
                    to="/browse"
                    onClick={(e) => handleProtectedAction(e, "/browse")}
                    className="text-lg text-slate-700 px-3 py-2 rounded-lg hover:bg-amber-50 font-medium"
                  >
                   Browse Apartments
                  </Link>
                  <Link
                    to="/favorites"
                    onClick={(e) => handleProtectedAction(e, "/favorites")}
                    className="flex items-center gap-2 text-lg text-slate-700 px-3 py-2 rounded-lg hover:bg-amber-50 font-medium"
                  >
                    <Heart className="h-5 w-5" />
                    Favorites
                  </Link>
                  {!user ? (
                    <>
                      <Link to="/login" className="text-lg text-slate-700 px-3 py-2 rounded-lg hover:bg-amber-50 font-medium">
                        Login
                      </Link>
                      <Link to="/signup" className="text-lg text-slate-700 px-3 py-2 rounded-lg hover:bg-amber-50 font-medium">
                        Sign Up
                      </Link>
                    </>
                  ) : (
                    <Link to={dashboardPath} className="text-lg text-slate-700 px-3 py-2 rounded-lg hover:bg-amber-50 font-medium">
                      Dashboard
                    </Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative min-h-[720px] flex items-center justify-center overflow-hidden pt-12">
        <div className="absolute inset-0 z-0">
          <motion.div
            className="absolute inset-0"
            animate={{ scale: [1, 1.045, 1], x: [0, -10, 0], y: [0, 8, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          >
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1559329146-807aff9ff1fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDF8fHx8MTc3MjE4MTg5Nnww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Apartment building in La Paz area"
              className="w-full h-full object-cover"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-amber-100/40 to-orange-100/40" />
          <motion.div
            className="absolute top-20 right-0 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl"
            animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.08, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl"
            animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.06, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        <motion.div
          className="relative z-10 container mx-auto px-4 text-center"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="inline-block mb-6 px-6 py-3 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full shadow-sm">
            <span className="text-sm font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.12, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
              </motion.span>
               Progressive Web Application
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-slate-900">
            <span className="block">AptFindr for</span>
            <motion.span
              className="block bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent"
              style={{ backgroundSize: "220% 220%" }}
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              La Paz, Iloilo City
            </motion.span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg md:text-xl mb-8 text-slate-700 max-w-3xl mx-auto leading-relaxed font-medium">
            A verified apartment listing and smart analytics platform for <strong>students</strong>,{" "}
            <strong>employees</strong>, landlords, and administrators in La Paz. It centralizes rental information,
            supports permit review, ranks apartments by user preferences, maps nearby units, and presents demand
            insights for safer housing decisions.
          </motion.p>

          <motion.form
            variants={fadeUp}
            onSubmit={handleLandingSearch}
            className="flex items-center justify-center mb-8"
            animate={{
              filter: [
                "drop-shadow(0 8px 18px rgba(245, 158, 11, 0.16))",
                "drop-shadow(0 14px 28px rgba(245, 158, 11, 0.28))",
                "drop-shadow(0 8px 18px rgba(245, 158, 11, 0.16))",
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/85 backdrop-blur-md border-2 border-amber-200 rounded-2xl px-4 py-4 shadow-lg w-full max-w-2xl">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                <input
                  value={landingSearch}
                  onChange={(e) => setLandingSearch(e.target.value)}
                  placeholder="Search by area, address, or apartment name"
                  className="w-full h-12 rounded-xl border-2 border-amber-100 bg-white pl-12 pr-4 text-slate-800 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                />
              </div>
              <Button
                type="submit"
                className="h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold px-6 shrink-0"
              >
                Search Listings
              </Button>
            </div>
          </motion.form>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup">
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl rounded-xl font-bold flex items-center gap-2"
              >
                <UserCheck className="h-5 w-5" />
                Create Account
              </Button>
            </Link>
            <Link to="/browse" onClick={(e) => handleProtectedAction(e, "/browse")}>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 border-2 border-amber-300 text-amber-800 bg-white hover:bg-amber-50 rounded-xl font-bold flex items-center gap-2"
              >
                <Building2 className="h-5 w-5" />
                Browse Listings
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Platform highlights (no fake stats) ─────────────── */}
      <section className="bg-white/90 backdrop-blur border-y border-amber-100 py-10 shadow-sm">
        <div className="container mx-auto px-4">
          <p className="text-center text-slate-500 font-medium text-sm mb-6 uppercase tracking-wide">
            What this system provides
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: ClipboardCheck,
                label: "Permit review",
                detail: "Admin-verified badges",
                color: "text-amber-600",
              },
              {
                icon: Map,
                label: "GIS map",
                detail: "Locations in La Paz",
                color: "text-orange-600",
              },
              {
                icon: Search,
                label: "Weighted ranking",
                detail: "Preference-based matches",
                color: "text-rose-600",
              },
              {
                icon: BarChart3,
                label: "Smart analytics",
                detail: "Demand and trends",
                color: "text-amber-500",
              },
            ].map(({ icon: Icon, label, detail, color }, index) => (
              <motion.div
                key={label}
                className="flex flex-col items-center gap-1 text-center px-2"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                whileHover={{ y: -4 }}
              >
                <Icon className={`h-7 w-7 ${color} mb-1`} />
                <span className="font-black text-slate-900 text-sm md:text-base">{label}</span>
                <span className="text-slate-500 text-xs md:text-sm">{detail}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who it's for ────────────────────────────────────── */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">Who Uses the Platform</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Built around the users identified in the thesis scope
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: GraduationCap,
                role: "Students",
                desc: "Find accessible apartments near schools, compare prices and amenities, view locations, and use recommendations to reduce manual walk-ins.",
                card: "border-amber-200/60",
                iconWrap: "bg-amber-100",
                iconColor: "text-amber-700",
              },
              {
                icon: Briefcase,
                role: "Employees",
                desc: "Search for rentals that fit budget, commute, and preferred location while checking verified information before visiting a unit.",
                card: "border-orange-200/60",
                iconWrap: "bg-orange-100",
                iconColor: "text-orange-700",
              },
              {
                icon: Building2,
                role: "Landlords",
                desc: "Submit permit information for review, publish legitimate listings, manage rental details, and reach tenants through a centralized platform.",
                card: "border-rose-200/60",
                iconWrap: "bg-rose-100",
                iconColor: "text-rose-700",
              },
              {
                icon: UserCog,
                role: "Administrators",
                desc: "Review permits, mark verified listings, monitor apartments without business permits, handle reports, and oversee platform data.",
                card: "border-pink-200/60",
                iconWrap: "bg-pink-100",
                iconColor: "text-pink-700",
              },
            ].map(({ icon: Icon, role, desc, card, iconWrap, iconColor }, index) => (
              <motion.div
                key={role}
                className={`bg-white/80 backdrop-blur border-2 ${card} rounded-2xl p-6 shadow-md`}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <motion.div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${iconWrap} mb-4`}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.18 }}
                >
                  <Icon className={`h-6 w-6 ${iconColor}`} />
                </motion.div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{role}</h3>
                <p className="text-slate-600 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-white/50 to-amber-50/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">How the System Works</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              From verified listing data to informed rental decisions
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              className="hidden md:block absolute top-14 left-1/4 right-1/4 h-0.5 origin-left bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1 }}
            />

            {[
              {
                step: "01",
                icon: UserCheck,
                title: "Collect and verify",
                desc: "Landlords submit apartment details and permits. Administrators review documents, approve legitimate accounts, and monitor unverified rentals.",
              },
              {
                step: "02",
                icon: Search,
                title: "Match and visualize",
                desc: "Tenants filter listings, receive ranked apartment suggestions, and use the GIS map to compare locations within La Paz.",
              },
              {
                step: "03",
                icon: BarChart3,
                title: "Analyze and decide",
                desc: "The platform presents availability, pricing, rental demand, and assistance tools to support safer and more informed choices.",
              },
            ].map(({ step, icon: Icon, title, desc }, index) => (
              <motion.div
                key={step}
                className="relative bg-white/80 backdrop-blur border-2 border-amber-200/60 rounded-3xl p-8 text-center shadow-lg"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
              >
                <div className="text-5xl font-black text-amber-400/40 mb-3">{step}</div>
                <motion.div
                  className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-5 mx-auto"
                  animate={{ y: [0, -5, 0], rotate: [0, 1.5, 0] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                >
                  <Icon className="h-7 w-7 text-amber-700" />
                </motion.div>
                <h3 className="text-xl font-black mb-2 text-slate-900">{title}</h3>
                <p className="text-slate-600 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Core features ───────────────────────────────────── */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">Main Features</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Based on Chapters 1-3: verified listings, GIS, ranking, analytics, and Agile development
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Search,
                title: "Centralized listings",
                desc: "Apartment details are organized in one platform for renters in La Paz, reducing reliance on walk-ins, word-of-mouth, and scattered social media posts.",
              },
              {
                icon: Map,
                title: "GIS map browsing",
                desc: "Leaflet-based mapping helps users view apartment locations, compare nearby options, and understand proximity before visiting.",
              },
              {
                icon: Search,
                title: "Weighted ranking",
                desc: "Listings can be ranked based on user preferences such as price, location, amenities, availability, and other rental criteria.",
              },
              {
                icon: ShieldCheck,
                title: "Permit verification",
                desc: "Landlords submit business permit details for admin review so approved apartments can display verified badges.",
              },
              {
                icon: Flag,
                title: "Compliance monitoring",
                desc: "Administrators can track reports and apartments without business permits based on available system records and user inputs.",
              },
              {
                icon: Bot,
                title: "AI assistance",
                desc: "A built-in assistance feature helps users navigate the platform and understand apartment-related information more efficiently.",
              },
            ].map(({ icon: Icon, title, desc }, index) => (
              <motion.div
                key={title}
                className="bg-white/80 backdrop-blur border-2 border-amber-100 rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                whileHover={{ y: -8, scale: 1.015 }}
              >
                <motion.div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 mb-5"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3.1, repeat: Infinity, ease: "easeInOut", delay: index * 0.12 }}
                >
                  <Icon className="h-6 w-6 text-amber-700" />
                </motion.div>
                <h3 className="text-xl font-black mb-3 text-slate-900">{title}</h3>
                <p className="text-slate-600 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Live listings preview (or placeholder when empty) ─ */}
      <LandingListingsSection onBrowseClick={(e) => handleProtectedAction(e, "/browse")} />
      {/* ─── Trust & accuracy ────────────────────────────────── */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">Focused Study Scope</h2>
            <p className="text-lg text-slate-600">Aligned with the thesis limitations and methodology</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Manual permit validation",
                desc: "Verification depends on documents submitted by landlords and review by administrators, matching the study's defined process.",
              },
              {
                icon: Database,
                title: "Data-driven insights",
                desc: "Analytics and forecasting are limited to data collected within the system, such as listings, views, preferences, and availability.",
              },
              {
                icon: Smartphone,
                title: "Progressive Web App",
                desc: "The system is accessible through desktop and mobile browsers and supports an app-like experience without requiring installation.",
              },
              {
                icon: CheckCircle2,
                title: "Focused on La Paz",
                desc: "The study covers apartment rentals in La Paz, Iloilo City only and does not represent a nationwide rental marketplace.",
              },
            ].map(({ icon: Icon, title, desc }, index) => (
              <motion.div
                key={title}
                className="flex gap-5 p-6 bg-white/80 backdrop-blur border-2 border-amber-100 rounded-2xl shadow-md"
                initial={{ opacity: 0, x: index % 2 === 0 ? -24 : 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                whileHover={{ y: -5 }}
              >
                <motion.div
                  className="flex-shrink-0 h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.16 }}
                >
                  <Icon className="h-6 w-6 text-amber-700" />
                </motion.div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 mb-1">{title}</h3>
                  <p className="text-slate-600">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 via-orange-100/50 to-rose-100/50" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            className="max-w-3xl mx-auto"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="inline-block mb-6 px-5 py-2 bg-white/70 backdrop-blur border border-amber-200 rounded-full">
              <span className="text-sm font-bold text-amber-700 flex items-center justify-center gap-2">
                <Zap className="h-4 w-4" />
                Ready to use the thesis prototype?
              </span>
            </motion.div>

            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black mb-6 text-slate-900 leading-tight">
              Search safer, verified apartment options
            </motion.h2>

            <motion.p variants={fadeUp} className="text-lg text-slate-700 mb-10 leading-relaxed font-medium">
              Create an account to browse verified listings, compare mapped locations, receive ranked suggestions, and
              view housing insights. Landlords can register to submit permits and publish apartments after review.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="text-lg px-10 py-7 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-xl rounded-2xl font-black inline-flex items-center gap-2"
                >
                  <UserCheck className="h-5 w-5" />
                  Sign Up
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-10 py-7 border-2 border-amber-300 text-amber-800 bg-white hover:bg-amber-50 rounded-2xl font-black"
                >
                  Log In
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 py-14 border-t border-amber-200/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <AppLogo className="h-10 w-10 rounded-xl" />
                <span className="font-black text-white text-lg">AptFindr PWA</span>
              </div>
              <p className="text-slate-400">
                Progressive Web Application for verified apartment listings and smart apartment analytics in La Paz,
                Iloilo City.
              </p>
            </div>

            <div>
              <h4 className="font-black text-white mb-4">App</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/browse"
                    onClick={(e) => handleProtectedAction(e, "/browse")}
                    className="hover:text-amber-400 transition-colors"
                  >
                    Browse
                  </Link>
                </li>
                <li>
                  <Link
                    to="/favorites"
                    onClick={(e) => handleProtectedAction(e, "/favorites")}
                    className="hover:text-amber-400 transition-colors"
                  >
                    Favorites
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-amber-400 transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-amber-400 transition-colors">
                    Log In
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-black text-white mb-4">Documentation</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/flowchart" className="hover:text-amber-400 transition-colors">
                    Platform flowchart
                  </Link>
                </li>
                <li>
                  <Link to="/design-guide" className="hover:text-amber-400 transition-colors">
                    Design guide
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 text-center text-slate-500 text-sm">
            <p>2026 AptFindr PWA - La Paz, Iloilo City - Academic thesis project</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
