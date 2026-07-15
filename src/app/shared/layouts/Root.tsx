import { motion, useReducedMotion } from "motion/react";
import { useLocation, useOutlet } from "react-router-dom";
import { Chatbot } from "../components/common/Chatbot";
import { Toaster } from "../components/ui/sonner";
import { ApartmentsProvider } from "../contexts/ApartmentsContext";
import { useAuth } from "../contexts/AuthContext";
import { pageTransition } from "../utils/motionPresets";

function RootContent() {
  const location = useLocation();
  const outlet = useOutlet();
  const prefersReducedMotion = useReducedMotion();
  const { user } = useAuth();
  const supportedRole = user?.role === "student" || user?.role === "employee" || user?.role === "landlord" || user?.role === "admin";
  const hideChatbot = location.pathname === "/" || location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/forgot-password" || !supportedRole;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50">
      {!prefersReducedMotion && (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <motion.div
            className="absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-orange-200/30 blur-3xl"
            animate={{ y: [0, 18, 0], x: [0, -10, 0], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-12 left-[12%] h-80 w-80 rounded-full bg-violet-200/25 blur-3xl"
            animate={{ y: [0, -16, 0], x: [0, 12, 0], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}
      <motion.main
        key={`${location.pathname}${location.search}`}
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={pageTransition}
      >
        {outlet}
      </motion.main>
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
