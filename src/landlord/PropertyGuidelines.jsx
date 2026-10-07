import "./PropertyGuidelines.css";

import {
  BedDouble,
  FileText,
  Image,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";

const guidelines = [
  {
    icon: FileText,
    tone: "blue",
    title: "Accurate Apartment Information",
    description:
      "Apartment name, address, unit configuration, prices, and amenities must be factual and kept up to date.",
  },
  {
    icon: FileText,
    tone: "green",
    title: "Valid Permit Information",
    description:
      "Required business permit documents and ownership records must be valid and correspond to the listed apartment.",
  },
  {
    icon: BedDouble,
    tone: "purple",
    title: "Accurate Unit Availability",
    description:
      "Units marked as Available, Occupied, or Under Maintenance should reflect their true status.",
  },
  {
    icon: Image,
    tone: "orange",
    title: "Apartment Photos",
    description:
      "Uploaded photos should accurately represent the interior, unit layouts, and exterior building facade.",
  },
  {
    icon: Tag,
    tone: "red",
    title: "Pricing Transparency",
    description:
      "Rental prices shown on the active listing should match the actual monthly baseline costs of the available units.",
  },
  {
    icon: ShieldCheck,
    tone: "cyan",
    title: "Listing Compliance",
    description:
      "Apartment profiles must comply with AptFindr's community rules and pass administrative review before publication.",
  },
];

export function PropertyGuidelines({ onAccept, onClose }) {
  return (
    <div className="property-guidelines-overlay">
      <section
        className="property-guidelines-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-guidelines-title"
        aria-describedby="property-guidelines-description"
      >
        <header className="property-guidelines-header">
          <div>
            <h2 id="property-guidelines-title">
              Apartment Listing Guidelines
            </h2>
            <p>
              Review AptFindr's requirements for maintaining a valid and accurate listing.
            </p>
          </div>

          <button
            type="button"
            className="property-guidelines-close"
            onClick={onClose}
            aria-label="Close guidelines"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="property-guidelines-content">
          <p
            id="property-guidelines-description"
            className="property-guidelines-introduction"
          >
            Please follow these guidelines to ensure your apartment listing complies with AptFindr's verification requirements.
          </p>

          <div className="property-guidelines-list">
            {guidelines.map(({ icon: Icon, tone, title, description }) => (
              <article className="property-guidelines-item" key={title}>
                <span
                  className={`property-guidelines-icon property-guidelines-icon--${tone}`}
                >
                  <Icon aria-hidden="true" />
                </span>

                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <footer className="property-guidelines-footer">
          <button
            type="button"
            className="property-guidelines-accept"
            onClick={onAccept}
          >
            Accept &amp; Proceed to Form
          </button>
        </footer>
      </section>
    </div>
  );
}
