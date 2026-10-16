import { useLocation, useOutlet } from "react-router-dom";
import { Toaster } from "./ui/sonner";
import { ApartmentsProvider } from "../contexts/ApartmentsContext";
import { useAuth } from "../contexts/AuthContext";
import { fetchMaintenanceSettings, isMaintenanceActive, subscribeToMaintenanceSettings } from "@/services/maintenanceService";
import { useEffect, useState } from "react";
import { AppLoadingScreen } from "./AppLoadingScreen";
function RootContent() {
    const location = useLocation();
    const outlet = useOutlet();
    const { user, logout } = useAuth();
    const [maintenance, setMaintenance] = useState(null);
    const [maintenanceReady, setMaintenanceReady] = useState(false);
    useEffect(() => {
        if (!user?.role || !["tenant", "landlord"].includes(user.role)) {
            setMaintenance(null);
            setMaintenanceReady(true);
            return;
        }
        let active = true;
        const load = async () => {
            try {
                const settings = await fetchMaintenanceSettings();
                if (active)
                    setMaintenance(settings.find((setting) => setting.portal === user.role) ?? null);
            }
            catch (error) {
                console.error("Unable to load portal maintenance status:", error);
                if (active)
                    setMaintenance(null);
            }
            finally {
                if (active)
                    setMaintenanceReady(true);
            }
        };
        setMaintenanceReady(false);
        void load();
        const unsubscribe = subscribeToMaintenanceSettings(load);
        const timer = window.setInterval(load, 60_000);
        return () => {
            active = false;
            window.clearInterval(timer);
            unsubscribe();
        };
    }, [user?.id, user?.role]);
    const maintenanceActive = isMaintenanceActive(maintenance);
    const returnHome = async () => {
        await logout();
        window.location.assign("/");
    };
    // Key the outlet on the path only: query strings carry the active
    // dashboard section (?section=notifications), so remounting on them would
    // tear down every screen on each section switch, resetting section state
    // and refetching all dashboard data.
    return (<div className="app-root">
      {(<div className="app-root-ambient">
          <div className="app-root-orb app-root-orb-top"/>
          <div className="app-root-orb app-root-orb-bottom"/>
        </div>)}
      <main key={location.pathname}>
        {!maintenanceReady ? <AppLoadingScreen label="Checking portal availability" detail="Confirming that this portal is ready to use."/> : maintenanceActive ? <div className="maintenance-page"><section className="maintenance-card"><img className="maintenance-wordmark" src="/aptfindr-wordmark.png?v=2" alt="AptFindr"/><h1 className="maintenance-title">{maintenance.title || "Under Maintenance"}</h1><p className="maintenance-message">{maintenance.message || "We're currently performing scheduled maintenance to improve your experience."}</p><p className="maintenance-followup">Please check back again shortly.</p>{maintenance.ends_at && <p className="maintenance-time">Expected availability: {new Date(maintenance.ends_at).toLocaleString("en-PH")}</p>}<div className="maintenance-actions"><button type="button" className="maintenance-home" onClick={() => void returnHome()}>Back to Home</button><button type="button" className="maintenance-refresh" onClick={() => window.location.reload()}>Refresh Page</button></div><footer className="maintenance-footer">Thank you for your patience.</footer></section></div> : outlet}
      </main>
      <Toaster
        position="top-center"
        closeButton
        duration={3500}
        mobileOffset={{ top: "calc(76px + env(safe-area-inset-top))", right: "12px", left: "12px" }}
      />
    </div>);
}
export function Root() {
    return (<ApartmentsProvider>
      <RootContent />
    </ApartmentsProvider>);
}
