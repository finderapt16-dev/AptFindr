import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
/**
 * Friendly replacement for React Router's default error screen. Without it a
 * single failing component blanks the whole app with "Unexpected Application
 * Error!" plus a raw stack trace.
 */
export function RouteErrorBoundary() {
    const error = useRouteError();
    const navigate = useNavigate();
    useEffect(() => {
        console.error("AptFindr screen failed to render:", error);
    }, [error]);
    const isMissingPage = isRouteErrorResponse(error) && error.status === 404;
    const title = isMissingPage ? "Page not found" : "Something went wrong";
    const message = isMissingPage
        ? "The page you are looking for is not available."
        : "This screen could not be displayed. Reloading usually fixes it, and your data is safe.";
    return (<div className="not-found-page">
      <div className="not-found-content">
        <AlertTriangle className="not-found-icon"/>
        <h1 className="not-found-code">{title}</h1>
        <p className="not-found-message">{message}</p>
        <div className="route-error-actions">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="not-found-icon"/>
            Reload page
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="not-found-icon"/>
            Back to Home
          </Button>
        </div>
      </div>
    </div>);
}
