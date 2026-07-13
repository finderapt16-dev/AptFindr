import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  preserveReturnDestination?: boolean;
  loginMessage?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  preserveReturnDestination = false,
  loginMessage,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 text-center text-slate-600">
        Checking your session...
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!preserveReturnDestination) {
      return <Navigate to="/login" replace />;
    }

    const returnDestination = `${location.pathname}${location.search}${location.hash}`;
    const loginPath = `/login?redirect=${encodeURIComponent(returnDestination)}`;

    return <Navigate to={loginPath} replace state={loginMessage ? { message: loginMessage } : undefined} />;
  }

  if (!user?.role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-black text-slate-900">Account role unavailable</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Your account role is missing or invalid. Please contact support before continuing.
          </p>
        </div>
      </div>
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
