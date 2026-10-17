import { AppLogo } from "./AppLogo";

export function AppLoadingScreen({ label = "Loading your page", detail = "Getting things ready for you." }) {
    return (<div className="app-loading-screen" role="status" aria-live="polite" aria-label={label}>
      <section className="app-loading-card">
        <div className="app-loading-mark" aria-hidden="true">
          <AppLogo className="app-loading-logo"/>
        </div>
        <div className="app-loading-copy">
          <strong>{label}</strong>
          <p>{detail}</p>
        </div>
        <div className="app-loading-progress" aria-hidden="true"><span/></div>
      </section>
    </div>);
}
