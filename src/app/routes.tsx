import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import { Root } from "./shared/layouts/Root";
import { AdminApartmentDetail } from "./admin/pages/AdminApartmentDetail";
import { AddApartment } from "./landlord/pages/AddApartment";
import { ManageRooms } from "./landlord/pages/ManageRooms";
import { ForgotPassword } from "./public/forgot-password/ForgotPassword";
import { Landing } from "./public/landing/Landing";
import { Login } from "./public/login/Login";
import { NotFound } from "./public/not-found/NotFound";
import { Signup } from "./public/signup/Signup";
import { Dashboard } from "./shared/pages/Dashboard";
import { Settings } from "./shared/pages/settings/Settings";
import { DesignGuide } from "./shared/pages/tools/DesignGuide";
import { Flowchart } from "./shared/pages/tools/Flowchart";
import { ApartmentDetail } from "./tenant/pages/ApartmentDetail";
import { Favorites } from "./tenant/pages/Favorites";
import { Home } from "./tenant/pages/Home";

const APARTMENT_LOGIN_MESSAGE = "Please sign in or create an account to view apartment details.";

export const router = createBrowserRouter([
  // Standalone pages — no Root wrapper (no app Header / Chatbot)
  { path: "/flowchart", element: <Flowchart /> },
  { path: "/design-guide", element: <DesignGuide /> },

  // Main app wrapped in Root layout
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <Landing /> },
      { path: "browse", element: <ProtectedRoute preserveReturnDestination loginMessage={APARTMENT_LOGIN_MESSAGE}><Home /></ProtectedRoute> },
      { path: "apartment/:id", element: <ProtectedRoute preserveReturnDestination loginMessage={APARTMENT_LOGIN_MESSAGE}><ApartmentDetail /></ProtectedRoute> },
      { path: "admin/apartment/:id", element: <ProtectedRoute allowedRoles={["admin"]}><AdminApartmentDetail /></ProtectedRoute> },
      { path: "add-apartment", element: <ProtectedRoute allowedRoles={["landlord"]}><AddApartment /></ProtectedRoute> },
      { path: "landlord/properties/:id/rooms", element: <ProtectedRoute allowedRoles={["landlord"]}><ManageRooms /></ProtectedRoute> },
      { path: "favorites", element: <ProtectedRoute><Favorites /></ProtectedRoute> },
      { path: "settings", element: <ProtectedRoute><Settings /></ProtectedRoute> },
      { path: "dashboard", element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
      { path: "admin", element: <ProtectedRoute allowedRoles={["admin"]}><Dashboard /></ProtectedRoute> },
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
