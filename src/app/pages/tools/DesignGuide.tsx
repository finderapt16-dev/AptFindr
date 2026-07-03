import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  GitBranch,
  Heart,
  Home,
  Layout,
  LayoutDashboard,
  LogIn,
  Palette,
  PlusCircle,
  Search,
  Settings,
  Shield,
  UserPlus
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function DesignGuide() {
  const [_selectedPage, setSelectedPage] = useState<string>("overview");

  const pages = [
    {
      id: "landing",
      name: "Landing Page",
      path: "/",
      description: "First impression - hero section with CTA buttons",
      icon: Layout,
      features: ["Hero Banner", "Search Bar", "Feature Highlights", "CTA Buttons"],
      userTypes: ["Guest"],
      color: "bg-purple-500"
    },
    {
      id: "login",
      name: "Login",
      path: "/login",
      description: "Authentication - email/password login",
      icon: LogIn,
      features: ["Email Input", "Password Input", "Remember Me", "Role-based Login"],
      userTypes: ["All Users"],
      color: "bg-blue-500"
    },
    {
      id: "signup",
      name: "Sign Up",
      path: "/signup",
      description: "Registration - create new account with role selection",
      icon: UserPlus,
      features: ["Role Selection", "Form Fields", "Landlord Verification", "Mobile & Permit Number"],
      userTypes: ["New Users"],
      color: "bg-green-500"
    },
    {
      id: "browse",
      name: "Browse Apartments",
      path: "/browse",
      description: "Main search page with filters and apartment listings",
      icon: Search,
      features: ["Search Bar", "Advanced Filters", "Apartment Cards", "Grid/List View"],
      userTypes: ["Student", "Employee"],
      color: "bg-indigo-500"
    },
    {
      id: "apartment-detail",
      name: "Apartment Detail",
      path: "/apartment/:id",
      description: "Detailed view of individual apartment",
      icon: Building2,
      features: ["Image Gallery", "Amenities List", "Interactive Map", "Contact Info", "Favorite Button"],
      userTypes: ["Student", "Employee"],
      color: "bg-orange-500"
    },
    {
      id: "dashboard-student",
      name: "Student/Employee Dashboard",
      path: "/dashboard",
      description: "Personal dashboard for students and employees",
      icon: LayoutDashboard,
      features: ["Quick Stats", "Saved Apartments", "Recent Views", "Quick Actions"],
      userTypes: ["Student", "Employee"],
      color: "bg-teal-500"
    },
    {
      id: "dashboard-landlord",
      name: "Landlord Dashboard",
      path: "/dashboard",
      description: "Management dashboard for landlords",
      icon: LayoutDashboard,
      features: ["Property Overview", "Add Apartment CTA", "Listing Management", "Listing Activity", "Verification Status"],
      userTypes: ["Landlord"],
      color: "bg-amber-500"
    },
    {
      id: "dashboard-admin",
      name: "Admin Dashboard",
      path: "/dashboard",
      description: "Admin panel for managing landlord verifications",
      icon: Shield,
      features: ["Landlord List", "Verify/Revoke Actions", "Verification Stats", "Permit Review"],
      userTypes: ["Admin"],
      color: "bg-purple-600"
    },
    {
      id: "add-apartment",
      name: "Add Apartment",
      path: "/add-apartment",
      description: "Form for landlords to list new apartments",
      icon: PlusCircle,
      features: ["Multi-step Form", "Image Upload", "Location Picker", "Amenity Selection", "Price Input"],
      userTypes: ["Landlord (Verified)"],
      color: "bg-rose-500"
    },
    {
      id: "favorites",
      name: "Favorites",
      path: "/favorites",
      description: "Saved apartments for students and employees",
      icon: Heart,
      features: ["Saved Listings", "Quick Actions", "Remove Favorite"],
      userTypes: ["Student", "Employee"],
      color: "bg-pink-500"
    },
    {
      id: "settings",
      name: "Settings",
      path: "/settings",
      description: "User settings and preferences",
      icon: Settings,
      features: ["Profile Tab", "Notifications", "Business Settings (Landlord)", "Security"],
      userTypes: ["All Users"],
      color: "bg-slate-500"
    },
    {
      id: "flowchart",
      name: "Flowchart",
      path: "/flowchart",
      description: "Visual representation of user flows",
      icon: Layout,
      features: ["User Journey", "Authentication Flow", "Landlord Flow", "Student Flow"],
      userTypes: ["Documentation"],
      color: "bg-cyan-500"
    }
  ];

  const components = [
    {
      name: "Header",
      description: "Navigation bar with logo, user menu, and role-based actions",
      features: ["Logo", "Navigation Links", "User Avatar", "Dropdown Menu", "Responsive Mobile Menu"]
    },
    {
      name: "ApartmentCard",
      description: "Card component for displaying apartment listings",
      features: ["Image", "Price", "Bedrooms/Bathrooms", "Amenities", "Favorite Button", "View Details Link"]
    },
    {
      name: "FilterBar",
      description: "Advanced filtering controls",
      features: ["Price Range Slider", "Bedroom Selector", "Bathroom Selector", "Amenity Checkboxes", "Apply/Reset"]
    },
    {
      name: "MapView",
      description: "Interactive map for displaying apartment locations",
      features: ["Leaflet Map", "Markers", "Popup Info", "Zoom Controls"]
    },
    {
      name: "LocationPicker",
      description: "Click-to-select location on map for landlords",
      features: ["Interactive Map", "Click to Pin", "Coordinates Display", "Confirm Location"]
    },
    {
      name: "Chatbot",
      description: "AI assistant for helping users",
      features: ["Floating Button", "Chat Interface", "Smart Responses", "Role-aware", "Typing Indicator"]
    },
    {
      name: "EditApartmentDialog",
      description: "Modal for editing apartment details",
      features: ["Form Fields", "Image Management", "Save/Cancel", "Validation"]
    }
  ];

  const designTokens = {
    colors: [
      { name: "Primary", value: "#030213", usage: "Main actions, headers" },
      { name: "Secondary", value: "#f3f3f5", usage: "Backgrounds, subtle elements" },
      { name: "Blue", value: "#2563eb", usage: "Links, info, chatbot" },
      { name: "Green", value: "#16a34a", usage: "Success states" },
      { name: "Red", value: "#dc2626", usage: "Errors, destructive actions" },
      { name: "Slate", value: "#64748b", usage: "Text, borders" }
    ],
    typography: [
      { element: "h1", size: "2xl", weight: "500", usage: "Page titles" },
      { element: "h2", size: "xl", weight: "500", usage: "Section headers" },
      { element: "h3", size: "lg", weight: "500", usage: "Card titles" },
      { element: "body", size: "base", weight: "400", usage: "Body text" },
      { element: "button", size: "base", weight: "500", usage: "Buttons, labels" }
    ],
    spacing: [
      { name: "xs", value: "0.5rem (8px)", usage: "Tight spacing" },
      { name: "sm", value: "0.75rem (12px)", usage: "Compact spacing" },
      { name: "md", value: "1rem (16px)", usage: "Default spacing" },
      { name: "lg", value: "1.5rem (24px)", usage: "Section spacing" },
      { name: "xl", value: "2rem (32px)", usage: "Large gaps" }
    ]
  };

  const userFlows = [
    {
      role: "Student/Employee",
      steps: [
        "Land on home page → Browse apartments",
        "Apply filters (price, bedrooms, amenities)",
        "View apartment details",
        "Check location on map",
        "Save to favorites",
        "Contact landlord via provided info",
        "Manage favorites in dashboard"
      ]
    },
    {
      role: "Landlord",
      steps: [
        "Sign up with permit number verification",
        "Login as verified landlord",
        "Go to dashboard",
        "Click 'Add Apartment'",
        "Fill apartment details",
        "Upload images",
        "Pin location on map",
        "Select amenities",
        "Submit listing",
        "Manage listings from dashboard"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Standalone Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Design Guide</h1>
                <p className="text-xs text-slate-500">La Paz AptFinder · PWA</p>
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
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">Design System</h2>
              <p className="text-blue-100 max-w-xl">
                Complete reference for all pages, components, design tokens, and user flows
                in the La Paz Apartment Finder PWA.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white/20 rounded-xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold">{pages.length}</p>
                <p className="text-xs text-blue-100">Pages</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold">{components.length}</p>
                <p className="text-xs text-blue-100">Components</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-blue-100">User Roles</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="pages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="design-tokens">Tokens</TabsTrigger>
            <TabsTrigger value="user-flows">User Flows</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Pages</CardTitle>
                <CardDescription>
                  Complete overview of all {pages.length} pages in the application
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pages.map((page) => {
                const Icon = page.icon;
                return (
                  <Card key={page.id} className="hover:shadow-lg transition-shadow" onClick={() => setSelectedPage(page.id)}>
                    <CardHeader>
                      <div className={`w-12 h-12 ${page.color} rounded-lg flex items-center justify-center mb-3`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <CardTitle>{page.name}</CardTitle>
                      <CardDescription>{page.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Route:</p>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">{page.path}</code>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">User Types:</p>
                          <div className="flex flex-wrap gap-1">
                            {page.userTypes.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Key Features:</p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {page.features.map((feature, idx) => (
                              <li key={idx}>• {feature}</li>
                            ))}
                          </ul>
                        </div>

                        <Link to={page.path === "/apartment/:id" ? "/apartment/1" : page.path}>
                          <Button variant="outline" size="sm" className="w-full mt-3">
                            View Page
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Core Components</CardTitle>
                <CardDescription>
                  Reusable components used throughout the application
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {components.map((component) => (
                <Card key={component.name}>
                  <CardHeader>
                    <CardTitle className="text-lg">{component.name}</CardTitle>
                    <CardDescription>{component.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-slate-700 mb-2">Features:</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {component.features.map((feature, idx) => (
                        <li key={idx}>• {feature}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Design Tokens Tab */}
          <TabsContent value="design-tokens" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Design Tokens</CardTitle>
                <CardDescription>
                  Consistent design system tokens for colors, typography, and spacing
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Color Palette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {designTokens.colors.map((color) => (
                    <div key={color.name} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div
                        className="w-16 h-16 rounded-lg border shadow-sm flex-shrink-0"
                        style={{ backgroundColor: color.value }}
                      />
                      <div>
                        <p className="font-medium text-slate-900">{color.name}</p>
                        <p className="text-xs text-slate-600 font-mono">{color.value}</p>
                        <p className="text-xs text-slate-500 mt-1">{color.usage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Typography */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Typography</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {designTokens.typography.map((typo) => (
                    <div key={typo.element} className="flex items-baseline justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{typo.element}</p>
                        <p className="text-sm text-slate-600">Size: {typo.size} | Weight: {typo.weight}</p>
                        <p className="text-xs text-slate-500 mt-1">{typo.usage}</p>
                      </div>
                      <div className={`text-${typo.size} font-${typo.weight === "500" ? "medium" : "normal"}`}>
                        Aa
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Spacing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spacing Scale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {designTokens.spacing.map((space) => (
                    <div key={space.name} className="flex items-center gap-4">
                      <div className="w-24 flex-shrink-0">
                        <p className="font-medium text-slate-900">{space.name}</p>
                        <p className="text-xs text-slate-600">{space.value}</p>
                      </div>
                      <div className="flex-1 h-8 bg-blue-500 rounded" style={{ width: space.value }} />
                      <p className="text-sm text-slate-600 w-40 flex-shrink-0">{space.usage}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Flows Tab */}
          <TabsContent value="user-flows" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Flows</CardTitle>
                <CardDescription>
                  Step-by-step user journeys for different roles
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userFlows.map((flow) => (
                <Card key={flow.role}>
                  <CardHeader>
                    <CardTitle className="text-lg">{flow.role} Journey</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {flow.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {idx + 1}
                          </div>
                          <p className="text-sm text-slate-700 pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Link to flowchart */}
            <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
              <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
                <GitBranch className="h-8 w-8 text-blue-500" />
                <p className="text-slate-700 font-medium">Want a visual overview?</p>
                <p className="text-sm text-slate-500">View the full platform flowchart with interactive SVG diagram</p>
                <Link to="/flowchart">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Open Flowchart
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Features</CardTitle>
                <CardDescription>
                  Comprehensive feature list organized by category
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🔐 Authentication & Authorization</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li>• Multi-role system (Student, Employee, Landlord)</li>
                    <li>• Email/password authentication</li>
                    <li>• Landlord verification (mobile + permit number)</li>
                    <li>• Role-based dashboard routing</li>
                    <li>• Secure session management</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🔍 Search & Discovery</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li>• Advanced filtering (price, beds, baths, amenities)</li>
                    <li>• Search functionality</li>
                    <li>• Grid and list views</li>
                    <li>• Real-time filter updates</li>
                    <li>• Apartment cards with key info</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🏠 Listing Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li>• Add apartment form (landlords only)</li>
                    <li>• Image upload (multiple images)</li>
                    <li>• Interactive location picker</li>
                    <li>• Amenity selection</li>
                    <li>• Edit existing listings</li>
                    <li>• Delete listings</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🗺️ Location Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li>• Interactive Leaflet maps</li>
                    <li>• Click-to-pin location (landlords)</li>
                    <li>• Map view on apartment details</li>
                    <li>• OpenStreetMap integration</li>
                    <li>• Coordinates display</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💬 AI Chatbot</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li>• Floating chat button</li>
                    <li>• Intelligent responses</li>
                    <li>• Role-aware suggestions</li>
                    <li>• Help with finding apartments</li>
                    <li>• Platform guidance</li>
                    <li>• Typing indicators</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">⭐ User Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li>• Favorites/Save apartments</li>
                    <li>• Personal dashboard</li>
                    <li>• Settings page (profile, notifications, security)</li>
                    <li>• Business settings (landlords)</li>
                    <li>• Responsive mobile design</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📱 Progressive Web App</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li>• Mobile-first responsive design</li>
                    <li>• Fast loading performance</li>
                    <li>• Smooth transitions</li>
                    <li>• Touch-friendly interface</li>
                    <li>• Optimized for mobile screens</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🎨 Design & UX</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li>• Consistent design system</li>
                    <li>• Tailwind CSS styling</li>
                    <li>• Shadcn/ui components</li>
                    <li>• Smooth animations</li>
                    <li>• Accessible interface</li>
                    <li>• Dark mode ready tokens</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-12 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500">La Paz AptFinder · Design Guide v1.0</p>
          <div className="flex items-center gap-3">
            <Link to="/flowchart">
              <Button variant="outline" size="sm">View Flowchart</Button>
            </Link>
            <Link to="/">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Home className="h-4 w-4 mr-2" />
                Back to App
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

