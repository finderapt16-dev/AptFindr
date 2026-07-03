import { useAuth } from "@/app/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { AdminDashboard } from "./AdminDashboard";
import { LandlordDashboard } from "./LandlordDashboard";
import { StudentEmployeeDashboard } from "./StudentEmployeeDashboard";

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

