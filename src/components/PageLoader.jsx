import { Suspense } from "react";
import { AppLoadingScreen } from "./AppLoadingScreen";
export function PageLoader({ children }) {
    return (<Suspense fallback={<AppLoadingScreen/>}>
      {children}
    </Suspense>);
}
