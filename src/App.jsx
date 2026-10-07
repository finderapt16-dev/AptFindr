import { lazy, useEffect, useState } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useLocation } from "react-router-dom";
import { AppRuntime } from "./components/AppRuntime";
import { PageLoader } from "./components/PageLoader";
import ProtectedRoute from "./auth/ProtectedRoute";
import { ApartmentsProvider } from "./contexts/ApartmentsContext";
import { Root } from "./components/Root";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { useAuth } from "./contexts/AuthContext";
import { isTenantRole } from "./services/authService";
// Public
const Landing = lazy(() => import("./landing/Landing").then((module) => ({ default: module.Landing })));
const NotFound = lazy(() => import("./landing/NotFound").then((module) => ({ default: module.NotFound })));
// Public legal documents. These are the linkable URLs that get submitted to
// Supabase (Authentication -> URL Configuration -> "Application privacy policy
// link" / "Application terms of service link"), so they are separate routes
// rather than only the in-page popup.
const PrivacyPolicyPage = lazy(() => import("./legal/PolicyPage").then((module) => ({ default: module.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import("./legal/PolicyPage").then((module) => ({ default: module.TermsOfServicePage })));
// Authentication and shared account pages
const AuthCallback = lazy(() => import("./auth/AuthCallback").then((module) => ({ default: module.AuthCallback })));
const Settings = lazy(() => import("./components/Settings").then((module) => ({ default: module.Settings })));
// Tenant
const TenantDashboard = lazy(() => import("@/tenant/Dashboard").then((module) => ({ default: module.Dashboard })));
const Apartments = lazy(() => import("./tenant/Apartments").then((module) => ({ default: module.Apartments })));
const ApartmentDetail = lazy(() => import("./tenant/ApartmentDetails").then((module) => ({ default: module.ApartmentDetails })));
const Favorites = lazy(() => import("./tenant/Favorites").then((module) => ({ default: module.Favorites })));
// Landlord
const LandlordDashboard = lazy(() => import("@/landlord/LandlordDashboard").then((module) => ({ default: module.LandlordDashboard })));
const AddApartment = lazy(() => import("./landlord/AddApartment").then((module) => ({ default: module.AddApartment })));
const EditProperty = lazy(() => import("./landlord/EditProperty").then((module) => ({ default: module.EditProperty })));
const ManageRooms = lazy(() => import("./landlord/ManageRooms").then((module) => ({ default: module.ManageRooms })));
// Admin
const AdminDashboard = lazy(() => import("@/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const AdminApartmentDetail = lazy(() => import("./admin/AdminApartmentDetail").then((module) => ({ default: module.AdminApartmentDetail })));
const APARTMENT_LOGIN_MESSAGE = "Please sign in or create an account to view apartment details.";

function dashboardPathForRole(role) {
    if (role === "admin") return "/admin";
    return role === "landlord" ? "/landlord/dashboard" : "/browse";
}

function TenantDashboardRoute() {
    const location = useLocation();
    const section = new URLSearchParams(location.search).get("section");
    if (!section || section === "overview") return <Navigate to="/browse" replace />;
    return <PageLoader><TenantDashboard /></PageLoader>;
}

// Old saved links can still use /dashboard, but it is no longer a page that
// chooses a dashboard after it loads.
function LegacyDashboardRedirect() {
    const { user } = useAuth();
    const location = useLocation();
    const destination = dashboardPathForRole(user?.role);
    return <Navigate to={isTenantRole(user?.role) ? destination : `${destination}${location.search}`} replace />;
}

function PublicLandingRoute() {
    const { user, isLoading } = useAuth();
    const location = useLocation();
    // Only the first session check may replace the page with the loader. Later
    // loading phases (signing in, refreshing the profile) must keep it mounted:
    // swapping it out would reset the sign-in form and lose its error message.
    const [initialCheckDone, setInitialCheckDone] = useState(!isLoading);
    useEffect(() => {
        if (!isLoading) setInitialCheckDone(true);
    }, [isLoading]);
    if (location.pathname === "/login" && isLoading && !initialCheckDone) {
        return <div className="auth-status-page auth-session-loading">Checking your session...</div>;
    }
    if (location.pathname === "/login" && user?.role) {
        const destination = dashboardPathForRole(user.role);
        return <Navigate to={destination} replace />;
    }
    return (<ApartmentsProvider>
      <PageLoader><Landing /></PageLoader>
    </ApartmentsProvider>);
}
export const router = createBrowserRouter([
    // Public authentication forms share the landing-page modal presentation.
    { path: "/", element: <PublicLandingRoute />, errorElement: <RouteErrorBoundary /> },
    // Keep direct login links on the landing page so they use the same modal
    // experience as the Sign In button on the home screen.
    { path: "/login", element: <PublicLandingRoute />, errorElement: <RouteErrorBoundary /> },
    { path: "/signup", element: <PublicLandingRoute />, errorElement: <RouteErrorBoundary /> },
    { path: "/forgot-password", element: <PublicLandingRoute />, errorElement: <RouteErrorBoundary /> },
    { path: "/reset-password", element: <PublicLandingRoute />, errorElement: <RouteErrorBoundary /> },
    { path: "/auth/callback", element: <PageLoader><AuthCallback /></PageLoader>, errorElement: <RouteErrorBoundary /> },
    // Public legal documents. Kept outside the Root layout so they stay
    // readable and shareable without the app shell, and work with no session.
    { path: "/privacy-policy", element: <PageLoader><PrivacyPolicyPage /></PageLoader>, errorElement: <RouteErrorBoundary /> },
    { path: "/terms-of-service", element: <PageLoader><TermsOfServicePage /></PageLoader>, errorElement: <RouteErrorBoundary /> },
    // Main app wrapped in Root layout
    {
        path: "/",
        element: <Root />,
        errorElement: <RouteErrorBoundary />,
        children: [
            // Tenant browsing (including the existing landlord access).
            { path: "browse", element: <ProtectedRoute allowedRoles={["tenant", "landlord"]} preserveReturnDestination loginMessage={APARTMENT_LOGIN_MESSAGE}><PageLoader><Apartments /></PageLoader></ProtectedRoute> },
            { path: "apartment/:id", element: <ProtectedRoute preserveReturnDestination loginMessage={APARTMENT_LOGIN_MESSAGE}><PageLoader><ApartmentDetail /></PageLoader></ProtectedRoute> },
            // Landlord market details.
            { path: "landlord/market/:id", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><ApartmentDetail /></PageLoader></ProtectedRoute> },
            // Admin apartment review.
            { path: "admin/apartment/:id", element: <ProtectedRoute allowedRoles={["admin"]}><PageLoader><AdminApartmentDetail /></PageLoader></ProtectedRoute> },
            // Landlord property management.
            { path: "add-apartment", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><AddApartment /></PageLoader></ProtectedRoute> },
            { path: "landlord/properties/:id/edit", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><EditProperty /></PageLoader></ProtectedRoute> },
            { path: "landlord/properties/:id/rooms/:roomId/edit", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><ManageRooms /></PageLoader></ProtectedRoute> },
            { path: "landlord/properties/:id/rooms", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><ManageRooms /></PageLoader></ProtectedRoute> },
            // Tenant favorites and shared account settings.
            { path: "favorites", element: <ProtectedRoute allowedRoles={["tenant"]}><PageLoader><Favorites /></PageLoader></ProtectedRoute> },
            { path: "settings", element: <ProtectedRoute><PageLoader><Settings /></PageLoader></ProtectedRoute> },
            // Role dashboards have separate URLs. Their sections remain query
            // parameters, not new URLs.
            // Tenant: overview, suggested, popular, favorites, notifications, report, help, settings.
            // Landlord: overview, properties, activity, notifications, settings, help.
            // Admin: overview, notifications, landlords, apartments, reports, appeals, admininfo.
            { path: "tenant/dashboard", element: <ProtectedRoute allowedRoles={["tenant"]}><TenantDashboardRoute /></ProtectedRoute> },
            { path: "landlord/dashboard", element: <ProtectedRoute allowedRoles={["landlord"]}><PageLoader><LandlordDashboard /></PageLoader></ProtectedRoute> },
            { path: "admin", element: <ProtectedRoute allowedRoles={["admin"]}><PageLoader><AdminDashboard /></PageLoader></ProtectedRoute> },
            // Compatibility for bookmarks and older internal links. This renders
            // no dashboard page; it immediately routes to the role-specific one.
            { path: "dashboard", element: <ProtectedRoute><LegacyDashboardRedirect /></ProtectedRoute> },
            { path: "*", element: <PageLoader><NotFound /></PageLoader> },
        ],
    },
]);
export default function App() {
    return <AppRuntime><RouterProvider router={router}/></AppRuntime>;
}
