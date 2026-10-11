import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PolicyDocument } from "./PolicyDocument";
import "./legal.css";
import "./footerPolicy.css";

const sharing = "Certain information may be visible to other users when necessary for AptFindr's features, such as apartment listing information. Personal information is not sold or rented. Information may be processed by service providers necessary to operate the platform or disclosed when required by applicable law.";
const section = (heading, text) => ({ heading, paragraphs: [text] });
const documents = {
 terms: { title: "Terms of Service", sections: [
  section("1.Acceptance of Terms", "By accessing or using AptFindr, you agree to comply with these Terms of Service. If you do not agree with these terms, please do not use the platform."),
  section("2.Platform Role and Disclaimer", "AptFindr is a platform designed to help tenants discover apartment listings and allow landlords to manage their properties in La Paz, Iloilo City. AptFindr is not a property owner, broker, or party to rental agreements or transactions between tenants and landlords. Users are responsible for evaluating information and making their own rental decisions."),
  section("3.User Responsibilities", sharing),
  section("4.Listings and Verification", "Landlords are responsible for the accuracy of their property and room information. Landlord accounts and apartment listings may undergo administrative review before verification or publication. Verification indicates completion of AptFindr's review process and does not guarantee or endorse a landlord or property."),
  section("5.Intellectual Property", "AptFindr's original design, software, branding, and platform materials are protected from unauthorized copying, modification, distribution, or commercial use, subject to applicable rights and licenses."),
  section("6.Changes to the Terms", "These Terms of Service may be updated when necessary to reflect changes to AptFindr or its policies. Continued use of the platform after updated terms take effect constitutes acceptance of those changes.")
 ] },
 privacy: { title: "Privacy Policy", sections: [
  section("1.Information We Collect", "AptFindr may collect account information such as name, email address, contact number, username, and authentication information. Landlords may also provide property information, photos, and verification documents such as business permits. Users may provide additional information through reports, appeals, inquiries, and other platform features."),
  section("2.How We Use Information", "Collected information is used to operate and maintain AptFindr, manage user accounts and apartment listings, perform administrative verification and review, process reports and appeals, facilitate platform features, and maintain platform security."),
  section("3.Information Visibility and Sharing", sharing),
  section("4.Data Security", "AptFindr uses reasonable technical and organizational measures to protect personal information against unauthorized access, alteration, disclosure, or loss. However, no electronic system can guarantee absolute security."),
  section("5.User Responsibility", "Users are responsible for keeping their account credentials secure and for ensuring that information they provide to AptFindr is accurate and up to date."),
  section("6.Policy Updates", "This Privacy Policy may be updated when AptFindr's features or data-handling practices change."),
  section("7.Contact Us", "Questions or concerns regarding this Privacy Policy may be submitted through AptFindr's Contact Us or support channel.")
 ] }
};

export function FooterPolicyLink({ kind }) {
 const [open, setOpen] = useState(false);
 const policy = documents[kind];
 return <Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild><button type="button" className="landing-footer-link landing-footer-policy-link">{policy.title}</button></DialogTrigger>
  <DialogContent className="apf-policy-dialog apf-footer-policy-dialog" overlayClassName="apf-policy-overlay" aria-describedby={undefined}>
   <header className="apf-policy-head"><DialogTitle className="apf-policy-title">{policy.title}</DialogTitle></header>
   <div className="apf-policy-scroll" tabIndex={0} role="region" aria-label={policy.title + " content"}><PolicyDocument policy={policy}/></div>
  </DialogContent>
 </Dialog>;
}
