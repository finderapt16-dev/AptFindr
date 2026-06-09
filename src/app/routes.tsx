import React from "react";
import { createBrowserRouter } from "react-router-dom";
import { Root } from "./layouts/Root";
import { Landing } from "./pages/public/Landing";
import { Home } from "./pages/apartments/Home";
import { ApartmentDetail } from "./pages/apartments/ApartmentDetail";
import { Favorites } from "./pages/apartments/Favorites";
import { Dashboard } from "./pages/dashboards/Dashboard";
import { AddApartment } from "./pages/apartments/AddApartment";
import { Flowchart } from "./pages/tools/Flowchart";
import { Settings } from "./pages/settings/Settings";
import { DesignGuide } from "./pages/tools/DesignGuide";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import ProtectedRoute from "./components/ProtectedRoute";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { NotFound } from "./pages/public/NotFound";
import { AdminApartmentDetail } from "./pages/admin/AdminApartmentDetail";

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
      { path: "browse", element: <Home /> },
      { path: "apartment/:id", element: <ApartmentDetail /> },
      { path: "admin/apartment/:id", element: <ProtectedRoute allowedRoles={["admin"]}><AdminApartmentDetail /></ProtectedRoute> },
      { path: "add-apartment", element: <ProtectedRoute allowedRoles={["landlord"]}><AddApartment /></ProtectedRoute> },
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
