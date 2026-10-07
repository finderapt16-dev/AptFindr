/** Shared policy copy, limited to the four approved signup screenshots.
 * Loaded lazily by policyLoader.js for all policy links.
 */
export { policyIdFor } from "./policyIds.js";

export const POLICIES = {
  "tenant-terms": {
    "id": "tenant-terms",
    "audience": "tenant",
    "audienceLabel": "Tenant",
    "kind": "terms",
    "kindLabel": "Terms of Service",
    "title": "Terms of Service",
    "sections": [
      {
        "heading": "1. Platform Usage",
        "paragraphs": [
          "AptFindr is a localized Progressive Web Application designed to help users search for apartments and boarding houses in La Paz, Iloilo City."
        ]
      },
      {
        "heading": "2. User Accounts",
        "paragraphs": [
          "Users must provide accurate, complete, and up-to-date information when creating and maintaining their accounts. You are responsible for keeping your account credentials secure."
        ]
      },
      {
        "heading": "3. Listing Information",
        "paragraphs": [
          "AptFindr provides apartment information submitted by landlords and reviewed through the platform's verification process. Users should review listing details carefully before making rental decisions."
        ]
      },
      {
        "heading": "4. Acceptable Conduct",
        "paragraphs": [
          "You agree to use AptFindr responsibly, treat other users with respect, and communicate professionally with landlords."
        ]
      },
      {
        "heading": "5. Prohibited Conduct",
        "paragraphs": [
          "You must not create fake accounts, provide false information, harass other users, engage in fraudulent activities, or misuse the platform. Violations may result in account suspension."
        ]
      }
    ]
  },
  "tenant-privacy": {
    "id": "tenant-privacy",
    "audience": "tenant",
    "audienceLabel": "Tenant",
    "kind": "privacy",
    "kindLabel": "Privacy Policy",
    "title": "Privacy Policy",
    "sections": [
      {
        "heading": "1. Information We Collect",
        "paragraphs": [
          "AptFindr may collect personal information such as your name, mobile number, email address, username, and other profile information for account registration and platform use."
        ]
      },
      {
        "heading": "2. How We Use Information",
        "paragraphs": [
          "Your information is used to operate AptFindr, manage accounts, provide apartment search and communication features, ensure platform security, and improve our services."
        ]
      },
      {
        "heading": "3. Information Visibility",
        "paragraphs": [
          "Certain information, such as your display name and profile, may be visible to landlords when you inquire about a property, in order to facilitate safe and legitimate communication."
        ]
      },
      {
        "heading": "4. Data Storage and Security",
        "paragraphs": [
          "AptFindr uses secure database and authentication technologies, such as Supabase, to protect your personal information against unauthorized access, alteration, or loss."
        ]
      },
      {
        "heading": "5. Data Sharing",
        "paragraphs": [
          "AptFindr does not sell your personal information. Your information may be processed by authorized service providers (e.g., Supabase) to operate the platform or as required by applicable law."
        ]
      }
    ]
  },
  "landlord-terms": {
    "id": "landlord-terms",
    "audience": "landlord",
    "audienceLabel": "Landlord",
    "kind": "terms",
    "kindLabel": "Terms of Service",
    "title": "Terms of Service",
    "sections": [
      {
        "heading": "1. Platform Usage",
        "paragraphs": [
          "AptFindr is a localized web platform designed to help users search for and list apartments or boarding houses in La Paz, Iloilo City."
        ]
      },
      {
        "heading": "2. Account Information",
        "paragraphs": [
          "Users must provide accurate, complete, and up-to-date information when creating and maintaining their accounts. Landlords are responsible for ensuring that property and business information submitted for verification is accurate."
        ]
      },
      {
        "heading": "3. Property Listings",
        "paragraphs": [
          "Landlords must provide accurate information regarding property location, rental prices, room availability, amenities, utilities, house rules, and other listing details."
        ]
      },
      {
        "heading": "4. Verification",
        "paragraphs": [
          "Landlord accounts and property listings may be subject to administrative verification before being published on AptFindr"
        ]
      }
    ]
  },
  "landlord-privacy": {
    "id": "landlord-privacy",
    "audience": "landlord",
    "audienceLabel": "Landlord",
    "kind": "privacy",
    "kindLabel": "Privacy Policy",
    "title": "Privacy Policy",
    "sections": [
      {
        "heading": "1. Information We Collect",
        "paragraphs": [
          "AptFindr may collect personal information such as your name, mobile number, username, recovery email, business information, property information, and verification documents when necessary for account registration, verification, and listing management."
        ]
      },
      {
        "heading": "2. How Information is Used",
        "paragraphs": [
          "Your information is used exclusively to operate AptFindr, manage accounts and property listings, perform verification, facilitate safe communication between users, process reports and appeals, and maintain platform security."
        ]
      },
      {
        "heading": "3. Data Security",
        "paragraphs": [
          "We use secure database systems, such as Supabase, to protect your personal information against unauthorized access, alteration, or loss."
        ]
      },
      {
        "heading": "4. Data Sharing",
        "paragraphs": [
          "AptFindr does not sell your personal information. We may share information only when necessary to operate the platform, comply with applicable legal requirements, protect users, or provide services through authorized third-party service providers (e.g., Supabase)."
        ]
      }
    ]
  }
};

export const POLICY_IDS = Object.keys(POLICIES);

export function getPolicy(id) {
  return POLICIES[id] ?? null;
}
