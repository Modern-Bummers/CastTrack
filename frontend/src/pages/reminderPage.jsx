import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function ReminderPage() {
    const { isLoggedIn } = useAuth();

    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [state, setState] = useState("CA");
    const [licenseExpiration, setLicenseExpiration] = useState("");
    const [remindDaysBefore, setRemindDaysBefore] = useState(30);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isLoggedIn) loadReminders();
        else setReminders([]);
    }, [isLoggedIn]);

    async function loadReminders() {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/reminders");
            setReminders(res?.data || []);
        } catch (err) {
            setError(err.message || "Failed to load reminders.");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e) {
        e.preventDefault();
        if (!licenseExpiration) return;
        setSubmitting(true);
        try {
            await api.post("/reminders", {
                state: state.toUpperCase(),
                licenseExpiration,
                remindDaysBefore: Number(remindDaysBefore),
            });
            setLicenseExpiration("");
            await loadReminders();
            alert("Reminder created.");
        } catch (err) {
            alert(err.message || "Failed to create reminder.");
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleEnabled(reminder) {
        try {
            await api.patch(`/reminders/${reminder.id}`, {
                enabled: !reminder.enabled,
            });
            loadReminders();
        } catch (err) {
            alert(err.message || "Failed to update reminder.");
        }
    }

    async function handleDelete(id) {
        if (!confirm("Delete this reminder?")) return;
        try {
            await api.delete(`/reminders/${id}`);
            loadReminders();
        } catch (err) {
            alert(err.message || "Failed to delete reminder.");
        }
    }

    if (!isLoggedIn) {
        return (
            <div className="page-shell">
                <section className="page-hero">
                    <div>
                        <p className="eyebrow">LICENSE TRACKING</p>
                        <h1 className="page-title">License Reminders</h1>
                        <p className="page-subtitle">
                            Get an email before your fishing license expires.
                        </p>
                    </div>
                </section>

                <div className="content-card">
                    <p style={{ fontSize: "13px", color: "var(--text3)" }}>
                        Log in to manage license reminders.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <section className="page-hero">
                <div>
                    <p className="eyebrow">LICENSE TRACKING</p>
                    <h1 className="page-title">License Reminders</h1>
                    <p className="page-subtitle">
                        Set the date your fishing license expires and we'll email you
                        before it lapses.
                    </p>
                </div>
                <div className="status-pill info">
                    {reminders.length} {reminders.length === 1 ? "Reminder" : "Reminders"}
                </div>
            </section>

            <form className="content-card" onSubmit={handleCreate}>
                <h3>Add a reminder</h3>
                <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "1fr 1fr 1fr" }}>
                    <label style={{ fontSize: "13px" }}>
                        State
                        <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            maxLength={2}
                            required
                            style={{ width: "100%", textTransform: "uppercase" }}
                        />
                    </label>
                    <label style={{ fontSize: "13px" }}>
                        License expiration
                        <input
                            type="date"
                            value={licenseExpiration}
                            onChange={(e) => setLicenseExpiration(e.target.value)}
                            required
                            style={{ width: "100%" }}
                        />
                    </label>
                    <label style={{ fontSize: "13px" }}>
                        Notify days before
                        <input
                            type="number"
                            min={1}
                            max={90}
                            value={remindDaysBefore}
                            onChange={(e) => setRemindDaysBefore(e.target.value)}
                            required
                            style={{ width: "100%" }}
                        />
                    </label>
                </div>
                <div style={{ marginTop: "8px" }}>
                    <button type="submit" disabled={submitting}>
                        {submitting ? "Adding..." : "Add reminder"}
                    </button>
                </div>
            </form>

            {loading && <div className="content-card"><p>Loading...</p></div>}
            {error && <div className="content-card"><p style={{ color: "#dc2626" }}>{error}</p></div>}

            <section className="content-card">
                <div className="card-header">
                    <h3>Your reminders</h3>
                    <span className="card-badge">Active</span>
                </div>

                {reminders.length === 0 && !loading && (
                    <p style={{ color: "var(--text3)", fontSize: "13px" }}>
                        No reminders yet. Add one above.
                    </p>
                )}

                <div className="stack-list">
                    {reminders.map((r) => (
                        <div key={r.id} className="list-card">
                            <div className="list-card-top">
                                <h4>
                                    {r.state} license — expires{" "}
                                    {new Date(r.licenseExpiration).toLocaleDateString()}
                                </h4>
                                <span className="card-badge soft">
                                    {r.enabled ? "Enabled" : "Paused"}
                                </span>
                            </div>
                            <p style={{ fontSize: "13px", color: "var(--text2)" }}>
                                You'll be notified <strong>{r.remindDaysBefore}</strong> days before.
                            </p>
                            {r.lastSentAt && (
                                <p style={{ fontSize: "12px", color: "var(--text3)" }}>
                                    Last sent: {new Date(r.lastSentAt).toLocaleString()}
                                </p>
                            )}
                            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                <button onClick={() => toggleEnabled(r)}>
                                    {r.enabled ? "Pause" : "Resume"}
                                </button>
                                <button
                                    onClick={() => handleDelete(r.id)}
                                    style={{ background: "#dc2626", color: "white" }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="content-card summary-card">
                <div className="card-header">
                    <h3>How reminders work</h3>
                    <span className="card-badge">Heads up</span>
                </div>
                <p style={{ fontSize: "13px" }}>
                    A daily job checks each reminder. If today is within
                    <strong> {" "}remindDaysBefore </strong> days of your license expiration,
                    we send an email to the address on your account. Each reminder fires at
                    most once per day.
                </p>
            </section>
        </div>
    );
}
