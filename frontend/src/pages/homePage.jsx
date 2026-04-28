import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import "../style.css";

function adaptWaterbody(w) {
    return {
        id: w.id,
        name: w.name,
        type: w.type ? w.type.charAt(0) + w.type.slice(1).toLowerCase() : "Waterbody",
        region: w.state ? `${w.state}` : "",
        latitude: w.latitude,
        longitude: w.longitude,
        activity: "Medium",
        species: [],
        reports: 0,
    };
}

function mapWeatherData(apiData) {
    const periods = apiData?.forecast?.periods || [];
    const current = periods[0] || {};
    return {
        temperature: current.temperature != null ? `${current.temperature}F` : "N/A",
        wind: current.windSpeed || "N/A",
        precipitation:
            current.probabilityOfPrecipitation?.value != null
                ? `${current.probabilityOfPrecipitation.value}%`
                : "N/A",
        forecast: pairForecastPeriods(periods).slice(0, 5).map((p) => ({
            day: p.name,
            icon: mapIcon(p.shortForecast),
            hi: p.high,
            lo: p.low,
        })),
        alerts: (apiData?.alerts || []).map((a) => ({
            title: a?.properties?.headline || "Weather Alert",
            text: a?.properties?.description || "",
        })),
    };
}

function pairForecastPeriods(periods) {
    const days = [];
    let i = 0;
    while (i < periods.length) {
        const a = periods[i];
        const b = periods[i + 1];
        if (a?.isDaytime && b && !b.isDaytime) {
            days.push({ name: a.name, shortForecast: a.shortForecast, high: a.temperature, low: b.temperature });
            i += 2;
        } else if (!a?.isDaytime && b?.isDaytime) {
            days.push({ name: b.name, shortForecast: b.shortForecast, high: b.temperature, low: a.temperature });
            i += 2;
        } else {
            days.push({ name: a.name, shortForecast: a.shortForecast, high: a.temperature, low: a.temperature - 10 });
            i += 1;
        }
    }
    return days;
}

function mapEvents(apiEvents) {
    return (apiEvents || []).map((e) => ({
        title: e.title,
        desc: e.description,
        date: new Date(e.startDate).toLocaleDateString(),
        category: e.category,
    }));
}

function mapIcon(text) {
    if (!text) return "Cloudy";
    const t = text.toLowerCase();
    if (t.includes("storm")) return "Storm";
    if (t.includes("rain")) return "Rain";
    if (t.includes("cloud")) return "Cloud";
    if (t.includes("sun") || t.includes("clear")) return "Sun";
    return "Cloudy";
}

