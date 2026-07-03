import { Outlet, useLocation } from "react-router-dom";
import { Chatbot } from "../components/common/Chatbot";
import { Toaster } from "../components/ui/sonner";
import { ApartmentsProvider } from "../contexts/ApartmentsContext";
import { useAuth } from "../contexts/AuthContext";

function RootContent() {
  const location = useLocation();
  const { user } = useAuth();
  const hideChatbot = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/forgot-password" || (user?.role !== "student" && user?.role !== "employee");

  return (
    <div className="min-h-screen bg-slate-50">
      <Outlet />
      <Toaster />
      {!hideChatbot && (
        <Chatbot
          userRole={
            user?.role === "student" ||
            user?.role === "employee" ||
            user?.role === "landlord" ||
            user?.role === "admin"
              ? user.role
              : null
          }
        />
      )}
    </div>
  );
}

export function Root() {
  return (
    <ApartmentsProvider>
      <RootContent />
    </ApartmentsProvider>
  );
}
