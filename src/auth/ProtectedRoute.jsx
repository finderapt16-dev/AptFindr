import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return (<div className="auth-status-page auth-session-loading">
        Checking your session...
      </div>);
    }
    if (!isAuthenticated) {
        // Returning to a protected browser-history entry after sign-out should
        // always recover to the public landing page, never a bare sign-in page.
        return <Navigate to="/" replace/>;
    }
    if (!user?.role) {
        return (<div className="auth-status-page">
        <div className="auth-status-card auth-role-error">
          <h1 className="auth-status-title">Account role unavailable</h1>
          <p className="auth-status-description auth-role-description">
            Your account role is missing or invalid. Please contact support before continuing.
          </p>
        </div>
      </div>);
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        const dashboardPath = user.role === "admin"
            ? "/admin"
            : user.role === "landlord"
                ? "/landlord/dashboard"
                : "/browse";
        return <Navigate to={dashboardPath} replace/>;
    }
    return <>{children}</>;
}
