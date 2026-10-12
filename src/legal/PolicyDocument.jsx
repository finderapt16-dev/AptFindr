import { memo } from "react";

/**
 * The shared body of a legal document.
 *
 * Both surfaces that show the policy text render it through this module:
 *   - `PolicyDialog.jsx`  the floating popup used from the signup consent box
 *   - `PolicyPage.jsx`    the public, linkable page Supabase and app stores
 *                         require ("Application privacy policy link")
 *
 * Keeping the markup in one place means the popup and the public page can
 * never drift apart in wording or structure.
 */

/** One numbered section: a heading, any paragraphs, then optional bullets. */
export const PolicySection = memo(function PolicySection({ section }) {
  return (
    <section className="apf-policy-section">
      <h3 className="apf-policy-section-title">{section.heading}</h3>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="apf-policy-paragraph">{paragraph}</p>
      ))}
      {section.bullets?.length ? (
        <ul className="apf-policy-list">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="apf-policy-list-item">{bullet}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
});

/** Renders every section of a loaded policy document. */
export const PolicyDocument = memo(function PolicyDocument({ policy }) {
  return policy.sections.map((section) => (
    <PolicySection key={section.heading} section={section} />
  ));
});