export default function HomePage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [waterbodies, setWaterbodies] = useState([]);
    const [selectedWaterbody, setSelectedWaterbody] = useState(null);
    const [activeTab, setActiveTab] = useState("weather");
    const [favorites, setFavorites] = useState([]);

    const [weatherData, setWeatherData] = useState(null);
    const [events, setEvents] = useState([]);
    const [catches, setCatches] = useState([]);
    const [trends, setTrends] = useState(null);

    useEffect(() => {
        api.get("/waterbodies")
            .then((res) => {
                const list = Array.isArray(res) ? res : res?.data || [];
                setWaterbodies(list.map(adaptWaterbody));
            })
            .catch((err) => {
                console.error("Failed to load waterbodies:", err);
                setWaterbodies([]);
            });
    }, []);

    const filteredWaterbodies = useMemo(() => {
        return waterbodies.filter((w) => {
            const matchesFilter =
                activeFilter === "all" ||
                (activeFilter === "ca" && w.region.includes("CA")) ||
                w.type.toLowerCase() === activeFilter;
            const q = searchQuery.trim().toLowerCase();
            const matchesSearch =
                !q ||
                w.name.toLowerCase().includes(q) ||
                (w.region || "").toLowerCase().includes(q) ||
                (w.type || "").toLowerCase().includes(q);
            return matchesFilter && matchesSearch;
        });
    }, [waterbodies, searchQuery, activeFilter]);

    function handleSearch() {
        if (filteredWaterbodies.length > 0) {
            openWaterbody(filteredWaterbodies[0]);
        }
    }

    function toggleFavorite(name) {
        setFavorites((prev) =>
            prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
        );
    }

    async function openWaterbody(waterbody) {
        setSelectedWaterbody(waterbody);
        setActiveTab("weather");
        setWeatherData(null);
        setEvents([]);
        setCatches([]);
        setTrends(null);

        const [weatherRes, eventsRes, catchRes, trendRes] = await Promise.allSettled([
            api.get(`/weather/${waterbody.id}`),
            api.get(`/events?waterbody_id=${waterbody.id}`),
            api.get(`/catch-reports?waterbody_id=${waterbody.id}&limit=5`),
            api.get(`/catch-reports/trends?waterbody_id=${waterbody.id}`),
        ]);

        if (weatherRes.status === "fulfilled") {
            setWeatherData(mapWeatherData(weatherRes.value));
        } else {
            console.error("Weather load failed:", weatherRes.reason);
        }
        if (eventsRes.status === "fulfilled") {
            setEvents(mapEvents(eventsRes.value?.data));
        }
        if (catchRes.status === "fulfilled") {
            setCatches(catchRes.value?.data || []);
        }
        if (trendRes.status === "fulfilled") {
            setTrends(trendRes.value);
        }
    }

    const weather = weatherData;
    const forecast = weatherData?.forecast || [];
    const alerts = weatherData?.alerts || [];
    const topSpecies = trends?.weekly?.topSpecies || [];
    const maxSpeciesCount = topSpecies[0]?.count || 1;

    return (
        <div>
            <section className="hero">
                <h1>Plan your perfect fishing trip</h1>
                <p>Weather, advisories, and catch activity in one place for lakes, rivers, and reservoirs.</p>

                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search a lake, river, or reservoir..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <button className="search-btn" onClick={handleSearch}>Search</button>
                </div>

                <div className="filter-chips">
                    {["all", "lake", "river", "reservoir", "ca"].map((filter) => (
                        <button
                            key={filter}
                            className={`chip ${activeFilter === filter ? "active" : ""}`}
                            onClick={() => setActiveFilter(filter)}
                            type="button"
                        >
                            {filter === "all"
                                ? "All types"
                                : filter === "ca"
                                    ? "California"
                                    : `${filter.charAt(0).toUpperCase()}${filter.slice(1)}s`}
                        </button>
                    ))}
                </div>

                <div className="wave">
                    <svg viewBox="0 0 1200 60" preserveAspectRatio="none" fill="#f0f9ff">
                        <path d="M0,40 C300,80 600,0 900,40 C1050,60 1150,20 1200,30 L1200,60 L0,60 Z" />
                    </svg>
                </div>
            </section>

            <div className="main">
                <div className="layout">
                    <div>
                        <h2>Popular fishing spots</h2>

                        <div className="cards-grid">
                            {filteredWaterbodies.map((w) => (
                                <div key={w.id} onClick={() => openWaterbody(w)} style={{ cursor: "pointer" }}>
                                    {w.name}
                                </div>
                            ))}
                            {filteredWaterbodies.length === 0 && (
                                <p style={{ fontSize: "13px", color: "var(--text3)" }}>
                                    No waterbodies match your filters.
                                </p>
                            )}
                        </div>

                        {selectedWaterbody && (
                            <div className="detail-panel">
                                <div className="detail-header">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            <h2>{selectedWaterbody.name}</h2>
                                            <p>{selectedWaterbody.region}</p>
                                            <div className="detail-badge">
                                                <span>{selectedWaterbody.type}</span>
                                            </div>
                                        </div>
                                        <button
                                            className="fav-btn"
                                            style={{ color: "white", fontSize: "1.4rem" }}
                                            onClick={() => toggleFavorite(selectedWaterbody.name)}
                                        >
                                            {favorites.includes(selectedWaterbody.name) ? "Saved" : "Save"}
                                        </button>
                                    </div>
                                </div>

                                <div className="detail-tabs">
                                    {["weather", "events", "catches", "trends"].map((tab) => (
                                        <div
                                            key={tab}
                                            className={`dtab ${activeTab === tab ? "active" : ""}`}
                                            onClick={() => setActiveTab(tab)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            {tab === "weather" && "Weather"}
                                            {tab === "events" && "Advisories"}
                                            {tab === "catches" && "Catch Reports"}
                                            {tab === "trends" && "Trends"}
                                        </div>
                                    ))}
                                </div>

                                {activeTab === "weather" && (
                                    <div className="tab-content active">
                                        {alerts.length > 0 && (
                                            <div className="wx-alert">
                                                <strong style={{ fontSize: "13px", color: "#991b1b" }}>
                                                    {alerts[0].title}
                                                </strong>
                                            </div>
                                        )}

                                        <div className="wx-grid">
                                            <div className="wx-card">
                                                <div className="wx-val">{weather?.temperature || "-"}</div>
                                                <div className="wx-label">Temperature</div>
                                            </div>
                                            <div className="wx-card">
                                                <div className="wx-val">{weather?.wind || "-"}</div>
                                                <div className="wx-label">Wind</div>
                                            </div>
                                            <div className="wx-card">
                                                <div className="wx-val">{weather?.precipitation || "-"}</div>
                                                <div className="wx-label">Precip chance</div>
                                            </div>
                                        </div>

                                        <p style={{ fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
                                            5-day forecast
                                        </p>

                                        <div className="forecast-row">
                                            {forecast.map((f) => (
                                                <div key={f.day} className="forecast-cell">
                                                    <div className="fc-day">{f.day}</div>
                                                    <div className="fc-icon">{f.icon}</div>
                                                    <div className="fc-hi">{f.hi}</div>
                                                    <div className="fc-lo">{f.lo}</div>
                                                </div>
                                            ))}
                                            {forecast.length === 0 && weather && (
                                                <p style={{ fontSize: "12px", color: "var(--text3)" }}>
                                                    Forecast unavailable.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "events" && (
                                    <div className="tab-content active">
                                        <div className="event-list">
                                            {events.length === 0 ? (
                                                <p style={{ color: "var(--text3)", fontSize: "13px" }}>
                                                    No current advisories or events for this waterbody.
                                                </p>
                                            ) : (
                                                events.map((event, index) => (
                                                    <div key={index} className="event-item">
                                                        <div className="event-meta">
                                                            <div className="event-title">{event.title}</div>
                                                            <span className="event-cat cat-event">{event.category}</span>
                                                            <div className="event-desc">{event.desc}</div>
                                                            <div className="event-footer">
                                                                <span className="event-date">{event.date}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "catches" && (
                                    <div className="tab-content active">
                                        <div className="report-list">
                                            {catches.length === 0 ? (
                                                <p style={{ color: "var(--text3)", fontSize: "13px" }}>
                                                    No recent catch reports.
                                                </p>
                                            ) : (
                                                catches.map((report) => (
                                                    <div key={report.id} className="report-item">
                                                        <div className="ri-meta">
                                                            <div className="ri-title">
                                                                {report.species} - {report.method}
                                                            </div>
                                                            <div className="ri-sub">
                                                                {report.user?.displayName || "Anonymous"} - {new Date(report.createdAt).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "trends" && (
                                    <div className="tab-content active">
                                        <div className="trend-grid">
                                            <div className="trend-card">
                                                <div className="trend-title">Top species (last 7 days)</div>
                                                <div className="bar-list">
                                                    {topSpecies.length === 0 ? (
                                                        <p style={{ fontSize: "12px", color: "var(--text3)" }}>
                                                            No reports in the last 7 days.
                                                        </p>
                                                    ) : (
                                                        topSpecies.map((trend) => (
                                                            <div key={trend.name} className="bar-item">
                                                                <span className="bar-label">{trend.name}</span>
                                                                <div className="bar-track">
                                                                    <div
                                                                        className="bar-fill"
                                                                        style={{ width: `${(trend.count / maxSpeciesCount) * 100}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="bar-count">{trend.count}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            <div className="trend-card">
                                                <div className="trend-title">Quick summary</div>
                                                <p style={{ fontSize: "13px", color: "var(--text2)" }}>
                                                    {selectedWaterbody.name} had{" "}
                                                    <strong>{trends?.weekly?.totalReports ?? 0}</strong> report(s) in the last 7 days and{" "}
                                                    <strong>{trends?.monthly?.totalReports ?? 0}</strong> in the last 30 days.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="sidebar-card">
                            <div className="sidebar-header">Saved spots</div>
                            <div className="sidebar-body">
                                <div className="fav-list">
                                    {favorites.length === 0 ? (
                                        <p style={{ fontSize: "12px", color: "var(--text3)" }}>
                                            No saved spots yet.
                                        </p>
                                    ) : (
                                        favorites.map((name) => {
                                            const wb = waterbodies.find((item) => item.name === name);
                                            return (
                                                <div key={name} className="fav-item">
                                                    <span className="fav-name">{name}</span>
                                                    <span
                                                        className="fav-arrow"
                                                        onClick={() => wb && openWaterbody(wb)}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        Open
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="sidebar-card">
                            <div className="sidebar-header">Quick browse</div>
                            <div className="sidebar-body">
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {waterbodies.slice(0, 4).map((wb) => (
                                        <div
                                            key={wb.id}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                padding: "8px",
                                                background: "var(--surface2)",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                            }}
                                            onClick={() => openWaterbody(wb)}
                                        >
                                            <span style={{ fontSize: "13px" }}>{wb.name}</span>
                                            <span style={{ fontSize: "12px", color: "var(--text3)" }}>{wb.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
