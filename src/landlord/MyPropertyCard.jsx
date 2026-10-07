import "./MyPropertyCard.css";

import { Button } from "@/components/ui/button";
import { formatApartmentLocation } from "@/utils/apartmentLocation";

import {
  Building2,
  Eye,
  Heart,
  MapPin,
  MoreHorizontal,
  Star,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

export const MyPropertyCard = ({
  apartment,
  ratingSummary,
  ratingsLoading,
  openViewers,
  aptViews,
  openFavoriters,
  aptFavs,
  handleTogglePublication,
  deletingApartmentId,
  handleDeleteApartment,
}) => {
  const navigate = useNavigate();

  /* ============================================================
     FLOATING MENU STATE
     ============================================================ */

  const [menuOpen, setMenuOpen] = useState(false);

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const kebabRef = useRef(null);
  const popupRef = useRef(null);

  /* ============================================================
     PROPERTY INFORMATION
     ============================================================ */

  const location = formatApartmentLocation(
    apartment,
    "Address unavailable"
  );

  const roomPrices = (apartment.rooms ?? [])
    .map((room) =>
      Number(
        room.price ??
          room.monthlyRent ??
          room.rent ??
          0
      )
    )
    .filter(
      (price) =>
        Number.isFinite(price) && price > 0
    );

  const startingRent = roomPrices.length
    ? Math.min(...roomPrices)
    : Number(apartment.price ?? 0);

  const rating = ratingSummary.byApartment.get(
    apartment.id
  );

  const isPublished =
    apartment.isPublished !== false;

  const views = Number(
    aptViews(apartment.id) ?? 0
  );

  const favorites = Number(
    aptFavs(apartment.id) ?? 0
  );

  /* ============================================================
     CALCULATE FLOATING MENU POSITION
     ============================================================ */

  const calculateMenuPosition = () => {
    const button = kebabRef.current;

    if (!button) return;

    const rect = button.getBoundingClientRect();

    /*
     * Keep these values matched with CSS.
     */
    const menuWidth = 116;
    const menuHeight = 78;

    const gap = 8;
    const viewportPadding = 12;

    /*
     * Align the RIGHT edge of the floating menu
     * with the RIGHT edge of the three-dot button.
     */
    let left =
      rect.right - menuWidth;

    /*
     * Default:
     * open underneath the three dots.
     */
    let top =
      rect.bottom + gap;

    /*
     * Prevent menu from going outside
     * the left/right side of the browser.
     */
    left = Math.max(
      viewportPadding,
      Math.min(
        left,
        window.innerWidth -
          menuWidth -
          viewportPadding
      )
    );

    /*
     * If there is not enough space below,
     * open ABOVE the dots instead.
     */
    if (
      top + menuHeight >
      window.innerHeight - viewportPadding
    ) {
      top =
        rect.top -
        menuHeight -
        gap;
    }

    /*
     * Prevent menu from going above
     * the browser viewport.
     */
    top = Math.max(
      viewportPadding,
      top
    );

    setMenuPosition({
      top,
      left,
    });
  };

  /* ============================================================
     OPEN / CLOSE THREE-DOT MENU
     ============================================================ */

  const handleMenuToggle = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    calculateMenuPosition();

    setMenuOpen(true);
  };

  /* ============================================================
     CLOSE MENU WHEN CLICKING OUTSIDE
     OR PRESSING ESCAPE
     ============================================================ */

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      const clickedDots =
        kebabRef.current?.contains(
          event.target
        );

      const clickedPopup =
        popupRef.current?.contains(
          event.target
        );

      if (
        !clickedDots &&
        !clickedPopup
      ) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [menuOpen]);

  /* ============================================================
     KEEP FLOATING MENU ATTACHED TO DOTS
     WHEN PAGE SCROLLS OR WINDOW RESIZES
     ============================================================ */

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const updatePosition = () => {
      calculateMenuPosition();
    };

    window.addEventListener(
      "resize",
      updatePosition
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true
      );
    };
  }, [menuOpen]);

  /* ============================================================
     CLOSE MENU IF THIS CARD DISAPPEARS
     ============================================================ */

  useEffect(() => {
    return () => {
      setMenuOpen(false);
    };
  }, []);

  /* ============================================================
     TOGGLE PUBLICATION
     ============================================================ */

  const togglePublication = () => {
    setMenuOpen(false);

    void handleTogglePublication(
      apartment.id,
      !isPublished
    );
  };

  /* ============================================================
     DELETE PROPERTY
     ============================================================ */

  const deleteProperty = () => {
    setMenuOpen(false);

    void handleDeleteApartment(
      apartment.id
    );
  };

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <>
      <article className="property-card-article">
        {/* ======================================================
            PROPERTY IMAGE
            ====================================================== */}

        <div className="property-card-media">
          {apartment.image ? (
            <img
              src={apartment.image}
              alt={
                apartment.title ||
                "Property"
              }
              className="property-card-image"
            />
          ) : (
            <Building2
              className="property-card-building2-icon"
              aria-hidden="true"
            />
          )}
        </div>

        {/* ======================================================
            PROPERTY DETAILS
            ====================================================== */}

        <div className="property-card-details">
          <div className="property-card-title-row">
            <h2 className="property-card-heading">
              {apartment.title ||
                "Untitled property"}
            </h2>

            <span
              className={`property-card-status ${
                isPublished
                  ? ""
                  : "property-card-status-unpublished"
              }`}
            >
              {isPublished
                ? "Unpublish"
                : "Publish"}
            </span>
          </div>

          {/* LOCATION */}

          <p className="property-card-location">
            <MapPin aria-hidden="true" />

            {location}
          </p>

          {/* PRICE */}

          <p className="property-card-price">
            {startingRent > 0
              ? `₱${startingRent.toLocaleString(
                  "en-PH"
                )} / month`
              : "Rent not set"}
          </p>

          {/* ====================================================
              PROPERTY METRICS
              ==================================================== */}

          <div
            className="property-card-metrics"
            aria-label="Property engagement"
          >
            {/* VIEWS */}

            <button
              type="button"
              onClick={() =>
                openViewers(
                  apartment.id,
                  apartment.title,
                  views
                )
              }
            >
              <Eye aria-hidden="true" />

              <strong>
                {views}
              </strong>

              <span>
                Views
              </span>
            </button>

            {/* FAVORITES */}

            <button
              type="button"
              onClick={() =>
                openFavoriters(
                  apartment.id,
                  apartment.title,
                  favorites
                )
              }
            >
              <Heart aria-hidden="true" />

              <strong>
                {favorites}
              </strong>

              <span>
                Favorites
              </span>
            </button>

            {/* RATING */}

            <div className="property-card-rating">
              <Star aria-hidden="true" />

              <strong>
                {ratingsLoading
                  ? "–"
                  : rating?.count
                    ? Number(
                        rating.average
                      ).toFixed(1)
                    : "0"}
              </strong>

              <span>
                Average Rating
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================
            RIGHT SIDE ACTIONS
            ====================================================== */}

        <div className="property-card-actions">
          {/* ====================================================
              THREE DOT BUTTON

              IMPORTANT:
              The actual dropdown is NOT rendered here.

              Only the three-dot trigger is inside the card.

              The floating popup is rendered into document.body.
              ==================================================== */}

          <div
            className="property-card-kebab"
            ref={kebabRef}
          >
            <button
              type="button"
              className="property-card-kebab-button"
              aria-label={`Actions for ${
                apartment.title ||
                "property"
              }`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={handleMenuToggle}
            >
              <MoreHorizontal
                aria-hidden="true"
              />
            </button>
          </div>

          {/* ====================================================
              VIEW PROPERTY
              ==================================================== */}

          <Button
            asChild
            variant="outline"
            className="property-card-view-property"
          >
            <Link
              to={`/apartment/${apartment.id}`}
              state={{
                returnTo: "/landlord/dashboard",
                backLabel:
                  "Back to My Properties",
              }}
            >
              View Property
            </Link>
          </Button>

          {/* ====================================================
              MANAGE ROOMS
              ==================================================== */}

          <Button
            type="button"
            className="property-card-manage-rooms"
            onClick={() =>
              navigate(
                `/landlord/properties/${apartment.id}/rooms`
              )
            }
          >
            Manage Rooms
          </Button>
        </div>
      </article>

      {/* ========================================================
          TRUE FLOATING THREE-DOT MENU

          createPortal renders this directly into document.body.

          Because of that:
          - it does NOT take space inside the property card
          - it does NOT push View Property
          - it does NOT push Manage Rooms
          - it can float over other dashboard elements
          ======================================================== */}

      {menuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            className="property-card-floating-menu"
            role="menu"
            aria-label={`Actions for ${
              apartment.title ||
              "property"
            }`}
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
          >
            {/* ==================================================
                PUBLISH / UNPUBLISH
                ================================================== */}

            <button
              type="button"
              role="menuitem"
              className="property-card-floating-status"
              onClick={togglePublication}
            >
              {isPublished
                ? "Published"
                : "Unpublished"}
            </button>

            {/* ==================================================
                DELETE
                ================================================== */}

            <button
              type="button"
              role="menuitem"
              className="property-card-floating-delete"
              disabled={
                deletingApartmentId ===
                apartment.id
              }
              onClick={deleteProperty}
            >
              {deletingApartmentId ===
              apartment.id
                ? "Deleting..."
                : "Delete"}
            </button>
          </div>,
          document.body
        )}
    </>
  );
};
