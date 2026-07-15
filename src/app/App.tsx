import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { hasSupabaseConfig } from "@/lib/supabaseclient";
import { AuthProvider } from "./shared/contexts/AuthContext";
import { router } from "./routes";

function App() {
  useEffect(() => {
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
      } else {
        window.addEventListener("load", () => {
          navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
              console.log("SW registered: ", registration);
            })
            .catch((registrationError) => {
              console.log("SW registration failed: ", registrationError);
            });
        });
      }
    }

    // Add manifest link
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = "/manifest.json";
    document.head.appendChild(manifestLink);

    // Add theme color meta tag
    const themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    themeColorMeta.content = "#0f172a";
    document.head.appendChild(themeColorMeta);

    // Add viewport meta tag for mobile optimization
    const viewportMeta = document.createElement("meta");
    viewportMeta.name = "viewport";
    viewportMeta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    document.head.appendChild(viewportMeta);

    return () => {
      document.head.removeChild(manifestLink);
      document.head.removeChild(themeColorMeta);
    };
  }, []);

  if (!hasSupabaseConfig) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
            Deployment setup needed
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Apartment Finder is missing its Supabase connection.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Add these environment variables in Vercel, then redeploy the project:
          </p>
          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-slate-100">
            <div>VITE_SUPABASE_URL</div>
            <div>VITE_SUPABASE_ANON_KEY</div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-400">
            Vercel path: Project Settings, Environment Variables, Production.
          </p>
        </section>
      </main>
    );
  }

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
