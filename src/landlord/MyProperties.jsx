import "./MyProperties.css";

import { MyPropertyCard } from "@/landlord/MyPropertyCard";
import { Button } from "@/components/ui/button";

import {
  Building2,
  ChevronRight,
  Clock,
  Info,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";

import { Link } from "react-router-dom";
import { getApartmentStatus } from "@/landlord/landlordStatus";

/**
 * Figma empty-state illustration.
 * This is kept inline so the empty state does not depend on
 * an external image URL or an additional asset file.
 */
export const QuietStreetIllustration = () => {
  return (
    <svg
      className="properties-empty-illustration"
      viewBox="0 0 562 254"
      role="img"
      aria-label="Quiet street with houses and trees"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground */}
      <line
        x1="14"
        y1="226"
        x2="548"
        y2="226"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      {/* =========================
          BACKGROUND BUILDINGS
         ========================= */}

      {/* Left house */}
      <path
        d="M74 225V91L142 27L210 91V225Z"
        fill="#F2F2F2"
      />

      <path
        d="M142 27L210 91V225H142Z"
        fill="#E6E6E6"
      />

      {/* Middle-left house */}
      <path
        d="M210 225V125L264 72L318 125V225Z"
        fill="#F2F2F2"
      />

      <path
        d="M264 72L318 125V225H264Z"
        fill="#E6E6E6"
      />

      {/* Right house */}
      <path
        d="M318 225V112L373 57L429 112V225Z"
        fill="#F2F2F2"
      />

      <path
        d="M373 57L429 112V225H373Z"
        fill="#E6E6E6"
      />

      {/* Far-right building */}
      <path
        d="M429 225V92L475 49L521 92V225Z"
        fill="#F2F2F2"
      />

      <path
        d="M475 49L521 92V225H475Z"
        fill="#E6E6E6"
      />

      {/* =========================
          WINDOWS
         ========================= */}

      <rect x="112" y="108" width="22" height="28" fill="#FFFFFF" />
      <rect x="162" y="108" width="22" height="28" fill="#FFFFFF" />
      <rect x="112" y="151" width="22" height="28" fill="#FFFFFF" />
      <rect x="162" y="151" width="22" height="28" fill="#FFFFFF" />

      <rect x="240" y="126" width="20" height="27" fill="#FFFFFF" />
      <rect x="286" y="126" width="20" height="27" fill="#FFFFFF" />
      <rect x="240" y="168" width="20" height="27" fill="#FFFFFF" />
      <rect x="286" y="168" width="20" height="27" fill="#FFFFFF" />

      <rect x="347" y="115" width="21" height="28" fill="#FFFFFF" />
      <rect x="391" y="115" width="21" height="28" fill="#FFFFFF" />
      <rect x="347" y="158" width="21" height="28" fill="#FFFFFF" />
      <rect x="391" y="158" width="21" height="28" fill="#FFFFFF" />

      <rect x="453" y="107" width="19" height="27" fill="#FFFFFF" />
      <rect x="493" y="107" width="19" height="27" fill="#FFFFFF" />

      {/* =========================
          BENCH - LEFT
         ========================= */}

      <line
        x1="207"
        y1="188"
        x2="273"
        y2="188"
        stroke="#3F3D56"
        strokeWidth="5"
      />

      <line
        x1="207"
        y1="197"
        x2="273"
        y2="197"
        stroke="#3F3D56"
        strokeWidth="5"
      />

      <line
        x1="219"
        y1="198"
        x2="219"
        y2="226"
        stroke="#3F3D56"
        strokeWidth="3"
      />

      <line
        x1="260"
        y1="198"
        x2="260"
        y2="226"
        stroke="#3F3D56"
        strokeWidth="3"
      />

      {/* =========================
          BENCH - RIGHT
         ========================= */}

      <line
        x1="321"
        y1="188"
        x2="389"
        y2="188"
        stroke="#3F3D56"
        strokeWidth="5"
      />

      <line
        x1="321"
        y1="197"
        x2="389"
        y2="197"
        stroke="#3F3D56"
        strokeWidth="5"
      />

      <line
        x1="334"
        y1="198"
        x2="334"
        y2="226"
        stroke="#3F3D56"
        strokeWidth="3"
      />

      <line
        x1="376"
        y1="198"
        x2="376"
        y2="226"
        stroke="#3F3D56"
        strokeWidth="3"
      />

      {/* =========================
          LEFT TREES
         ========================= */}

      <path
        d="M43 226C43 188 43 153 48 123"
        stroke="#3F3D56"
        strokeWidth="2"
        fill="none"
      />

      <ellipse
        cx="49"
        cy="98"
        rx="32"
        ry="57"
        fill="#0EA5E9"
      />

      <path
        d="M49 226C49 192 49 162 49 130"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      <path
        d="M49 145L25 129"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      <path
        d="M49 161L70 145"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      {/* Small dark tree */}
      <path
        d="M80 226C80 205 81 187 84 171"
        stroke="#3F3D56"
        strokeWidth="3"
      />

      <ellipse
        cx="85"
        cy="159"
        rx="16"
        ry="29"
        fill="#3F3D56"
      />

      {/* Large left tree */}
      <path
        d="M118 226C118 176 120 120 125 68"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      <ellipse
        cx="126"
        cy="72"
        rx="38"
        ry="78"
        fill="#0EA5E9"
      />

      <path
        d="M126 137L91 118"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      <path
        d="M126 105L159 87"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      {/* =========================
          RIGHT TREES
         ========================= */}

      <path
        d="M513 226C513 186 513 150 508 119"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      <ellipse
        cx="508"
        cy="96"
        rx="31"
        ry="57"
        fill="#0EA5E9"
      />

      <path
        d="M508 226C508 190 508 160 508 130"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      <path
        d="M508 145L531 129"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      <path
        d="M508 161L488 145"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      {/* Small dark tree */}
      <path
        d="M477 226C477 205 476 187 473 171"
        stroke="#3F3D56"
        strokeWidth="3"
      />

      <ellipse
        cx="472"
        cy="159"
        rx="16"
        ry="29"
        fill="#3F3D56"
      />

      {/* Large right tree */}
      <path
        d="M438 226C438 176 436 120 431 68"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      <ellipse
        cx="430"
        cy="72"
        rx="38"
        ry="78"
        fill="#0EA5E9"
      />

      <path
        d="M430 137L465 118"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      <path
        d="M430 105L397 87"
        stroke="#3F3D56"
        strokeWidth="2"
      />

      {/* =========================
          BIRDS
         ========================= */}

      <path
        d="M197 27C201 23 205 23 209 27C205 25 201 25 197 27Z"
        fill="#3F3D56"
      />

      <path
        d="M321 58C325 54 329 54 333 58C329 56 325 56 321 58Z"
        fill="#3F3D56"
      />

      <path
        d="M397 10C401 6 405 6 409 10C405 8 401 8 397 10Z"
        fill="#3F3D56"
      />

      {/* Small bushes */}
      <ellipse cx="176" cy="226" rx="13" ry="6" fill="#3F3D56" />
      <ellipse cx="300" cy="226" rx="13" ry="6" fill="#3F3D56" />
      <ellipse cx="416" cy="226" rx="13" ry="6" fill="#3F3D56" />
    </svg>
  );
};

