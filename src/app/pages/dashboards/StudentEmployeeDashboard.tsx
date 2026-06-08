import { useState, useMemo, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { Settings as AccountSettings } from "@/app/pages/settings/Settings";
import { useApartmentsContext } from "@/app/contexts/ApartmentsContext";
import { useFavorites } from "@/app/hooks/useFavorites";
import { createReport, updateUserProfile } from "@/app/services/dashboardSupabaseService";
import { ApartmentCard } from "@/app/components/common/ApartmentCard";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import {
  Sparkles,
  TrendingUp,
  Heart,
  MapPin,
  Clock,
  LayoutDashboard,
  Search,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  User,
  Shield,
  CreditCard,
  Trash2,
  CheckCircle2,
  XCircle,
  BookOpen,
  MessageCircle,
  Send,
} from "lucide-react";

const NAV_MAIN = [
  { icon: LayoutDashboard, label: "Overview",    section: "overview",   isLink: false },
  { icon: Heart,           label: "My Favorites",section: "favorites",  isLink: false },
  { icon: Sparkles,        label: "Suggested",   section: "suggested",  isLink: false },
  { icon: TrendingUp,      label: "Popular",     section: "popular",    isLink: false },
];

const NAV_BROWSE = [
  { icon: Search, label: "Browse All",     href: "/browse", isLink: true },
  { icon: Clock,  label: "Recently Added", section: "recent", isLink: false },
];

const NAV_ACCOUNT = [
  { icon: Settings,      label: "Settings",           section: "settings",  isLink: false },
  { icon: AlertTriangle, label: "Report a Problem",   section: "report",  isLink: false },
  { icon: HelpCircle,    label: "Help",               section: "help",    isLink: false },
];

export function StudentEmployeeDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { favorites: favoriteIds } = useFavorites();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Report form state ────────────────────────────────────────────────────
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportForm, setReportForm] = useState({
    apartment: "",
    issueType: "",
    severity: "",
    tags: [] as string[],
    details: "",
    contact: "",
  });

  // ── Help & support state ────────────────────────────────────────────────
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportForm, setSupportForm] = useState({
    topic: "",
    message: "",
    contact: user?.email || "",
  });

  // ── Settings state ───────────────────────────────────────────────────────
  const [name, setName]                       = useState(user?.name || "");
  const [email, setEmail]                     = useState(user?.email || "");
  const [mobile, setMobile]                   = useState(user?.mobileNumber || "");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inquiryAlerts, setInquiryAlerts]     = useState(true);
  const [bookingAlerts, setBookingAlerts]     = useState(true);
  const [universityName, setUniversityName]   = useState("");
  const [studentId, setStudentId]             = useState("");
  const [workplaceInfo, setWorkplaceInfo]     = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { apartments: allApartments } = useApartmentsContext();

  const publishedApartments = useMemo(() => {
    return allApartments.filter((apt) => apt.isPublished !== false);
  }, [allApartments]);

  const suggestedApartments = publishedApartments
    .filter((apt) => apt.petFriendly || apt.parking)
    .sort((a, b) => a.price - b.price)
    .slice(0, 6);

  const popularApartments = publishedApartments.filter((apt) => apt.furnished).slice(0, 6);

  const recentApartments = publishedApartments
    .sort((a, b) => new Date(b.availableDate).getTime() - new Date(a.availableDate).getTime())
    .slice(0, 6);

  const favoriteApartments = publishedApartments.filter((apt) => favoriteIds.includes(apt.id));

  const handleLogout = () => { logout?.(); navigate("/"); };

  const toggleReportTag = (tag: string) =>
    setReportForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));

  const handleReportSubmit = async () => {
    if (!reportForm.apartment || !reportForm.issueType) return;

    if (!reportForm.details.trim()) {
      toast.error("Please describe the problem before submitting.");
      return;
    }

    if (!user?.id) {
      toast.error("Please sign in to submit a report.");
      return;
    }

    const apartment = allApartments.find((apt) => apt.id === reportForm.apartment);

    try {
      const createdReport = await createReport({
        reporter_id: user.id,
        reporter_role: user.role === "student" || user.role === "employee" ? user.role : "student",
        apartment_id: reportForm.apartment,
        issue_type: reportForm.issueType,
        severity: reportForm.severity || "med",
        tags: reportForm.tags,
        details: reportForm.details.trim(),
        contact: reportForm.contact.trim() || user.email,
      });

      if (!createdReport) {
        throw new Error("Unable to save report.");
      }

      const existingReports = JSON.parse(localStorage.getItem("apartmentReports") || "[]");
      existingReports.unshift({
        ...createdReport,
        reporter: user.name || "Guest",
        role: createdReport.reporter_role,
        apartment: apartment?.title || "Unknown apartment",
        apartmentId: createdReport.apartment_id,
        issueType: createdReport.issue_type,
        submittedAt: createdReport.submitted_at,
      });
      localStorage.setItem("apartmentReports", JSON.stringify(existingReports));

      setReportSubmitted(true);
      toast.success("Report submitted successfully. Admin will review it.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit report.";
      toast.error(message);
    }
  };

  const resetReport = () => {
    setReportSubmitted(false);
    setReportForm({ apartment: "", issueType: "", severity: "", tags: [], details: "", contact: "" });
  };

  const handleSupportSubmit = () => {
    if (!supportForm.topic || !supportForm.message.trim()) {
      toast.error("Please choose a topic and describe your concern.");
      return;
    }

    const tickets = JSON.parse(localStorage.getItem("supportTickets") || "[]");
    tickets.unshift({
      id: Date.now().toString(),
      userId: user?.id,
      name: user?.name || "Guest",
      email: user?.email || "",
      role: user?.role || "renter",
      topic: supportForm.topic,
      message: supportForm.message.trim(),
      contact: supportForm.contact.trim(),
      status: "open",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("supportTickets", JSON.stringify(tickets));
    setSupportSubmitted(true);
    setSupportForm({ topic: "", message: "", contact: user?.email || "" });
    toast.success("Support request sent!");
  };

  const handleUpdateProfile = async () => {
    if (user) {
      try {
        await updateUser(user.id, { name, email, mobileNumber: mobile });
        const synced = await updateUserProfile({
          id: user.id,
          email,
          name,
          role: user.role,
          mobile,
        });

        if (!synced) {
          throw new Error("Unable to sync profile information.");
        }

        toast.success("Profile updated successfully!");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update profile.";
        toast.error(message);
      }
    }
  };

  const handleUpdatePassword = () => {
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match!"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters!"); return; }
    toast.success("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure? This action cannot be undone.")) {
      toast.success("Account deletion initiated. You will be logged out.");
      setTimeout(() => handleLogout(), 1500);
    }
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-white text-lg tracking-tight">RentIloilo</span>
        </div>
        <p className="text-white/30 text-xs font-medium mt-1 ml-10">
          {user?.role === "student" ? "Student Portal" : "Employee Portal"}
        </p>
      </div>

      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-3 py-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 font-black text-white text-sm shadow overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              user?.name?.[0]?.toUpperCase() ?? "U"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm truncate">{user?.name ?? "User"}</p>
            <p className="text-white/40 text-xs truncate">{user?.email ?? ""}</p>
          </div>
        </div>
      </div>

      <nav className="px-3 pt-4 pb-2">
        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Main</p>
        <div className="space-y-0.5">
          {NAV_MAIN.map(({ icon: Icon, label, section }) => (
            <button
              key={section}
              onClick={() => { setActiveSection(section); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeSection === section
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-900/30"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {label === "My Favorites" && favoriteIds.length > 0 && (
                <span className="ml-auto h-5 px-1.5 bg-pink-500 rounded-full text-white text-[10px] font-black flex items-center justify-center min-w-[20px]">
                  {favoriteIds.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <nav className="px-3 pt-3 pb-2 border-t border-white/10 mt-2">
        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Browse</p>
        <div className="space-y-0.5">
          {NAV_BROWSE.map(({ icon: Icon, label, href, section, isLink }) =>
            isLink && href ? (
              label === "Browse All" ? (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-900/30 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            ) : (
              <button
                key={section}
                onClick={() => { setActiveSection(section!); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeSection === section
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-900/30"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            )
          )}
        </div>
      </nav>

      <nav className="px-3 pt-3 pb-2 border-t border-white/10 mt-2">
        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest px-3 mb-2">Account</p>
        <div className="space-y-0.5">
          {NAV_ACCOUNT.map(({ icon: Icon, label, section, isLink }) =>
            !isLink ? (
              <button
                key={section}
                onClick={() => { setActiveSection(section!); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeSection === section
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-900/30"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ) : null
          )}
        </div>
      </nav>

      <div className="flex-1" />

      <div className="px-4 py-4 border-t border-white/10 mt-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log Out
        </button>
      </div>
    </div>
  );

  // ── Section: Overview ────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <div className="inline-block mb-3 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-full shadow-sm">
          <span className="text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-2 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Your Dashboard
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
          Welcome back, <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{user?.name}</span>! 👋
        </h1>
        <p className="text-slate-700 text-lg font-medium">
          {user?.role === "student"
            ? "Find the perfect place for your studies in La Paz, Iloilo City"
            : "Discover your ideal home near your workplace"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-amber-100/50 bg-white/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:transform hover:-translate-y-1">
          <CardContent className="p-6 bg-gradient-to-br from-white to-pink-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1 font-semibold">Your Favorites</p>
                <p className="text-4xl font-black bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">{favoriteIds.length}</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                <Heart className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-100/50 bg-white/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:transform hover:-translate-y-1">
          <CardContent className="p-6 bg-gradient-to-br from-white to-orange-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1 font-semibold">Available Now</p>
                <p className="text-4xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {allApartments.filter((apt) => new Date(apt.availableDate) <= new Date()).length}
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                <Clock className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-100/50 bg-white/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:transform hover:-translate-y-1">
          <CardContent className="p-6 bg-gradient-to-br from-white to-amber-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1 font-semibold">In La Paz Area</p>
                <p className="text-4xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{allApartments.length}</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <MapPin className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveSection("suggested")}
          className="p-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl hover:shadow-2xl transition-all hover:transform hover:-translate-y-1 text-left group"
        >
          <Sparkles className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black mb-1">Suggested for You</h3>
          <p className="text-amber-100 text-sm font-medium">View personalized apartment recommendations</p>
          <div className="mt-3 flex items-center gap-1 text-sm font-bold">Explore <ChevronRight className="h-4 w-4" /></div>
        </button>

        <button
          onClick={() => setActiveSection("popular")}
          className="p-6 rounded-2xl bg-white/90 backdrop-blur-xl border-2 border-amber-100 shadow-xl hover:shadow-2xl transition-all hover:transform hover:-translate-y-1 text-left group"
        >
          <TrendingUp className="h-8 w-8 mb-3 text-orange-600 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black mb-1 text-slate-900">Most Popular</h3>
          <p className="text-slate-600 text-sm font-medium">Browse trending apartments in La Paz</p>
          <div className="mt-3 flex items-center gap-1 text-sm font-bold text-orange-600">Explore <ChevronRight className="h-4 w-4" /></div>
        </button>

        <button
          onClick={() => setActiveSection("recent")}
          className="p-6 rounded-2xl bg-white/90 backdrop-blur-xl border-2 border-amber-100 shadow-xl hover:shadow-2xl transition-all hover:transform hover:-translate-y-1 text-left group"
        >
          <Clock className="h-8 w-8 mb-3 text-rose-600 group-hover:scale-110 transition-transform" />
          <h3 className="text-2xl font-black mb-1 text-slate-900">Recently Added</h3>
          <p className="text-slate-600 text-sm font-medium">Check out the latest listings</p>
          <div className="mt-3 flex items-center gap-1 text-sm font-bold text-rose-600">Explore <ChevronRight className="h-4 w-4" /></div>
        </button>
      </div>
    </div>
  );

  // ── Section: Favorites ───────────────────────────────────────────────────
  const renderFavorites = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-900">Your Favorites</h2>
      </div>
      <p className="text-slate-700 text-lg font-medium">Apartments you've saved for later</p>
      {favoriteApartments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteApartments.map((apartment) => (
            <ApartmentCard key={apartment.id} apartment={apartment} />
          ))}
        </div>
      ) : (
        <Card className="border-2 border-dashed border-amber-300 bg-white/80 backdrop-blur-xl shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black text-slate-900">No Favorites Yet</CardTitle>
            <CardDescription className="text-slate-700 font-medium text-base mt-2">
              Start browsing and click the heart icon to save apartments you like!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-8">
            <Link to="/browse">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all font-bold rounded-xl px-8 py-6 text-lg">
                Browse Apartments
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ── Section: Suggested ───────────────────────────────────────────────────
  const renderSuggested = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900">Suggested for You</h2>
          </div>
          <p className="text-slate-700 text-lg font-medium mt-2">
            {user?.role === "student"
              ? "Affordable apartments perfect for students, with parking and pet-friendly options"
              : "Great value apartments with amenities ideal for working professionals"}
          </p>
        </div>
        <Link to="/browse">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all font-bold rounded-xl">
            View All
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suggestedApartments.map((apartment) => (
          <div key={apartment.id} className="relative">
            <Badge className="absolute top-6 left-6 z-10 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg text-white font-bold">
              ✨ Suggested
            </Badge>
            <ApartmentCard apartment={apartment} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Section: Popular ─────────────────────────────────────────────────────
  const renderPopular = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900">Most Popular</h2>
          </div>
          <p className="text-slate-700 text-lg font-medium mt-2">
            Furnished apartments that are trending among renters in La Paz
          </p>
        </div>
        <Link to="/browse">
          <Button className="bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:from-orange-600 hover:to-rose-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all font-bold rounded-xl">
            View All
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {popularApartments.map((apartment) => (
          <div key={apartment.id} className="relative">
            <Badge className="absolute top-6 left-6 z-10 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 shadow-lg text-white font-bold">
              🔥 Popular
            </Badge>
            <ApartmentCard apartment={apartment} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Section: Recent ──────────────────────────────────────────────────────
  const renderRecent = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900">Recently Added</h2>
          </div>
          <p className="text-slate-700 text-lg font-medium mt-2">Fresh listings just added to our platform</p>
        </div>
        <Link to="/browse">
          <Button className="bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all font-bold rounded-xl">
            View All
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentApartments.map((apartment) => (
          <div key={apartment.id} className="relative">
            <Badge className="absolute top-6 left-6 z-10 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg text-white font-bold">
              ✨ New
            </Badge>
            <ApartmentCard apartment={apartment} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Section: Report ──────────────────────────────────────────────────────
  const TAG_OPTIONS = ["Wrong price", "Misleading photos", "Wrong address", "Already taken", "Fake listing", "No contact"];
  const SEVERITY_OPTIONS = [
    { key: "low",  label: "Low",          style: "bg-green-100 border-green-400 text-green-800" },
    { key: "med",  label: "Medium",       style: "bg-amber-100 border-amber-400 text-amber-800" },
    { key: "high", label: "High – urgent",style: "bg-red-100 border-red-400 text-red-800" },
  ];

  const renderReport = () => (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-900">Report a Problem</h2>
      </div>
      <p className="text-slate-700 text-lg font-medium">Let us know about any issues you encountered with an apartment listing.</p>

      {reportSubmitted ? (
        <Card className="border-2 border-green-200 bg-white/90 backdrop-blur-xl shadow-xl">
          <CardContent className="flex flex-col items-center gap-4 py-14">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center shadow-md">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Report Submitted</h3>
            <p className="text-slate-500 text-center text-sm font-medium max-w-xs">
              Thank you for helping us keep listings accurate. Our team will review your report within 1–2 business days.
            </p>
            <Button
              onClick={resetReport}
              className="mt-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 font-bold rounded-xl shadow-md"
            >
              Submit Another Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-amber-100/50 bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl">
          <CardContent className="pt-6 space-y-5">

            {/* Apartment + Issue Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Apartment *</label>
                <select
                  value={reportForm.apartment}
                  onChange={(e) => setReportForm((f) => ({ ...f, apartment: e.target.value }))}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">Select an apartment...</option>
                  {allApartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>{apt.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Issue Type *</label>
                <select
                  value={reportForm.issueType}
                  onChange={(e) => setReportForm((f) => ({ ...f, issueType: e.target.value }))}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">Select a category...</option>
                  {["Inaccurate information","Photos don't match","Unavailable / already rented","Scam / fraudulent listing","Unresponsive landlord","Safety concern","Other"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Severity</label>
              <div className="flex gap-2 flex-wrap">
                {SEVERITY_OPTIONS.map(({ key, label, style }) => (
                  <button
                    key={key}
                    onClick={() => setReportForm((f) => ({ ...f, severity: f.severity === key ? "" : key }))}
                    className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition-all ${
                      reportForm.severity === key ? style : "border-amber-100 bg-white text-slate-500 hover:border-amber-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">What happened? (optional tags)</label>
              <div className="flex gap-2 flex-wrap">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleReportTag(tag)}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all ${
                      reportForm.tags.includes(tag)
                        ? "bg-amber-100 border-amber-400 text-amber-800"
                        : "border-amber-100 bg-white text-slate-500 hover:border-amber-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Describe the Problem</label>
                <span className="text-xs text-slate-400 font-medium">{reportForm.details.length}/500</span>
              </div>
              <textarea
                rows={4}
                maxLength={500}
                value={reportForm.details}
                onChange={(e) => setReportForm((f) => ({ ...f, details: e.target.value }))}
                placeholder="Please describe what you experienced in as much detail as possible..."
                className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Your Contact (Optional)</label>
              <input
                type="text"
                value={reportForm.contact}
                onChange={(e) => setReportForm((f) => ({ ...f, contact: e.target.value }))}
                placeholder="Email or phone number"
                className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleReportSubmit}
                disabled={!reportForm.apartment || !reportForm.issueType}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Report
              </Button>
              <Button
                variant="outline"
                onClick={resetReport}
                className="flex-1 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 font-bold"
              >
                Clear Form
              </Button>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );

  // ── Section: Settings ────────────────────────────────────────────────────
  const renderSettings = () => <AccountSettings embedded />;

  const renderLegacySettings = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Settings className="h-4 w-4 text-amber-600" />
        <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">Settings</h2>
      </div>

      <Tabs defaultValue="profile" className="space-y-5">
        <TabsList className="grid w-full grid-cols-4 bg-white/80 border border-amber-100 rounded-2xl p-1 shadow-sm">
          <TabsTrigger value="profile" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
            <User className="h-3.5 w-3.5 mr-1.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
            <Bell className="h-3.5 w-3.5 mr-1.5" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="academic" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
            <User className="h-3.5 w-3.5 mr-1.5" /> {user?.role === "student" ? "Academic" : "Work"}
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-xs">
            <Shield className="h-3.5 w-3.5 mr-1.5" /> Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-amber-100 shadow-lg bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-amber-50 pb-4">
              <CardTitle className="text-slate-900 font-black">Profile Information</CardTitle>
              <CardDescription>Update your personal information and account details</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
                  {user?.name?.charAt(0).toUpperCase() ?? "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900">{user?.name}</h3>
                  <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                  <Badge className="mt-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs capitalize">
                    {user?.role}
                  </Badge>
                </div>
              </div>
              <Separator className="bg-amber-50" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Full Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="rounded-xl border-amber-100 focus:ring-amber-500" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Email Address *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="rounded-xl border-amber-100 focus:ring-amber-500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Mobile Number *</Label>
                <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="09XX-XXX-XXXX" className="rounded-xl border-amber-100 focus:ring-amber-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleUpdateProfile} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200">
                  Save Changes
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 font-bold">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-amber-100 shadow-lg bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-amber-50 pb-4">
              <CardTitle className="text-slate-900 font-black">Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive updates and alerts</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {[
                { id: "email-notif", label: "Email Notifications", desc: "Receive updates via email",                                            value: emailNotifications, setter: setEmailNotifications },
                { id: "inquiry",     label: "Inquiry Alerts",       desc: "Get notified when someone inquires about listings you're interested in", value: inquiryAlerts,       setter: setInquiryAlerts },
                { id: "booking",     label: "Booking Alerts",       desc: "Get notified about booking requests and confirmations",                value: bookingAlerts,       setter: setBookingAlerts },
              ].map(({ id, label, desc, value, setter }) => (
                <div key={id} className="flex items-center justify-between p-4 border border-amber-100 rounded-xl bg-amber-50/30">
                  <div>
                    <Label htmlFor={id} className="font-bold text-slate-800">{label}</Label>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                  <Switch id={id} checked={value} onCheckedChange={setter} />
                </div>
              ))}
              <Button onClick={() => toast.success("Notification preferences saved!")} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200 mt-2">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic/Work Tab */}
        <TabsContent value="academic">
          <Card className="border-amber-100 shadow-lg bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-amber-50 pb-4">
              <CardTitle className="text-slate-900 font-black">
                {user?.role === "student" ? "Academic Information" : "Work Information"}
              </CardTitle>
              <CardDescription>
                {user?.role === "student" 
                  ? "Manage your university and student details" 
                  : "Manage your workplace and employment details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {user?.role === "student" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">University / College Name</Label>
                    <Input value={universityName} onChange={(e) => setUniversityName(e.target.value)} placeholder="Your University Name" className="rounded-xl border-amber-100 focus:ring-amber-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Student ID</Label>
                    <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Your Student ID" className="rounded-xl border-amber-100 focus:ring-amber-500" />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Workplace / Company Name</Label>
                  <Input value={workplaceInfo} onChange={(e) => setWorkplaceInfo(e.target.value)} placeholder="Your Company Name" className="rounded-xl border-amber-100 focus:ring-amber-500" />
                </div>
              )}
              <Separator className="bg-amber-50" />
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">Preferences</Label>
                {[
                  { id: "notifications-pref", label: "Receive apartment recommendations based on my location" },
                  { id: "budget-pref",        label: "Save my budget preferences for faster searches" },
                ].map(({ id, label }) => (
                  <div key={id} className="flex items-center justify-between p-3 border border-amber-100 rounded-xl bg-amber-50/30">
                    <Label htmlFor={id} className="font-bold text-slate-800 text-sm">{label}</Label>
                    <Switch id={id} />
                  </div>
                ))}
              </div>
              <Button onClick={() => toast.success("Information saved!")} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200 mt-2">
                Save Information
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-4">
            <Card className="border-amber-100 shadow-lg bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-amber-50 pb-4">
                <CardTitle className="text-slate-900 font-black">Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {[
                  { id: "cur-pass",  label: "Current Password",     val: currentPassword, set: setCurrentPassword },
                  { id: "new-pass",  label: "New Password",         val: newPassword,      set: setNewPassword },
                  { id: "conf-pass", label: "Confirm New Password", val: confirmPassword,  set: setConfirmPassword },
                ].map(({ id, label, val, set }) => (
                  <div key={id} className="space-y-1.5">
                    <Label className="text-slate-700 font-bold text-xs uppercase tracking-wide">{label}</Label>
                    <Input id={id} type="password" value={val} onChange={(e) => set(e.target.value)} placeholder={`Enter ${label.toLowerCase()}`} className="rounded-xl border-amber-100 focus:ring-amber-500" />
                  </div>
                ))}
                <Button onClick={handleUpdatePassword} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-md shadow-amber-200">
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50 rounded-2xl overflow-hidden shadow-lg">
              <CardHeader className="border-b border-red-100 pb-4">
                <CardTitle className="text-red-700 font-black">Danger Zone</CardTitle>
                <CardDescription className="text-red-600">Irreversible actions that affect your account</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="p-4 border border-red-200 rounded-xl bg-red-50 flex items-start gap-4">
                  <Trash2 className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 text-sm">Delete Account</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Once you delete your account, there is no going back. Please be certain.</p>
                    <Button variant="destructive" size="sm" className="mt-3 rounded-xl font-bold" onClick={handleDeleteAccount}>
                      Delete My Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // ── Section: Help ────────────────────────────────────────────────────────
  const renderHelp = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="h-4 w-4 text-amber-600" />
          <h2 className="text-xs font-black text-amber-600 uppercase tracking-widest">Help & Support</h2>
        </div>
        <h1 className="text-3xl font-black text-slate-900">How can we help?</h1>
        <p className="text-slate-600 font-medium mt-1">Guides, safety reminders, and support for using RentIloilo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Search, title: "Browse apartments", desc: "Search, filter, and compare available places.", action: () => navigate("/browse") },
          { icon: Heart, title: "Review favorites", desc: "Return to apartments you saved earlier.", action: () => setActiveSection("favorites") },
          { icon: AlertTriangle, title: "Report listing issue", desc: "Flag wrong details, scams, or unavailable units.", action: () => setActiveSection("report") },
        ].map(({ icon: Icon, title, desc, action }) => (
          <button
            key={title}
            onClick={action}
            className="text-left p-5 rounded-2xl bg-white/90 border border-amber-100 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="font-black text-slate-900">{title}</p>
            <p className="text-sm text-slate-500 font-medium mt-1">{desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-amber-100 shadow-lg bg-white/90 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
              <BookOpen className="h-5 w-5 text-amber-600" />
              Renter Guide
            </CardTitle>
            <CardDescription>Put these inside Help so users know what to do next.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Search and filters", "Use area, budget, bedrooms, parking, pet-friendly, and furnished filters to narrow listings."],
              ["Favorites", "Tap the heart on an apartment to save it for later comparison."],
              ["Listing details", "Check rent, available date, amenities, address, photos, and landlord verification before contacting."],
              ["Saved preferences", "Update Settings > Search to make Browse open with your preferred filters."],
            ].map(([title, desc]) => (
              <div key={title} className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <p className="font-black text-sm text-slate-900">{title}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-100 shadow-lg bg-white/90 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
              <Shield className="h-5 w-5 text-amber-600" />
              Safety & Support
            </CardTitle>
            <CardDescription>Keep renter support focused on trust and listing accuracy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Before visiting", "Confirm the exact address, rent inclusions, deposit terms, and viewing schedule."],
              ["Avoid scams", "Do not send deposits before verifying the unit and landlord details."],
              ["Report problems", "Use Report a Problem for fake listings, wrong photos, wrong prices, or unavailable units."],
              ["Account help", "Use the form below for login, profile, favorites, or general app issues."],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-black text-sm text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-100 shadow-lg bg-white/90 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
            <MessageCircle className="h-5 w-5 text-amber-600" />
            Contact Support
          </CardTitle>
          <CardDescription>Submitted requests are saved locally for this prototype.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {supportSubmitted ? (
            <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-black text-slate-900">Support request received</p>
              <p className="text-sm text-slate-500 font-medium mt-1">Our team will review your concern and contact you using the details provided.</p>
              <Button
                onClick={() => setSupportSubmitted(false)}
                className="mt-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold"
              >
                Send Another Request
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Topic</Label>
                  <select
                    value={supportForm.topic}
                    onChange={(e) => setSupportForm((f) => ({ ...f, topic: e.target.value }))}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Choose a topic...</option>
                    <option value="Account or login">Account or login</option>
                    <option value="Search and filters">Search and filters</option>
                    <option value="Favorites">Favorites</option>
                    <option value="Contacting landlord">Contacting landlord</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Contact</Label>
                  <Input
                    value={supportForm.contact}
                    onChange={(e) => setSupportForm((f) => ({ ...f, contact: e.target.value }))}
                    placeholder="Email or phone number"
                    className="rounded-xl border-amber-200 bg-amber-50/30"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Message</Label>
                  <span className="text-xs text-slate-400 font-medium">{supportForm.message.length}/500</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={supportForm.message}
                  onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us what happened or what you need help with..."
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <Button
                onClick={handleSupportSubmit}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-md"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Support Request
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const sectionMap: Record<string, () => ReactElement> = {
    overview:  renderOverview,
    favorites: renderFavorites,
    suggested: renderSuggested,
    popular:   renderPopular,
    recent:    renderRecent,
    report:    renderReport,
    settings:  renderSettings,
    help:      renderHelp,
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex h-full">
        <aside className="hidden lg:flex flex-col w-60 shrink-0 h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-2xl shadow-slate-900/40">
          <SidebarContent />
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside
          className={`fixed top-0 left-0 h-full z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10"
          >
            <X className="h-4 w-4" />
          </button>
          <SidebarContent />
        </aside>

        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 lg:hidden h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-300/40 hover:from-amber-400 hover:to-orange-500 transition-all"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0 h-full overflow-y-auto">
          <main className="px-4 md:px-6 py-6 lg:pt-6 pt-16">
            {(sectionMap[activeSection] ?? renderOverview)()}
          </main>
        </div>
      </div>
    </div>
  );
}
