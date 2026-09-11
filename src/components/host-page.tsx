import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Rsvp = {
    id: number;
    name: string;
    attending: boolean;
    created_at: string;
};

export default function HostPage() {
    const [authed, setAuthed] = useState(false);
    const [checking, setChecking] = useState(true);
    const [rsvps, setRsvps] = useState<Rsvp[]>([]);

    // --- login ---
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // --- table ---
    const [query, setQuery] = useState("");
    const [pendingDelete, setPendingDelete] = useState<Rsvp | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadRsvps = useCallback(async () => {
        try {
            const res = await fetch("/api/host/rsvps", { credentials: "include" });
            if (!res.ok) {
                setAuthed(false);
                return false;
            }
            setRsvps(await res.json());
            setAuthed(true);
            return true;
        } catch {
            setAuthed(false);
            return false;
        }
    }, []);

    // on mount: try the existing cookie
    useEffect(() => {
        loadRsvps().finally(() => setChecking(false));
    }, [loadRsvps]);

    const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoginError(null);
        setSubmitting(true);
        try {
            const res = await fetch("/api/host/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ password }),
            });
            if (!res.ok) {
                setLoginError("Access denied.");
                return;
            }
            setPassword("");
            await loadRsvps();
        } catch {
            setLoginError("Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = async () => {
        await fetch("/api/host/logout", { method: "POST", credentials: "include" }).catch(() => {});
        setAuthed(false);
        setRsvps([]);
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/host/rsvps?id=${pendingDelete.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                setRsvps((prev) => prev.filter((r) => r.id !== pendingDelete.id));
            }
            setPendingDelete(null);
        } finally {
            setDeleting(false);
        }
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rsvps;
        return rsvps.filter((r) => r.name.toLowerCase().includes(q));
    }, [rsvps, query]);

    const attendingCount = rsvps.filter((r) => r.attending).length;
    const notAttendingCount = rsvps.length - attendingCount;

    // --- initial cookie check ---
    if (checking) {
        return (
            <main className="host-page">
                <div className="host-card">
                    <p className="host-subheading">Loading…</p>
                </div>
            </main>
        );
    }

    // --- login gate ---
    if (!authed) {
        return (
            <main className="host-page">
                <div className="host-card">
                    <h1 className="host-heading">Host Access</h1>
                    <p className="host-subheading">Enter the password to view RSVPs.</p>

                    <form className="host-login-form" onSubmit={handleLogin}>
                        <label className="host-login-field">
                            <span className="host-login-label">Password</span>
                            <input
                                type="password"
                                className="host-login-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                                required
                            />
                        </label>

                        {loginError && <p className="host-login-error">{loginError}</p>}

                        <button
                            type="submit"
                            className="host-login-submit"
                            disabled={submitting || !password}
                        >
                            {submitting ? "Checking…" : "Unlock"}
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    // --- table ---
    return (
        <main className="host-page">
            <div className="host-card host-card-wide">
                <div className="host-header">
                    <div>
                        <h1 className="host-heading">RSVPs</h1>
                        <p className="host-subheading">
                            {attendingCount} Attending · {notAttendingCount} Not Attending ·{" "}
                            {rsvps.length} Total
                        </p>
                    </div>
                    <div className="host-actions">
                        <a className="host-pdf-link" href="/api/host/pdf">
                            Download as PDF
                        </a>
                        <button type="button" className="host-logout" onClick={handleLogout}>
                            Log out
                        </button>
                    </div>
                </div>

                <label className="host-search">
                    <span className="host-search-icon" aria-hidden="true">⌕</span>
                    <input
                        type="search"
                        placeholder="Search by name…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search RSVPs by name"
                    />
                </label>

                <table className="host-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Attending</th>
                            <th>Submitted</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r) => (
                            <tr key={r.id}>
                                <td data-label="Name">{r.name}</td>
                                <td data-label="Attending">
                                    <span className={`host-status${r.attending ? " yes" : " no"}`}>
                                        {r.attending ? "Yes" : "No"}
                                    </span>
                                </td>
                                <td data-label="Submitted">
                                    {new Date(r.created_at).toLocaleString("en-US")}
                                </td>
                                <td className="host-table-actions">
                                    <button
                                        type="button"
                                        className="host-delete"
                                        onClick={() => setPendingDelete(r)}
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {rsvps.length === 0 && (
                            <tr>
                                <td colSpan={4} className="host-empty">No RSVPs yet.</td>
                            </tr>
                        )}

                        {rsvps.length > 0 && filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="host-empty">
                                    No RSVPs match &ldquo;{query}&rdquo;.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {pendingDelete && (
                <div
                    className="host-modal-backdrop"
                    onClick={() => !deleting && setPendingDelete(null)}
                >
                    <div
                        className="host-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="host-modal-heading"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p id="host-modal-heading" className="host-modal-text">
                            Remove <strong>{pendingDelete.name}</strong>&rsquo;s RSVP? This
                            can&rsquo;t be undone.
                        </p>
                        <div className="host-modal-actions">
                            <button
                                type="button"
                                className="host-modal-cancel"
                                onClick={() => setPendingDelete(null)}
                                disabled={deleting}
                                autoFocus
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="host-modal-confirm"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? "Removing…" : "Remove"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}