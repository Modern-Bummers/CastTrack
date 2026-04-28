import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const CATEGORIES = [
    "ALGAL_BLOOM",
    "FREE_FISHING_DAY",
    "TOURNAMENT",
    "SEASONAL_CLOSURE",
    "ACCESS_RESTRICTION",
];

const ADVISORY_CATEGORIES = new Set([
    "ALGAL_BLOOM",
    "SEASONAL_CLOSURE",
    "ACCESS_RESTRICTION",
]);

export default function EventPage() {
    const { role } = useAuth();
    const canManageEvents = role === "ADMIN" || role === "MODERATOR";
    const canDeleteEvents = role === "ADMIN";

    const [events, setEvents] = useState([]);
    const [waterbodies, setWaterbodies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const emptyForm = {
        title: "",
        description: "",
        category: "TOURNAMENT",
        waterbodyId: "",
        startDate: "",
        endDate: "",
        sourceUrl: "",
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        loadAll();
    }, []);

    async function loadAll() {
        setLoading(true);
        setError("");
        try {
            const [evRes, wbRes] = await Promise.allSettled([
                api.get("/events"),
                api.get("/waterbodies"),
            ]);
            if (evRes.status === "fulfilled") {
                setEvents(evRes.value?.data || []);
            }
            if (wbRes.status === "fulfilled") {
                const list = Array.isArray(wbRes.value)
                    ? wbRes.value
                    : wbRes.value?.data || [];
                setWaterbodies(list);
            }
        } catch (err) {
            setError(err.message || "Failed to load events.");
        } finally {
            setLoading(false);
        }
    }

    function startCreate() {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(true);
    }

    function startEdit(event) {
        setEditingId(event.id);
        setForm({
            title: event.title,
            description: event.description,
            category: event.category,
            waterbodyId: event.waterbodyId || "",
            startDate: event.startDate ? event.startDate.slice(0, 10) : "",
            endDate: event.endDate ? event.endDate.slice(0, 10) : "",
            sourceUrl: event.sourceUrl || "",
        });
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const payload = {
                title: form.title,
                description: form.description,
                category: form.category,
                startDate: form.startDate,
                endDate: form.endDate || undefined,
                waterbodyId: form.waterbodyId || undefined,
                sourceUrl: form.sourceUrl || undefined,
            };
            if (editingId) {
                await api.patch(`/events/${editingId}`, payload);
                alert("Event updated.");
            } else {
                await api.post("/events", payload);
                alert("Event created.");
            }
            setShowForm(false);
            loadAll();
        } catch (err) {
            alert(err.message || "Save failed");
        }
    }

    async function handleDelete(id) {
        if (!confirm("Delete this event?")) return;
        try {
            await api.delete(`/events/${id}`);
            loadAll();
        } catch (err) {
            alert(err.message || "Delete failed");
        }
    }

    const advisories = events.filter((e) => ADVISORY_CATEGORIES.has(e.category));
    const upcoming = events.filter((e) => !ADVISORY_CATEGORIES.has(e.category));

    return (
        <div className="page-shell">
            <section className="page-hero">
                <div>
                    <p className="eyebrow">AWARENESS CENTER</p>
                    <h1 className="page-title">Events & Advisories</h1>
                    <p className="page-subtitle">
                        Track upcoming fishing events alongside active safety notices and
                        environmental alerts that may affect trip planning.
                    </p>
                </div>
                <div className="status-pill warning">
                    {advisories.length} Active{" "}
                    {advisories.length === 1 ? "Advisory" : "Advisories"}
                </div>
            </section>

            {loading && <div className="content-card"><p>Loading...</p></div>}
            {error && <div className="content-card"><p style={{ color: "#dc2626" }}>{error}</p></div>}

            {canManageEvents && showForm && (
                <form className="content-card" onSubmit={handleSubmit}>
                    <h3>{editingId ? "Edit event" : "Create event"}</h3>
                    <div style={{ display: "grid", gap: "8px" }}>
                        <input
                            type="text"
                            placeholder="Title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                            maxLength={200}
                        />
                        <textarea
                            placeholder="Description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            required
                            maxLength={2000}
                            rows={3}
                        />
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {c.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                        <select
                            value={form.waterbodyId}
                            onChange={(e) => setForm({ ...form, waterbodyId: e.target.value })}
                        >
                            <option value="">Statewide / no specific waterbody</option>
                            {waterbodies.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name} ({w.state})
                                </option>
                            ))}
                        </select>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <label style={{ flex: 1, fontSize: "13px" }}>
                                Start date
                                <input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                                    required
                                    style={{ width: "100%" }}
                                />
                            </label>
                            <label style={{ flex: 1, fontSize: "13px" }}>
                                End date (optional)
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                    style={{ width: "100%" }}
                                />
                            </label>
                        </div>
                        <input
                            type="url"
                            placeholder="Source URL (optional)"
                            value={form.sourceUrl}
                            onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button type="submit">{editingId ? "Save" : "Create"}</button>
                            <button type="button" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <section className="content-grid two-col">
                <div className="content-card">
                    <div className="card-header">
                        <h3>Active Advisories</h3>
                        <span className="card-badge warning-badge">Priority Alerts</span>
                    </div>

                    <div className="stack-list">
                        {advisories.length === 0 && (
                            <p style={{ color: "var(--text3)" }}>No current advisories.</p>
                        )}
                        {advisories.map((advisory) => (
                            <div key={advisory.id} className="list-card advisory-card">
                                <div className="list-card-top">
                                    <h4>{advisory.title}</h4>
                                    <span className="severity-tag high">
                                        {advisory.category.replace(/_/g, " ")}
                                    </span>
                                </div>
                                <p className="list-meta">
                                    {advisory.waterbody?.name || advisory.region || "Statewide"}
                                </p>
                                <p>{advisory.description}</p>
                                {canManageEvents && (
                                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                        <button onClick={() => startEdit(advisory)}>Edit</button>
                                        {canDeleteEvents && (
                                            <button
                                                onClick={() => handleDelete(advisory.id)}
                                                style={{ background: "#dc2626", color: "white" }}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="content-card">
                    <div className="card-header">
                        <h3>Upcoming Events</h3>
                        <span className="card-badge soft">Community Calendar</span>
                    </div>
                    {canManageEvents && (
                        <button onClick={startCreate} style={{ marginBottom: "8px" }}>
                            + Add Event
                        </button>
                    )}

                    <div className="stack-list">
                        {upcoming.length === 0 && (
                            <p style={{ color: "var(--text3)" }}>No upcoming events.</p>
                        )}
                        {upcoming.map((event) => (
                            <div key={event.id} className="list-card">
                                <div className="list-card-top">
                                    <h4>{event.title}</h4>
                                    <span className="mini-date">
                                        {new Date(event.startDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="list-meta">
                                    {event.waterbody?.name || event.region || "Statewide"}
                                </p>
                                <p>{event.description}</p>
                                {canManageEvents && (
                                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                        <button onClick={() => startEdit(event)}>Edit</button>
                                        {canDeleteEvents && (
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                style={{ background: "#dc2626", color: "white" }}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="content-card summary-card">
                <div className="card-header">
                    <h3>Why This Page Matters</h3>
                    <span className="card-badge">Planning Support</span>
                </div>
                <p>
                    This page combines helpful trip-planning information with public safety
                    context. Instead of requiring anglers to search multiple websites for
                    warnings, local events, or environmental notices, CastTrack brings that
                    information into one organized view.
                </p>
            </section>
        </div>
    );
}
