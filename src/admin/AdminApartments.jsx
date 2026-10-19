import { hasExpiredPermit } from "@/utils/permitExpiry";
import { getAdminAvailabilityLabel, getAdminListingLabel, getLowestRoomRent } from "@/admin/adminListingState";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Button } from "@/components/ui/button";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { AlertOctagon, BedDouble, Bell, Building2, Calendar, Car, CheckCircle2, Eye, Flag, MapPin, PawPrint, Search, ShieldCheck, Sofa, Wifi } from "lucide-react";
import { formatOptionalDate, OverviewEmpty, text } from './adminDashboardHelpers';
const canInspectApartment = (apartment) => apartment?.isPublished === true
    || apartment?.is_published === true
    || String(apartment?.approvalStatus ?? apartment?.approval_status ?? "").trim().toLowerCase() === "approved";
export function AdminApartments({ allApartments, permitStates = new Map(), getApartmentReportCount, setActiveSection, unreadNotifsCount, aptSearch, setAptSearch, filteredApts, aptFilter, getLandlordForApt, onApartmentViewed, navigate, apartmentDetailBasePath, portalBasePath, setAptFilter, violations, openViolationModal, }) {
    const reportedCount = allApartments.filter((a) => getApartmentReportCount(a.id) > 0).length;
    const landlordsById = new Map();
    allApartments.forEach((apartment) => {
        const landlord = getLandlordForApt(apartment);
        const landlordId = String(landlord?.id ?? apartment.landlordId ?? apartment.landlord_id ?? "").trim();
        if (landlordId && !landlordsById.has(landlordId)) {
            landlordsById.set(landlordId, landlord ?? apartment);
        }
    });
    const monitoredPermits = Array.from(landlordsById.keys()).map((id) => permitStates.get(id)).filter(Boolean);
    const gracePermitCount = monitoredPermits.filter((permit) => permit.inGracePeriod).length;
    const expiredPermitCount = monitoredPermits.filter((permit) => permit.complianceStatus === "expired").length;
    const currentDate = new Date().toLocaleDateString("en-PH", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    return (<div className="admin-apartments-panel">
      <div className="admin-apartments-container">
        <header className="admin-apartments-header">
          <div className="admin-apartments-row">
            <span className="admin-apartments-card"><Building2 className="admin-apartments-building2-icon"/></span>
            <div><h1 className="admin-apartments-apartments">Apartments</h1><p className="admin-apartments-text">Review and manage apartment listings.</p></div>
          </div>
          <div className="admin-apartments-row-2">
            <button onClick={() => setActiveSection("notifications")} title="Notifications" className="admin-apartments-button"><Bell className="admin-apartments-bell-icon"/>{unreadNotifsCount > 0 && <span className="admin-apartments-span">{unreadNotifsCount}</span>}</button>
            <div className="admin-apartments-card-2"><Calendar className="admin-apartments-calendar-icon"/>{currentDate}</div>
          </div>
        </header>

        <section className="admin-apartments-section admin-apartments-summary">
          {[
            { label: "Total Apartments", value: allApartments.length, note: "Published listings", icon: Building2 },
            { label: gracePermitCount > 0 ? "Grace Period" : expiredPermitCount === 1 ? "Expired Permit" : "Expired Permits", value: gracePermitCount || expiredPermitCount, note: gracePermitCount > 0 ? "Renewal approval due January 31" : "Requires document request", icon: AlertOctagon },
        ].map(({ label, value, note, icon: Icon }) => (<div key={label} className="admin-apartments-row-3"><span className="admin-apartments-row-4"><Icon className="admin-apartments-icon-icon"/></span><span className="admin-apartments-span-2"><span className="admin-apartments-span-3">{value}</span><span className="admin-apartments-span-4">{label}</span><span className="admin-apartments-span-5">{note}</span></span></div>))}
        </section>

        <section className="admin-apartments-section-2">
          <label className="admin-apartments-label">
            <Search className="admin-apartments-search-icon"/>
            <input value={aptSearch} onChange={(event) => setAptSearch(event.target.value)} placeholder="Search apartments by name, location, or landlord" className="admin-apartments-input"/>
          </label>
        </section>

        {filteredApts.length === 0 ? (<div className="admin-apartments-card-3"><OverviewEmpty icon={Building2} text={aptFilter === "reported" ? "No reported apartments." : allApartments.length === 0 ? "No apartments have been added yet." : "No apartments match the selected filters."}/></div>) : (<section className="admin-apartments-section-3">
            {filteredApts.map((apartment) => {
                const landlord = getLandlordForApt(apartment);
                const reportCount = getApartmentReportCount(apartment.id);
                const status = getAdminListingLabel(apartment);
                const availability = getAdminAvailabilityLabel(apartment);
                const lowestRoomRent = getLowestRoomRent(apartment);
                const location = formatApartmentLocation(apartment);
                const canInspect = canInspectApartment(apartment);
                const roomCount = apartment.rooms?.length || apartment.bedrooms || 0;
                return (<article key={apartment.id} className="admin-apartments-article">
                  <div className="admin-apartments-panel-2">
                    {apartment.image ? <ImageWithFallback src={apartment.image} alt={apartment.title} className="admin-apartments-image-with-fallback"/> : <div className="admin-apartments-row-5"><Building2 className="admin-apartments-building2-icon-2"/></div>}
                  </div>
                  <div className="admin-apartments-panel-3">
                    <div className="admin-apartments-title-row"><h3 className="admin-apartments-heading">{apartment.title}</h3><span className="admin-apartments-inline-status">{status}</span>{hasExpiredPermit(apartment, landlord) && <span className="admin-apartments-expired-permit">Expired Permit</span>}</div>
                    <p className="admin-apartments-text-2"><MapPin className="admin-apartments-map-pin-icon"/>{location || "Location not provided"}</p>
                    <p className="admin-apartments-submitted-by">Submitted by <span className="admin-apartments-span-6">{landlord?.name || "Not available"}</span></p>
                    <div className="admin-apartments-row-6">
                      <span className="admin-apartments-row-7"><BedDouble className="admin-apartments-bed-double-icon"/>{roomCount || 0} {roomCount === 1 ? "Room/Unit" : "Rooms/Units"}</span>
                      <span className="admin-apartments-row-7"><CheckCircle2 className="admin-apartments-check-circle2-icon"/>{availability}</span>
                      {lowestRoomRent !== null && <span className="admin-apartments-starting-at">Starting at ₱{lowestRoomRent.toLocaleString()}/month</span>}
                      <span className="admin-apartments-added"><Calendar className="admin-apartments-calendar-icon-2"/>Added {formatOptionalDate(apartment.createdAt, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                  <div className="admin-apartments-row-8">
                    <div><p className="admin-apartments-listing-status">Listing Status</p><span className="admin-apartments-card-4"><ShieldCheck className="admin-apartments-shield-check-icon"/>{status}</span>{reportCount > 0 && <p className="admin-apartments-text-3"><Flag className="admin-apartments-flag-icon"/>{reportCount} {reportCount === 1 ? "report" : "reports"}</p>}</div>
                  </div>
                  <div className="admin-apartments-row-9">
                    <Button variant="outline" size="sm" disabled={!canInspect} title={canInspect ? "Inspect apartment" : "Verify the apartment before inspection"} onClick={(event) => { event.stopPropagation(); onApartmentViewed?.(apartment); navigate(`${apartmentDetailBasePath}/${apartment.id}`, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } }); }} className="admin-apartments-inspect"><Eye className="admin-apartments-eye-icon"/>Inspect</Button>
                  </div>
                </article>);
            })}
          </section>)}
      </div>

      <div className="admin-apartments-panel-4">
        <div className="admin-apartments-row-10">
          <Building2 className="admin-apartments-building2-icon-3"/>
        </div>
        <div>
          <h2 className="admin-apartments-all-apartments">All Apartments</h2>
          <p className="admin-apartments-text-4">Browse, inspect, and take action on listings</p>
        </div>
      </div>

      <div className="admin-apartments-card-5">
        <Button variant={aptFilter === "all" ? "default" : "ghost"} size="sm" onClick={() => setAptFilter("all")} className={`admin-apartments-all ${aptFilter === "all"
            ? "admin-apartments-all-2"
            : "admin-apartments-all-3"}`}>
          <Building2 className="admin-apartments-building2-icon-4"/>
          All ({allApartments.length})
        </Button>
        <Button variant={aptFilter === "reported" ? "default" : "ghost"} size="sm" onClick={() => setAptFilter("reported")} className={`admin-apartments-reported ${aptFilter === "reported"
            ? "admin-apartments-reported-2"
            : "admin-apartments-reported-3"}`}>
          <Flag className="admin-apartments-flag-icon-2"/>
          Reported ({reportedCount})
        </Button>
      </div>

      <div className="admin-apartments-panel-5">
        <Search className="admin-apartments-search-icon-2"/>
        <input value={aptSearch} onChange={(e) => setAptSearch(e.target.value)} placeholder="Search by name or location…" className="admin-apartments-input-2"/>
      </div>

    <div className="admin-apartments-grid">
      {filteredApts.map((apt) => {
            const landlord = getLandlordForApt(apt);
            const aptViolations = violations.filter((v) => v.apartment_id === apt.id || (!v.apartment_id && v.apartmentTitle === apt.title));
            const aptReportCount = getApartmentReportCount(apt.id);
            const isAvailable = new Date(apt.availableDate) <= new Date();
            const canInspect = canInspectApartment(apt);
            return (<div key={apt.id} className="admin-apartments-card-6">
            <div className="admin-apartments-panel-6">
              {apt.images?.[0]
                    ? <img src={apt.images[0]} alt={apt.title} className="admin-apartments-image"/>
                    : <div className="admin-apartments-row-11"><Building2 className="admin-apartments-building2-icon-5"/></div>}
              <div className="admin-apartments-row-12">
                <span className={`admin-apartments-span-7 ${isAvailable ? "admin-apartments-span-8" : "admin-apartments-span-9"}`}>{isAvailable ? "Published" : "Occupied"}</span>
                {aptReportCount > 0 && (<span className="admin-apartments-row-13">
                    <Flag className="admin-apartments-flag-icon"/>{aptReportCount} {aptReportCount === 1 ? "Report" : "Reports"}
                  </span>)}
                {aptViolations.length > 0 && (<span className="admin-apartments-row-14">
                    <AlertOctagon className="admin-apartments-alert-octagon-icon"/>{aptViolations.length}
                  </span>)}
              </div>
              {landlord && (<div className="admin-apartments-row-15">
                  <div className="admin-apartments-row-16">
                    {landlord.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="admin-apartments-span-10">{landlord.name}</span>
                  {landlord.isVerified && <CheckCircle2 className="admin-apartments-check-circle2-icon-2"/>}
                </div>)}
            </div>
            <div className="admin-apartments-panel-7">
              <h3 className="admin-apartments-heading-2">{apt.title}</h3>
              <p className="admin-apartments-text-5">
                <MapPin className="admin-apartments-map-pin-icon-2"/>{apt.location}
              </p>
              <div className="admin-apartments-row-17">
                <span className="admin-apartments-span-11">₱{apt.price?.toLocaleString()}<span className="admin-apartments-mo">/mo</span></span>
                <div className="admin-apartments-row-18">
                  {apt.wifi && <span className="admin-apartments-card-7"><Wifi className="admin-apartments-wifi-icon"/></span>}
                  {apt.parking && <span className="admin-apartments-card-7"><Car className="admin-apartments-car-icon"/></span>}
                  {apt.petFriendly && <span className="admin-apartments-card-7"><PawPrint className="admin-apartments-paw-print-icon"/></span>}
                  {apt.furnished && <span className="admin-apartments-card-7"><Sofa className="admin-apartments-sofa-icon"/></span>}
                </div>
              </div>
              <div className="admin-apartments-row-19" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" disabled={!canInspect} title={canInspect ? "Inspect apartment" : "Verify the apartment before inspection"} onClick={() => { onApartmentViewed?.(apt); navigate(`${apartmentDetailBasePath}/${apt.id}`, { state: { returnTo: `${portalBasePath}?section=apartments`, backLabel: "Back to Apartments" } }); }} className="admin-apartments-inspect-2">
                  <Eye className="admin-apartments-eye-icon-2"/>Inspect
                </Button>
                {landlord && <>
                  <Button size="sm" variant="outline" onClick={() => openViolationModal("violation", text(landlord.id), text(landlord.name, "Landlord"), apt.title, undefined, apt.id)} className="admin-apartments-violation">
                    <AlertOctagon className="admin-apartments-alert-octagon-icon-2"/>Violation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openViolationModal("notice", text(landlord.id), text(landlord.name, "Landlord"), apt.title, undefined, apt.id)} className="admin-apartments-notice">
                    <Bell className="admin-apartments-bell-icon-2"/>Notice
                  </Button>
                </>}
              </div>
            </div>
          </div>);
        })}
    </div>
    {filteredApts.length === 0 && (<div className="admin-apartments-panel-8">
        <Building2 className="admin-apartments-building2-icon-6"/>
        <p className="admin-apartments-no-apartments-found">No apartments found</p>
      </div>)}

    </div>);
}