export const MyProperties = ({
  myApartments,
  setPropertyFilter,
  propertyFilter,
  propertySort,
  setPropertySort,
  setPropertyViewMode,
  propertyViewMode,
  isLoadingApartments,
  paginatedApartments,
  ratingSummary,
  ratingsLoading,
  openViewers,
  aptViews,
  openFavoriters,
  aptFavs,
  setEditingApartment,
  handleTogglePublication,
  deletingApartmentId,
  handleDeleteApartment,
  filteredApartments,
  safePropertyPage,
  propertiesPerPage,
  setPropertyPage,
  propertyPageCount,
  setPropertiesPerPage,
}) => {
  const availablePropertiesCount = myApartments.filter(
    (apartment) => getApartmentStatus(apartment) === "available"
  ).length;

  /*
   * ============================================================
   * LOADING STATE
   * ============================================================
   */
  if (isLoadingApartments) {
    return (
      <div className="properties-section-container">
        <div className="properties-loading-state">
          <Clock className="properties-loading-icon" />
          <span>Loading your properties...</span>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * EMPTY STATE
   * Exact structure based on the Figma design supplied.
   * ============================================================
   */
  if (myApartments.length === 0) {
    return (
      <div className="properties-section-container properties-empty-page">
        <div className="properties-empty-heading">
          <h2>Your Properties</h2>

          <p>
            Manage your apartments, rooms, and availability.
          </p>
        </div>

        <div className="properties-empty-state">
          <div className="properties-empty-content-wrapper">
            <div className="properties-empty-illustration-block">
              <QuietStreetIllustration />

              <div className="properties-empty-text-stack">
                <h2>Add your first property</h2>

                <p>
                  Create an apartment listing to start
                  <br className="properties-empty-description-break" />
                  managing your availability in aptfindr.
                </p>
              </div>
            </div>

            <Link
              to="/add-apartment"
              className="properties-empty-add-link"
            >
              <Button className="properties-empty-add-button">
                <Plus className="properties-empty-plus-icon" />
                <span>Add Property</span>
              </Button>
            </Link>
          </div>

          <div className="properties-empty-review">
            <Info className="properties-empty-info-icon" />

            <span>
              Property listings are reviewed before publication.
            </span>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * NORMAL PROPERTY MANAGEMENT VIEW
   * ============================================================
   */
  return (
    <div className="properties-section-container">
      <header className="properties-section-header">
        <div className="properties-section-row">
          <span className="properties-section-row-2">
            <Building2 className="properties-section-building2-icon" />
          </span>

          <div>
            <p className="properties-section-my-properties">
              My Properties
            </p>

            <h1 className="properties-section-your-listings">
              Your Listings
            </h1>

            <p className="properties-section-text">
              Manage rooms, publication, and listing performance.
            </p>
          </div>
        </div>

        <Link to="/add-apartment">
          <Button className="properties-section-add-property">
            <Plus className="properties-section-plus-icon" />
            Add Property
          </Button>
        </Link>
      </header>

      <section className="properties-section-section">
        <div className="properties-section-row-3">
          <button
            type="button"
            onClick={() => setPropertyFilter("all")}
            className={`properties-section-all-units ${
              propertyFilter === "all"
                ? "properties-section-all-units-2"
                : "properties-section-all-units-3"
            }`}
          >
            <LayoutGrid className="properties-section-layout-grid-icon" />

            <span>All Units</span>

            <span
              className={`properties-section-span ${
                propertyFilter === "all"
                  ? "properties-section-span-2"
                  : "properties-section-span-3"
              }`}
            >
              {myApartments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPropertyFilter("available")}
            className={`properties-section-available ${
              propertyFilter === "available"
                ? "properties-section-available-2"
                : "properties-section-available-3"
            }`}
          >
            <span className="properties-section-available-4" />

            <span>Available</span>

            <span
              className={`properties-section-span ${
                propertyFilter === "available"
                  ? "properties-section-span-2"
                  : "properties-section-span-3"
              }`}
            >
              {availablePropertiesCount}
            </span>
          </button>
        </div>

        <div className="properties-section-content">
          <label className="properties-section-label">
            <span className="properties-section-sort-by">
              Sort by
            </span>

            <select
              value={propertySort}
              onChange={(event) =>
                setPropertySort(event.target.value)
              }
              className="properties-section-select"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
              <option value="price-high">Price: High</option>
              <option value="price-low">Price: Low</option>
            </select>
          </label>

          <div className="properties-section-card">
            <button
              type="button"
              title="Grid view"
              onClick={() => setPropertyViewMode("grid")}
              className={`properties-section-button ${
                propertyViewMode === "grid"
                  ? "properties-section-button-2"
                  : "properties-section-button-3"
              }`}
            >
              <LayoutGrid className="properties-section-layout-grid-icon-2" />
            </button>

            <button
              type="button"
              title="List view"
              onClick={() => setPropertyViewMode("list")}
              className={`properties-section-button ${
                propertyViewMode === "list"
                  ? "properties-section-button-2"
                  : "properties-section-button-3"
              }`}
            >
              <List className="properties-section-list-icon" />
            </button>
          </div>
        </div>
      </section>

      {paginatedApartments.length === 0 ? (
        <div className="properties-section-card-4">
          <Search className="properties-section-search-icon" />

          <h2 className="properties-section-no-matching-properties">
            No matching properties
          </h2>

          <p className="properties-section-text">
            Try selecting a different availability filter.
          </p>

          <Button
            variant="outline"
            onClick={() => setPropertyFilter("all")}
            className="properties-section-show-all-units"
          >
            Show All Units
          </Button>
        </div>
      ) : (
        <div
          className={
            propertyViewMode === "grid"
              ? "properties-section-grid"
              : "properties-section-panel"
          }
        >
          {paginatedApartments.map((apartment) => (
            <MyPropertyCard
              key={apartment.id}
              apartment={apartment}
              propertyViewMode={propertyViewMode}
              ratingSummary={ratingSummary}
              ratingsLoading={ratingsLoading}
              openViewers={openViewers}
              aptViews={aptViews}
              openFavoriters={openFavoriters}
              aptFavs={aptFavs}
              setEditingApartment={setEditingApartment}
              handleTogglePublication={handleTogglePublication}
              deletingApartmentId={deletingApartmentId}
              handleDeleteApartment={handleDeleteApartment}
            />
          ))}
        </div>
      )}

      {filteredApartments.length > 0 && (
        <footer className="properties-section-footer">
          <span>
            Showing{" "}
            {(safePropertyPage - 1) * propertiesPerPage + 1}-
            {Math.min(
              safePropertyPage * propertiesPerPage,
              filteredApartments.length
            )}{" "}
            of {filteredApartments.length} properties
          </span>

          <div className="properties-section-row-5">
            <button
              type="button"
              title="Previous page"
              disabled={safePropertyPage <= 1}
              onClick={() =>
                setPropertyPage(
                  Math.max(1, safePropertyPage - 1)
                )
              }
              className="properties-section-button-4"
            >
              <ChevronRight className="properties-section-chevron-right-icon" />
            </button>

            <span className="properties-section-row-6">
              {safePropertyPage}
            </span>

            <button
              type="button"
              title="Next page"
              disabled={safePropertyPage >= propertyPageCount}
              onClick={() =>
                setPropertyPage(
                  Math.min(
                    propertyPageCount,
                    safePropertyPage + 1
                  )
                )
              }
              className="properties-section-button-4"
            >
              <ChevronRight className="properties-section-chevron-right-icon-2" />
            </button>

            <label className="properties-section-label-2">
              <span>Per page</span>

              <select
                value={propertiesPerPage}
                onChange={(event) =>
                  setPropertiesPerPage(
                    Number(event.target.value)
                  )
                }
                className="properties-section-select-2"
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
          </div>
        </footer>
      )}
    </div>
  );
};
