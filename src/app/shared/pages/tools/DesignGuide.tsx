import { Badge } from "@/app/shared/components/ui/badge";
import { Button } from "@/app/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/shared/components/ui/tabs";
import {
  ArrowLeft,
  Bell,
  Building2,
  Database,
  FileWarning,
  GitBranch,
  Heart,
  Home,
  LayoutDashboard,
  Palette,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";

const pages = [
  {
    name: "Landing",
    path: "/",
    icon: Home,
    users: ["Guest", "All"],
    description: "Public marketing entry, landing apartment preview, role CTAs, and login/signup paths.",
    features: ["Hero", "Apartment preview", "Role value props", "Responsive public layout"],
  },
  {
    name: "Login / Signup",
    path: "/login, /signup",
    icon: UserPlus,
    users: ["Guest"],
    description: "Supabase Auth entry with role profile creation and landlord verification data capture.",
    features: ["Email/password", "Role selection", "Landlord permit fields", "Trusted profile sync"],
  },
  {
    name: "Tenant Browse",
    path: "/browse",
    icon: Search,
    users: ["Student", "Employee"],
    description: "Tenant discovery surface for verified, approved, published, available listings.",
    features: ["Weighted recommendations", "Price/Newest/Popular sort", "Grid + Map", "Favorites", "View counts"],
  },
  {
    name: "Apartment Detail",
    path: "/apartment/:id",
    icon: Building2,
    users: ["Student", "Employee", "Landlord owner", "Admin"],
    description: "Listing detail with rooms, gallery, map, reports, favorite actions, and owner edit entry.",
    features: ["Room gallery", "Availability", "Map", "Favorite/report", "Owner-only edit"],
  },
  {
    name: "Tenant Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    users: ["Student", "Employee"],
    description: "Tenant home for favorites, suggested listings, popular listings, recent apartments, reports, help, and settings.",
    features: ["Suggested", "Popular", "Favorites", "Report form", "Saved preferences"],
  },
  {
    name: "Landlord Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    users: ["Landlord"],
    description: "Owner workspace for properties, rooms, activity, reports, appeals, notifications, profile, and support.",
    features: ["My Properties", "Room management", "Activity metrics", "Appeals", "Notifications"],
  },
  {
    name: "Landlord Market Overview",
    path: "/browse",
    icon: TrendingUp,
    users: ["Landlord"],
    description: "Market-facing browse page for public verified listings, excluding edit access to other owners' apartments.",
    features: ["Top performing", "Public cards", "Views/saves", "Filters", "No cross-owner management"],
  },
  {
    name: "Admin Dashboard",
    path: "/dashboard, /admin",
    icon: Shield,
    users: ["Admin"],
    description: "Platform management console for users, landlords, apartment inspections, reports, appeals, and audit activity.",
    features: ["Landlord verification", "Apartment approval", "Publish/unpublish", "Reports", "Appeals"],
  },
  {
    name: "Add Property",
    path: "/add-apartment",
    icon: Building2,
    users: ["Verified Landlord"],
    description: "Landlord property creation flow. New apartments enter admin approval and publication workflow.",
    features: ["Images", "Location picker", "Rooms", "Amenities", "Draft recovery"],
  },
  {
    name: "Manage Rooms",
    path: "/landlord/properties/:id/rooms",
    icon: SlidersHorizontal,
    users: ["Landlord owner"],
    description: "Owner-only room CRUD, status updates, room pricing, occupancy, and room images.",
    features: ["Room status", "Rent", "Occupants", "Images", "Owner permissions"],
  },
  {
    name: "Favorites",
    path: "/favorites",
    icon: Heart,
    users: ["Student", "Employee"],
    description: "Saved tenant-visible listings with sorting and quick access back to details.",
    features: ["Saved listings", "Availability filter", "Sort", "Remove favorite"],
  },
  {
    name: "Settings",
    path: "/settings, /dashboard?section=settings",
    icon: Settings,
    users: ["All roles"],
    description: "Role-aware account profile, notifications, security, tenant preferences, and landlord business settings.",
    features: ["Profile", "Alerts", "Tenant preferences", "Landlord business profile", "Security"],
  },
];

const components = [
  {
    name: "ApartmentCard",
    description: "Shared listing card used for tenant suggestions, popular lists, favorites, and dashboard surfaces.",
    notes: ["Uses real apartment model", "Verified badge support", "Favorite state", "Detail navigation"],
  },
  {
    name: "MapView",
    description: "Leaflet map used by Browse, details, and location workflows.",
    notes: ["Skips invalid coordinates safely", "Groups shared coordinates", "Detail popup navigation", "OpenStreetMap tiles"],
  },
  {
    name: "LocationPicker",
    description: "Landlord/admin coordinate capture component for property forms.",
    notes: ["Geocoding state", "Manual pinning", "La Paz default center", "Coordinate validation"],
  },
  {
    name: "EditApartmentDialog",
    description: "Owner edit dialog for apartment details and room-aware fields.",
    notes: ["Owner/admin constraints", "Images", "Rooms", "Location", "Form normalization"],
  },
  {
    name: "RoomImageGallery",
    description: "Room-focused image gallery for apartment detail pages.",
    notes: ["Room selection", "Fallback images", "Tenant detail UX"],
  },
  {
    name: "Chatbot",
    description: "Role-aware project support assistant using loaded app context.",
    notes: ["Listing answers", "Role-specific guidance", "Reports/help topics", "No external mock data"],
  },
  {
    name: "EvidenceUploader / EvidenceViewer",
    description: "Report and appeal evidence upload/display helpers.",
    notes: ["Supabase storage", "Evidence count", "Admin review support"],
  },
  {
    name: "VerifiedBadge",
    description: "Consistent verified landlord/listing trust signal.",
    notes: ["Public listing cards", "Details", "Landlord market", "Admin inspection"],
  },
];

const serviceMap = [
  { area: "Auth", files: "authService.ts, AuthContext.tsx", summary: "Supabase Auth, app_users profile hydration, trusted role routing, logout cleanup." },
  { area: "Apartments", files: "apartmentsService.ts, ApartmentsContext.tsx", summary: "Apartment CRUD, row mapping, landlord verification, publication, views, favorites, rooms, images." },
  { area: "Dashboard Data", files: "dashboardSupabaseService.ts", summary: "Admin/tenant/landlord dashboard rows, preferences, reports, appeals, notifications, view aggregates." },
  { area: "Visibility", files: "listingVisibility.ts", summary: "Single client-side tenant visibility contract used by public browse surfaces." },
  { area: "Ranking", files: "rankingEngine.ts", summary: "Weighted tenant recommendations using location, budget, availability, amenities, verification, popularity, and recency." },
  { area: "Mapping", files: "mapCoordinates.ts, MapView.tsx", summary: "Coordinate validation, default La Paz center, map markers, detail popups." },
];

const designTokens = [
  { name: "Primary Orange", value: "#f97316", usage: "Primary app actions, browse controls, landlord accents" },
  { name: "Deep Sidebar", value: "#07142f / #0f172a", usage: "Role portal sidebars and dark navigation" },
  { name: "Emerald", value: "#10b981", usage: "Available, verified, success states" },
  { name: "Rose", value: "#e11d48", usage: "Reports, destructive actions, favorites" },
  { name: "Violet", value: "#7c3aed", usage: "Admin and secondary insight surfaces" },
  { name: "Slate", value: "#64748b", usage: "Body text, borders, muted metadata" },
];

const featureGroups = [
  {
    title: "Authentication & Roles",
    icon: Shield,
    items: ["Supabase Auth", "Trusted app_users role profile", "ProtectedRoute role guards", "Admin/Landlord/Tenant dashboards", "Stale role protection"],
  },
  {
    title: "Tenant Discovery",
    icon: Search,
    items: ["Tenant-visible listing filter", "Weighted recommended ranking", "Numeric price sorting", "Newest by published timestamp", "Popular by real views and saves", "Grid and Map views"],
  },
  {
    title: "Landlord Operations",
    icon: Building2,
    items: ["Add properties", "Admin approval and publication", "Manage own rooms", "Room status and pricing", "Activity metrics", "Reports and appeals"],
  },
  {
    title: "Admin Management",
    icon: FileWarning,
    items: ["Verify landlords", "Inspect apartments", "Publish/unpublish", "Review reports", "Handle appeals", "Audit activity"],
  },
  {
    title: "Performance Data",
    icon: TrendingUp,
    items: ["Database-backed apartment views", "Favorites/saves", "Top performers", "Owner activity", "Public market insights"],
  },
  {
    title: "Notifications & Support",
    icon: Bell,
    items: ["Role notifications", "Support tickets", "Report evidence", "Appeal evidence", "Status updates"],
  },
];

export function DesignGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Palette className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Design Guide</h1>
              <p className="text-xs text-slate-500">RentIloilo Apartment Finder PWA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/flowchart">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Flowchart</span>
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to App</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <section className="rounded-2xl bg-gradient-to-r from-orange-500 to-slate-900 p-8 text-white">
          <h2 className="text-3xl font-bold">Current Project Reference</h2>
          <p className="mt-2 max-w-3xl text-orange-100">
            This guide reflects the current React, Vite, Tailwind, Supabase-backed Apartment Finder implementation:
            role dashboards, public listing visibility, landlord workflows, admin inspection, tenant browse sorting,
            map views, reports, appeals, notifications, and shared services.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-white/15 px-4 py-3">
              <p className="text-2xl font-black">{pages.length}</p>
              <p className="text-xs font-semibold text-orange-100">Documented Pages</p>
            </div>
            <div className="rounded-lg bg-white/15 px-4 py-3">
              <p className="text-2xl font-black">{components.length}</p>
              <p className="text-xs font-semibold text-orange-100">Shared Components</p>
            </div>
            <div className="rounded-lg bg-white/15 px-4 py-3">
              <p className="text-2xl font-black">4</p>
              <p className="text-xs font-semibold text-orange-100">Role Types</p>
            </div>
          </div>
        </section>

        <Tabs defaultValue="pages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Application Pages</CardTitle>
                <CardDescription>Current route surfaces and role-specific behavior.</CardDescription>
              </CardHeader>
            </Card>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pages.map(({ name, path, icon: Icon, users, description, features }) => (
                <Card key={name} className="shadow-sm">
                  <CardHeader>
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{path}</code>
                    <div className="flex flex-wrap gap-1">
                      {users.map((user) => <Badge key={user} variant="secondary">{user}</Badge>)}
                    </div>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {features.map((feature) => <li key={feature}>- {feature}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="components" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Core Components</CardTitle>
                <CardDescription>Reusable app-specific pieces used across role surfaces.</CardDescription>
              </CardHeader>
            </Card>
            <div className="grid gap-5 md:grid-cols-2">
              {components.map((component) => (
                <Card key={component.name} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">{component.name}</CardTitle>
                    <CardDescription>{component.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {component.notes.map((note) => <li key={note}>- {note}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-cyan-600" />
                  Data and State Services
                </CardTitle>
                <CardDescription>Where the current project keeps business logic and Supabase reads/writes.</CardDescription>
              </CardHeader>
            </Card>
            <div className="grid gap-5 md:grid-cols-2">
              {serviceMap.map((service) => (
                <Card key={service.area} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">{service.area}</CardTitle>
                    <CardDescription>{service.files}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium leading-6 text-slate-600">{service.summary}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Visual Tokens</CardTitle>
                <CardDescription>Current dominant colors and their app usage.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {designTokens.map((token) => (
                  <div key={token.name} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <span className="h-14 w-14 shrink-0 rounded-lg border shadow-sm" style={{ backgroundColor: token.value.split(" / ")[0] }} />
                    <span>
                      <strong className="block text-sm text-slate-900">{token.name}</strong>
                      <code className="text-xs text-slate-500">{token.value}</code>
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{token.usage}</p>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Feature Matrix</CardTitle>
                <CardDescription>Current implemented capabilities grouped by product area.</CardDescription>
              </CardHeader>
            </Card>
            <div className="grid gap-5 md:grid-cols-2">
              {featureGroups.map(({ title, icon: Icon, items }) => (
                <Card key={title} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5 text-orange-600" />
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-slate-600">
                      {items.map((item) => <li key={item}>- {item}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-6 sm:flex-row">
          <p className="text-sm text-slate-500">RentIloilo Apartment Finder - Design Guide v3.0</p>
          <div className="flex items-center gap-3">
            <Link to="/flowchart">
              <Button variant="outline" size="sm">View Flowchart</Button>
            </Link>
            <Link to="/">
              <Button size="sm" className="bg-orange-500 text-white hover:bg-orange-600">
                <Home className="mr-2 h-4 w-4" />
                Back to App
              </Button>
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
