import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { StudentEmployeeDashboard } from "./StudentEmployeeDashboard";
import { LandlordDashboard } from "./LandlordDashboard";
import { AdminDashboard } from "./AdminDashboard";

export function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show appropriate dashboard based on role
  if (user?.role === "admin") {
    return <AdminDashboard />;
  }

  if (user?.role === "landlord") {
    return <LandlordDashboard />;
  }

  // Student or Employee dashboard
  return <StudentEmployeeDashboard />;
}

