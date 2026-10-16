import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import "./contact.css";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xrperang";

/**
 * Public contact form shown from the landing-page footer.
 */
export function FooterContactLink() {
    const [open, setOpen] = useState(false);
    const [submission, setSubmission] = useState("idle");
    const [submissionError, setSubmissionError] = useState("");
    const [form, setForm] = useState({
        fullName: "",
        email: "",
        inquiryType: "",
        message: "",
    });

    const updateField = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        setSubmission("sending");
        setSubmissionError("");

        try {
            const response = await fetch(FORMSPREE_ENDPOINT, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: form.fullName,
                    email: form.email,
                    inquiry_type: form.inquiryType,
                    message: form.message,
                    _subject: `AptFindr contact: ${form.inquiryType}`,
                }),
            });

            if (!response.ok) {
                const result = await response.json().catch(() => null);
                const message = result?.errors
                    ?.map((error) => error.message)
                    .filter(Boolean)
                    .join(" ");
                throw new Error(message || "Your message could not be sent. Please try again.");
            }

            setForm({
                fullName: "",
                email: "",
                inquiryType: "",
                message: "",
            });
            setSubmission("success");
        } catch (error) {
            setSubmissionError(
                error instanceof Error
                    ? error.message
                    : "Your message could not be sent. Please try again."
            );
            setSubmission("error");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="landing-footer-link landing-footer-policy-link"
                >
                    Contact Us
                </button>
            </DialogTrigger>

            <DialogContent
                className="landing-contact-dialog"
                overlayClassName="landing-contact-overlay"
                showCloseButton={false}
                aria-describedby="landing-contact-description"
            >
                <DialogTitle className="landing-contact-title">
                    Contact Us
                </DialogTitle>
                <DialogDescription
                    id="landing-contact-description"
                    className="landing-contact-description"
                >
                    Have a question or need assistance? Send us a message and the
                    AptFindr support team will help with your account, apartment
                    listings, reports, or technical concerns.
                </DialogDescription>

                <form className="landing-contact-form" onSubmit={sendMessage}>
                    <h2>Send us a message</h2>

                    <div className="landing-contact-name-email">
                        <label className="landing-contact-field" htmlFor="landing-contact-name">
                            <span>Full Name <b aria-hidden="true">*</b></span>
                            <input
                                id="landing-contact-name"
                                name="fullName"
                                type="text"
                                autoComplete="name"
                                placeholder="Enter your full name"
                                value={form.fullName}
                                onChange={updateField}
                                required
                            />
                        </label>

                        <label className="landing-contact-field" htmlFor="landing-contact-email">
                            <span>Email Address <b aria-hidden="true">*</b></span>
                            <input
                                id="landing-contact-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="Enter your email"
                                value={form.email}
                                onChange={updateField}
                                required
                            />
                        </label>
                    </div>

                    <label className="landing-contact-field" htmlFor="landing-contact-inquiry">
                        <span>Inquiry Type <b aria-hidden="true">*</b></span>
                        <select
                            id="landing-contact-inquiry"
                            name="inquiryType"
                            value={form.inquiryType}
                            onChange={updateField}
                            required
                        >
                            <option value="" disabled>Select an inquiry type</option>
                            <option value="General Inquiry">General Inquiry</option>
                            <option value="Registration & Login">Registration &amp; Login</option>
                            <option value="Apartment Listing Inquiry">Apartment Listing Inquiry</option>
                            <option value="Report or Appeal Concern">Report or Appeal Concern</option>
                            <option value="Technical Support">Technical Support</option>
                            <option value="Other">Other</option>
                        </select>
                    </label>

                    <label className="landing-contact-field" htmlFor="landing-contact-message">
                        <span>Message <b aria-hidden="true">*</b></span>
                        <textarea
                            id="landing-contact-message"
                            name="message"
                            placeholder="Explain your concern or questions"
                            value={form.message}
                            onChange={updateField}
                            required
                        />
                    </label>

                    <button
                        type="submit"
                        className="landing-contact-send"
                        disabled={submission === "sending"}
                    >
                        {submission === "sending" ? "Sending..." : "Send Message"}
                    </button>

                    {submission === "success" && (
                        <p className="landing-contact-status is-success" role="status">
                            Thanks! Your message has been sent to AptFindr support.
                        </p>
                    )}

                    {submission === "error" && (
                        <p className="landing-contact-status is-error" role="alert">
                            {submissionError}
                        </p>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}
