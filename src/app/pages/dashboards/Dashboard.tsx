import { useAuth } from "@/app/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { AdminDashboard } from "./AdminDashboard";
import { LandlordDashboard } from "./LandlordDashboard";
import { StudentEmployeeDashboard } from "./StudentEmployeeDashboard";

export function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-sm font-semibold text-slate-600">
        Loading your dashboard...
      </div>
    );
  }

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

  if (user?.role === "student" || user?.role === "employee") {
    return <StudentEmployeeDashboard />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-black text-slate-900">Account role unavailable</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          Your account role is missing or invalid. Please contact support before continuing.
        </p>
      </div>
    </div>
  );
}

