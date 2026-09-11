"use client";

import { useState, type FormEvent } from "react";

export default function RsvpForm() {
    const [name, setName] = useState("");
    const [attending, setAttending] = useState<boolean | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName || attending === null) return;

        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch("/api/rsvp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmedName, attending }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setError(data?.error ?? "Something went wrong. Please try again.");
                return;
            }

            setSubmitted(true);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rsvp-card">
            <h2 className="rsvp-heading">RSVP</h2>
            <p className="rsvp-subheading">Let us know if you can celebrate with us!</p>

            {submitted ? (
                <div className="rsvp-success">
                    <span className="rsvp-success-icon">{attending ? "🎉" : "💌"}</span>
                    <p>
                        {attending
                            ? `Yay, ${name}! We can't wait to celebrate with you.`
                            : `Thanks for letting us know, ${name}. You'll be missed!`}
                    </p>
                    <button
                        type="button"
                        className="rsvp-reset"
                        onClick={() => setSubmitted(false)}
                    >
                        Edit response
                    </button>
                </div>
            ) : (
                <form className="rsvp-form" onSubmit={handleSubmit}>
                    <label className="rsvp-field">
                        <span className="rsvp-label">Full name</span>
                        <input
                            type="text"
                            name="fullName"
                            className="rsvp-input"
                            placeholder="Your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </label>

                    <div className="rsvp-field">
                        <span className="rsvp-label">Will you be attending?</span>
                        <div className="rsvp-toggle" role="radiogroup" aria-label="Attendance">
                            <button
                                type="button"
                                className={`rsvp-toggle-btn${attending === true ? " selected" : ""}`}
                                aria-pressed={attending === true}
                                onClick={() => setAttending(true)}
                            >
                                Yes, I&apos;ll be there 🎉
                            </button>
                            <button
                                type="button"
                                className={`rsvp-toggle-btn decline${attending === false ? " selected" : ""}`}
                                aria-pressed={attending === false}
                                onClick={() => setAttending(false)}
                            >
                                Can&apos;t make it 💔
                            </button>
                        </div>
                    </div>

                    {error && <p className="rsvp-error">{error}</p>}

                    <button
                        type="submit"
                        className="rsvp-submit"
                        disabled={!name.trim() || attending === null || submitting}
                    >
                        {submitting ? "Sending…" : "Send RSVP"}
                    </button>
                </form>
            )}
        </div>
    );
}