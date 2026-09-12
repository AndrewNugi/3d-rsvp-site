"use client";

import { useState, type FormEvent } from "react";

export default function RsvpForm() {
    const [name, setName] = useState("");
    const [attending, setAttending] = useState<boolean | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasPlusOne, setHasPlusOne] = useState(false);
    const [plusOnes, setPlusOnes] = useState<string[]>([]);

    const PLUS_ONES_ENABLED = false;

    const MAX_GUESTS = 3;

    const addGuest = () => {
        if (plusOnes.length < MAX_GUESTS) setPlusOnes([...plusOnes, ""]);
    };

    const updateGuest = (i: number, value: string) => {
        setPlusOnes(plusOnes.map((g, idx) => (idx === i ? value : g)));
    };

    const removeGuest = (i: number) => {
        setPlusOnes(plusOnes.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedName = name.trim();
        const cleanGuests = plusOnes.map((g) => g.trim()).filter(Boolean);

        if (!trimmedName || attending === null) return;
        if (PLUS_ONES_ENABLED && attending && plusOnes.some((g) => !g.trim())) return;   // blank field left open

        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch("/api/rsvp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: trimmedName,
                    attending,
                    plusOnes: PLUS_ONES_ENABLED && attending ? cleanGuests : [],
                }),
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
                            ? plusOnes.length > 0
                                ? `Yay, ${name}! We can't wait to celebrate with you and your ${plusOnes.length === 1 ? "guest" : `${plusOnes.length} guests`
                                }.`
                                : `Yay, ${name}! We can't wait to celebrate with you.`
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
                                onClick={() => {
                                    setAttending(false);
                                    setPlusOnes([]);
                                }}
                            >
                                Can&apos;t make it 💔
                            </button>
                        </div>
                    </div>
                    {PLUS_ONES_ENABLED && attending === true && (
                        <div className="rsvp-field">
                            <span className="rsvp-label">Bringing someone?</span>
                            <div className="rsvp-toggle">
                                <button
                                    type="button"
                                    className={`rsvp-toggle-btn${hasPlusOne ? " selected" : ""}`}
                                    aria-pressed={hasPlusOne}
                                    onClick={() => setHasPlusOne(true)}
                                >
                                    Yes, plus one 💞
                                </button>
                                <button
                                    type="button"
                                    className={`rsvp-toggle-btn decline${!hasPlusOne ? " selected" : ""}`}
                                    aria-pressed={!hasPlusOne}
                                    onClick={() => {
                                        setHasPlusOne(false);
                                        setPlusOnes([]);
                                    }}
                                >
                                    Just me
                                </button>
                            </div>
                        </div>
                    )}

                    {PLUS_ONES_ENABLED && attending === true && (
                        <div className="rsvp-field">
                            <span className="rsvp-label">
                                Bringing anyone? ({plusOnes.length}/{MAX_GUESTS})
                            </span>

                            {plusOnes.map((guest, i) => (
                                <div key={i} className="rsvp-guest-row">
                                    <input
                                        type="text"
                                        className="rsvp-input"
                                        placeholder={`Guest ${i + 1} full name`}
                                        value={guest}
                                        onChange={(e) => updateGuest(i, e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="rsvp-guest-remove"
                                        onClick={() => removeGuest(i)}
                                        aria-label={`Remove guest ${i + 1}`}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}

                            {plusOnes.length < MAX_GUESTS && (
                                <button type="button" className="rsvp-add-guest" onClick={addGuest}>
                                    + Add a guest
                                </button>
                            )}
                        </div>
                    )}

                    {error && <p className="rsvp-error">{error}</p>}

                    <button
                        type="submit"
                        className="rsvp-submit"
                        disabled={
                            !name.trim() ||
                            attending === null ||
                            (PLUS_ONES_ENABLED && attending === true && plusOnes.some((g) => !g.trim())) ||
                            submitting
                        }
                    >
                        {submitting ? "Sending…" : "Send RSVP"}
                    </button>
                </form>
            )}
        </div>
    );
}