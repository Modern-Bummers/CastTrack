import React, { useEffect, useState, useMemo, useRef } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import AddCatch from "../components/addCatch";


export default function CatchPage() {
    const [waterbodies, setWaterbodies] = useState([]);
    const [reports, setReports] = useState([]);
    const [myReports, setMyReports] = useState([]);
    const [trends, setTrends] = useState(null);
    const [loading, setLoading] = useState(false);
    const loadingRef = useRef(false);
    const trendsLoadingRef = useRef(false);

    const [error, setError] = useState("");

    const { role, isLoggedIn, displayName } = useAuth();
    const canManage = role === "ADMIN" || role === "MODERATOR";
    const canDelete = role === "ADMIN";

    // Initial waterbody list
    useEffect(() => {
        api.get("/waterbodies")
            .then((res) => {
                const list = Array.isArray(res) ? res : res?.data || [];
                setWaterbodies(list);
            })
            .catch((err) => {
                console.error(err);
                setError("Failed to load waterbodies.");
            });
    }, []);

    async function loadReports() {
        if (loadingRef.current) return;

        loadingRef.current = true;
        setLoading(true);
        setError("");

        try {
            const reportsRes = await api.get("/catch-reports?limit=500");
            setReports(reportsRes?.data || []);

            if (!trendsLoadingRef.current && waterbodies.length) {
                trendsLoadingRef.current = true;

                const trendsRes = await Promise.allSettled(
                    waterbodies.map((w) =>
                        api.get(`/catch-reports/trends?waterbody_id=${w.id}`)
                    )
                );

                const validTrends = trendsRes
                    .filter(r => r.status === "fulfilled")
                    .map(r => r.value?.data);

                setTrends({ raw: validTrends });
            }

        } catch (err) {
            console.error(err);
            setError("Failed to load catch reports.");
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }

    // Reload reports + trends whenever the waterbody changes
    useEffect(() => {
        if (waterbodies.length === 0) return;
        loadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waterbodies]);

    // Load the current user's own reports whenever they sign in
    async function loadMyReports() {
        try {
            const res = await api.get("/catch-reports/mine?limit=50");
            setMyReports(res?.data || []);
        } catch (err) {
            console.error("Failed to load my reports:", err);
            setMyReports([]);
        }
    }

    useEffect(() => {
        if (isLoggedIn) {
            loadMyReports();
        } else {
            setMyReports([]);
        }
    }, [isLoggedIn]);

    async function handleDelete(id) {
        if (!confirm("Delete this catch report?")) return;

        try {
            await api.delete(`/catch-reports/${id}`);
            setReports(prev => prev.filter(r => r.id !== id));
            setMyReports(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error("DELETE ERROR:", err.message);
            alert(err.message || "Failed to delete report");
        }
    }

    async function handleFlag(id) {
        if (!confirm("Flag this report for moderator review?")) return;
        try {
            await api.post(`/catch-reports/${id}/flag`);

            setReports(prev =>
                prev.map(r =>
                    r.id === id ? { ...r, flagged: true } : r
                )
            );
            alert("Report flagged.");
        } catch (err) {
            alert(err.message || "Failed to flag report");
        }
    }

    const { topSpecies, topLocation, topTime } = useMemo(() => {
        const speciesCount = {};
        const locationCount = {};
        const timeCount = {};

        reports.forEach((r) => {
            // Species
            if (r.species) {
                speciesCount[r.species] = (speciesCount[r.species] || 0) + 1;
            }

            // Location (FIXED)
            if (r.waterbodyId) {
                locationCount[r.waterbodyId] =
                    (locationCount[r.waterbodyId] || 0) + 1;
            }

            // Time bucket (FIXED from createdAt)
            if (r.createdAt) {
                const hour = new Date(r.createdAt).getHours();
                const label =
                    hour < 6 ? "Night" :
                    hour < 12 ? "Morning" :
                    hour < 18 ? "Afternoon" :
                    "Evening";

                timeCount[label] = (timeCount[label] || 0) + 1;
            }
        });

        const getTop = (obj) =>
            Object.entries(obj)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        return {
            topSpecies: getTop(speciesCount),
            topLocation: getTop(locationCount),
            topTime: getTop(timeCount),
        };
    }, [reports]);


    return (
        <div className="page-shell">
            <section className="page-hero">
                <div>
                    <p className="eyebrow">COMMUNITY DATA</p>
                    <h1 className="page-title">Catch Reports & Trends</h1>
                    <p className="page-subtitle">
                        Review recent angler-submitted catches and identify patterns that
                        help users understand what is being caught and where activity is rising.
                    </p>
                </div>
                <div className="status-pill info">Community Reports Live</div>
            </section>

            {isLoggedIn && (
                <section className="content-card">
                    <div className="card-header">
                        <h3>My Catch Reports</h3>
                        <span className="card-badge soft">
                            {myReports.length} {myReports.length === 1 ? "report" : "reports"}
                        </span>
                    </div>
                    {myReports.length === 0 ? (
                        <p style={{ fontSize: "13px", color: "var(--text3)" }}>
                            You haven&apos;t submitted any catch reports yet. Tap the + button
                            below to add one.
                        </p>
                    ) : (
                        <div className="stack-list">
                            {myReports.map((report) => (
                                <div key={report.id} className="list-card">
                                    <div className="list-card-top">
                                        <h4>{report.species}</h4>
                                        <span className="mini-date">
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="report-grid">
                                        <p>
                                            <span>Location</span>
                                            <strong>
                                                {report.waterbody?.name || "Unknown"}
                                            </strong>
                                        </p>
                                        <p>
                                            <span>Method</span>
                                            <strong>{report.method}</strong>
                                        </p>
                                        {report.notes && (
                                            <p style={{ gridColumn: "span 2" }}>
                                                <span>Notes</span>
                                                <strong>{report.notes}</strong>
                                            </p>
                                        )}
                                        <p>
                                            <span>Visibility</span>
                                            <strong>{report.visibility}</strong>
                                        </p>
                                        {report.flagged && (
                                            <p>
                                                <span>Status</span>
                                                <strong style={{ color: "#dc2626" }}>
                                                    Flagged
                                                </strong>
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                        <button
                                            onClick={() => handleDelete(report.id)}
                                            style={{ background: "#dc2626", color: "white" }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <section className="content-grid two-col">
                <div className="content-card">
                    <div className="card-header">
                        <h3>Recent Catch Reports</h3>
                        <span className="card-badge">Latest Entries</span>
                    </div>

                    <div className="stack-list">
                        {!loading && reports.length === 0 && (
                            <div className="empty-state">
                                No catch reports yet.
                            </div>
                        )}
                        {reports.map((report) => (
                            <div key={report.id} className="list-card">
                                <div className="list-card-top">
                                    <h4>{report.species}</h4>
                                    <div>
                                        <span className="username">
                                            {report.user?.displayName || "Unknown"}
                                        </span>
                                    </div>
                                </div>
                                <div className="report-grid">
                                    <p><span>Location</span><strong>
                                        {waterbodies.find(w => w.id === report.waterbodyId)?.name || "Unknown"}
                                    </strong></p>
                                    <p><span>Method</span><strong>{report.method}</strong></p>
                                    <p><span>Notes</span><strong>{report.notes}</strong></p>
                                </div>
                                {canManage && (
                                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                                        {canDelete && (
                                            <button onClick={() => handleDelete(report.id)}>
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
                        <h3>Trend Highlights</h3>
                        <span className="card-badge soft">Weekly Snapshot</span>
                    </div>

                    <div className="stack-list">
                        <div className="trend-card">
                            <p className="trend-label">Top Species this week</p>
                            <h4>{topSpecies || "No data"}</h4>
                            <p>Most frequently reported across active locations.</p>
                        </div>

                        <div className="trend-card">
                            <p className="trend-label">Most Active Location</p>
                            <h4>
                                {waterbodies.find(w => w.id === topLocation)?.name || "No data"}
                            </h4>
                            <p>Highest recent report volume in the sample data.</p>
                        </div>

                        <div className="trend-card">
                            <p className="trend-label">Best reported time</p>
                            <h4>{topTime || "No data"}</h4>
                            <p>Most successful reports were submitted before 10 AM.</p>
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
                    static regulations or weather alone. By surfacing recent catches and simple
                    trend summaries, CastTrack gives users a more practical idea of real fishing
                    activity in nearby locations.
                </p>
            </section>

            <AddCatch
                waterbodies={waterbodies}
                onSuccess={() => {
                    loadReports();
                    if (isLoggedIn) loadMyReports();
                }}
            />
        </div>
    );
}