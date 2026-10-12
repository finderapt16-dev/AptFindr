import { useEffect, useState } from "react";
import { hasSupabaseConfig } from "@/services/supabaseClient";
import { AuthProvider } from "../contexts/AuthContext";
import { FavoritesProvider } from "../tenant/useFavorites";
export function AppRuntime({ children }) {
    const [waitingWorker, setWaitingWorker] = useState(null);
    const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
    useEffect(() => {
        const updateConnectionStatus = () => setIsOffline(!navigator.onLine);
        window.addEventListener("online", updateConnectionStatus);
        window.addEventListener("offline", updateConnectionStatus);
        return () => {
            window.removeEventListener("online", updateConnectionStatus);
            window.removeEventListener("offline", updateConnectionStatus);
        };
    }, []);
    useEffect(() => {
        const registerServiceWorker = () => {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                const captureWaitingWorker = () => {
                    if (registration.waiting && navigator.serviceWorker.controller) {
                        setWaitingWorker(registration.waiting);
                    }
                };
                captureWaitingWorker();
                registration.addEventListener("updatefound", () => {
                    const installingWorker = registration.installing;
                    installingWorker?.addEventListener("statechange", () => {
                        if (installingWorker.state === "installed")
                            captureWaitingWorker();
                    });
                });
            })
                .catch((registrationError) => {
                console.error("Service worker registration failed.", registrationError);
            });
        };
        if ("serviceWorker" in navigator) {
            if (import.meta.env.DEV) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => void registration.unregister());
                });
                if ("caches" in window) {
                    caches.keys().then((cacheNames) => {
                        cacheNames.forEach((cacheName) => void caches.delete(cacheName));
                    });
                }
            }
            else {
                if (document.readyState === "complete") {
                    registerServiceWorker();
                }
                else {
                    window.addEventListener("load", registerServiceWorker);
                }
            }
        }
        return () => {
            window.removeEventListener("load", registerServiceWorker);
        };
    }, []);
    useEffect(() => {
        if (!waitingWorker)
            return;
        const handleControllerChange = () => window.location.reload();
        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange, { once: true });
        return () => navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    }, [waitingWorker]);
    if (!hasSupabaseConfig) {
        return (<main className="runtime-config-page">
        <section className="runtime-config-panel">
          <p className="runtime-config-eyebrow">
            Deployment setup needed
          </p>
          <h1 className="runtime-config-title">
            Apartment Finder is missing its Supabase connection.
          </h1>
          <p className="runtime-config-copy">
            Add these environment variables in Vercel, then redeploy the project:
          </p>
          <div className="runtime-config-code">
            <div>VITE_SUPABASE_URL</div>
            <div>VITE_SUPABASE_ANON_KEY</div>
          </div>
          <p className="runtime-config-note">
            Vercel path: Project Settings, Environment Variables, Production.
          </p>
        </section>
      </main>);
    }
    const app = (<AuthProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </AuthProvider>);
    return (<>
      {app}
      {isOffline && (<div className="runtime-offline-banner" role="status" aria-live="polite">
          You’re offline. Cached screens are available; listings and changes need a connection.
        </div>)}
      {waitingWorker && (<div className="runtime-update-banner" role="status">
          <p className="runtime-update-text">A new AptFindr version is ready.</p>
          <button type="button" className="runtime-update-button" onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}>
            Update
          </button>
        </div>)}
    </>);
}
