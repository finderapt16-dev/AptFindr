import { Outlet, useLocation } from "react-router-dom";
import { Header } from "../components/common/Header";
import { Toaster } from "../components/ui/sonner";
import { Chatbot } from "../components/common/Chatbot";
import { useAuth } from "../contexts/AuthContext";
import { ApartmentsProvider } from "../contexts/ApartmentsContext";

function RootContent() {
  const location = useLocation();
  const { user } = useAuth();
  const hideHeader = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/browse" || location.pathname === "/add-apartment" || location.pathname === "/forgot-password" || location.pathname.startsWith("/apartment/");
  const hideChatbot = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/forgot-password" || (user?.role !== "student" && user?.role !== "employee");

  return (
    <div className="min-h-screen bg-slate-50">
      {!hideHeader && <Header />}
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
