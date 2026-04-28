import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function CatchPage() {
    const [waterbodies, setWaterbodies] = useState([]);
    const [selectedWaterbodyId, setSelectedWaterbodyId] = useState("");
    const [reports, setReports] = useState([]);
    const [trends, setTrends] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [species, setSpecies] = useState("");
    const [method, setMethod] = useState("");
    const [notes, setNotes] = useState("");
    const [visibility, setVisibility] = useState("PUBLIC");
    const [submitting, setSubmitting] = useState(false);

    const { isLoggedIn } = useAuth();

    useEffect(() => {
        api.get("/waterbodies")
            .then((res) => {
                const list = Array.isArray(res) ? res : res?.data || [];
                setWaterbodies(list);
                if (list.length > 0) setSelectedWaterbodyId(list[0].id);
            })
            .catch((err) => {
                console.error(err);
                setError("Failed to load waterbodies.");
            });
    }, []);

    useEffect(() => {
        if (!selectedWaterbodyId) return;
        loadReports();
    }, [selectedWaterbodyId]);

    async function loadReports() {
        setLoading(true);
        setError("");
        try {
            const [reportsRes, trendsRes] = await Promise.allSettled([
                api.get(`/catch-reports?waterbody_id=${selectedWaterbodyId}&limit=20`),
                api.get(`/catch-reports/trends?waterbody_id=${selectedWaterbodyId}`),
            ]);
            if (reportsRes.status === "fulfilled") {
                setReports(reportsRes.value?.data || []);
            }
            if (trendsRes.status === "fulfilled") {
                setTrends(trendsRes.value);
            }
        } catch (err) {
            setError(err.message || "Failed to load reports.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedWaterbodyId || !species.trim() || !method.trim()) return;
        setSubmitting(true);
        try {
            await api.post("/catch-reports", {
                waterbodyId: selectedWaterbodyId,
                species: species.trim(),
                method: method.trim(),
                notes: notes.trim() || undefined,
                visibility,
            });
            setSpecies("");
            setMethod("");
            setNotes("");
            await loadReports();
            alert("Report submitted!");
        } catch (err) {
            console.error(err);
            alert(err.message || "Submission failed");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleFlag(id) {
        if (!confirm("Flag this report for moderator review?")) return;
        try {
            await api.post(`/catch-reports/${id}/flag`);
            alert("Report flagged.");
            loadReports();
        } catch (err) {
            alert(err.message || "Failed to flag report");
        }
    }

    const topSpecies = trends?.weekly?.topSpecies || [];
    const topMethods = trends?.weekly?.topMethods || [];

    return (
        <div className="page-shell">
            <section className="page-hero">
                <div>
                    <p className="eyebrow">COMMUNITY DATA</p>
                    <h1 className="page-title">Catch Reports & Trends</h1>
                    <p className="page-subtitle">
                        Recent angler-submitted catches and the trends emerging across this waterbody.
                    </p>
                </div>
                <div className="status-pill info">Community Reports Live</div>
            </section>

            <div className="content-card">
                <label style={{ fontSize: "13px", fontWeight: 600, marginRight: "8px" }}>
                    Waterbody:
                </label>
                <select
                    value={selectedWaterbodyId}
                    onChange={(e) => setSelectedWaterbodyId(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "6px" }}
                >
                    {waterbodies.map((w) => (
                        <option key={w.id} value={w.id}>
                            {w.name} ({w.state})
                        </option>
                    ))}
                </select>
                {error && <p style={{ color: "#dc2626", marginTop: "8px" }}>{error}</p>}
            </div>

            {isLoggedIn ? (
                <form className="content-card" onSubmit={handleSubmit}>
                    <h3>Submit a catch report</h3>
                    <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "1fr 1fr" }}>
                        <input
                            type="text"
                            placeholder="Species (e.g. Largemouth Bass)"
                            value={species}
                            onChange={(e) => setSpecies(e.target.value)}
                            required
                            maxLength={100}
                        />
                        <input
                            type="text"
                            placeholder="Method (e.g. Plastic Worm)"
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            required
                            maxLength={100}
                        />
                    </div>
                    <textarea
                        placeholder="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={500}
                        rows={3}
                        style={{ width: "100%", marginTop: "8px", padding: "6px" }}
                    />
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
                        <label style={{ fontSize: "13px" }}>
                            <input
                                type="radio"
                                checked={visibility === "PUBLIC"}
                                onChange={() => setVisibility("PUBLIC")}
                            />{" "}
                            Public
                        </label>
                        <label style={{ fontSize: "13px" }}>
                            <input
                                type="radio"
                                checked={visibility === "ANONYMOUS"}
                                onChange={() => setVisibility("ANONYMOUS")}
                            />{" "}
                            Anonymous
                        </label>
                        <button type="submit" disabled={submitting} style={{ marginLeft: "auto" }}>
                            {submitting ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="content-card">
                    <p style={{ fontSize: "13px", color: "var(--text3)" }}>
                        Log in to submit your own catch reports.
                    </p>
                </div>
            )}

            <section className="content-grid two-col">
                <div className="content-card">
                    <div className="card-header">
                        <h3>Recent Catch Reports</h3>
                        <span className="card-badge">Latest Entries</span>
                    </div>

                    {loading && <p>Loading...</p>}
                    {!loading && reports.length === 0 && (
                        <p style={{ color: "var(--text3)" }}>No reports yet for this waterbody.</p>
                    )}

                    <div className="stack-list">
                        {reports.map((report) => (
                            <div key={report.id} className="list-card">
                                <div className="list-card-top">
                                    <h4>{report.species}</h4>
                                    <span className="mini-date">
                                        {new Date(report.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="report-grid">
                                    <p>
                                        <span>Method</span>
                                        <strong>{report.method}</strong>
                                    </p>
                                    <p>
                                        <span>Angler</span>
                                        <strong>{report.user?.displayName || "Anonymous"}</strong>
                                    </p>
                                    {report.notes && (
                                        <p style={{ gridColumn: "span 2" }}>
                                            <span>Notes</span>
                                            <strong>{report.notes}</strong>
                                        </p>
                                    )}
                                </div>
                                {isLoggedIn && (
                                    <button
                                        onClick={() => handleFlag(report.id)}
                                        style={{
                                            background: "transparent",
                                            color: "#dc2626",
                                            border: "1px solid #dc2626",
                                            fontSize: "11px",
                                            padding: "4px 8px",
                                            marginTop: "8px",
                                        }}
                                    >
                                        Flag
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="content-card">
                    <div className="card-header">
                        <h3>Trend Highlights</h3>
                        <span className="card-badge soft">Weekly Snapshot</span>
                    </div>

                    <div className="stack-list">
                        <div className="trend-card">
                            <p className="trend-label">Reports last 7 days</p>
                            <h4>{trends?.weekly?.totalReports ?? 0}</h4>
                        </div>
                        <div className="trend-card">
                            <p className="trend-label">Top species (week)</p>
                            <h4>{topSpecies[0]?.name || "-"}</h4>
                            <p>
                                {topSpecies.map((s) => `${s.name} (${s.count})`).join(" - ") || "No data yet."}
                            </p>
                        </div>
                        <div className="trend-card">
                            <p className="trend-label">Top methods (week)</p>
                            <h4>{topMethods[0]?.name || "-"}</h4>
                            <p>
                                {topMethods.map((m) => `${m.name} (${m.count})`).join(" - ") || "No data yet."}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="content-card summary-card">
                <div className="card-header">
                    <h3>Product Value</h3>
                    <span className="card-badge">Insights</span>
                </div>
                <p>
                    Catch reports give the platform a community-driven layer that goes beyond
                    static regulations or weather alone. Surfacing recent catches and simple
                    trend summaries helps anglers understand real fishing activity in nearby
                    locations.
                </p>
            </section>
        </div>
    );
}
