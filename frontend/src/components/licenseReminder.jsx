import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function LicenseReminder() {
    const { isLoggedIn, loading } = useAuth();

    const [reminder, setReminder] = useState(null);
    const [daysLeft, setDaysLeft] = useState(null);

    // LOAD reminder
    useEffect(() => {
        if (loading || !isLoggedIn) return;

        api.get("/reminders")
            .then((res) => {
                const list = res?.data ?? [];
                setReminder(list[0] || null);
            })
            .catch(() => {});
    }, [isLoggedIn, loading]);

    // countdown
    useEffect(() => {
        if (!reminder?.licenseExpiration) return;

        const update = () => {
            const now = new Date();
            const due = new Date(reminder.licenseExpiration);

            now.setHours(0, 0, 0, 0);
            due.setHours(0, 0, 0, 0);

            const diff = due - now;
            setDaysLeft(Math.ceil(diff / (1000 * 60 * 60 * 24)));
        };

        update();
        const interval = setInterval(update, 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, [reminder]);

    async function setDate(value) {
        const payload = {
            licenseExpiration: new Date(value),
            remindDaysBefore: reminder?.remindDaysBefore ?? 7,
            state: reminder?.state ?? "default",
            enabled: true,
        };

        let saved;

        if (reminder?.id) {
            saved = await api.patch(`/reminders/${reminder.id}`, payload);
        } else {
            saved = await api.post("/reminders", payload);
        }

        setReminder(saved.data);
    }

    async function reset() {
        if (reminder?.id) {
            await api.delete(`/reminders/${reminder.id}`);
        }

        setReminder(null);
        setDaysLeft(null);
    }

    if (!loading && !isLoggedIn) {
        return (
            <div className="sidebar-card">
                <div className="sidebar-header">📄 Fishing License</div>
                <div className="sidebar-body">
                    <p style={{ fontSize: "13px", color: "#64748b" }}>
                        Please log in to use this feature.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="sidebar-card">
            <div className="sidebar-header">📄 Fishing License</div>

            <div className="sidebar-body">
                {!reminder?.licenseExpiration ? (
                    <input
                        type="date"
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #e5e7eb",
                        }}
                    />
                ) : (
                    <div>
                        <p style={{ fontSize: "12px", color: "#666" }}>
                            Renewal:{" "}
                            {new Date(reminder.licenseExpiration).toDateString()}
                        </p>

                        <h3>
                            {daysLeft > 0
                                ? `${daysLeft} days left`
                                : "⚠️ Expired"}
                        </h3>

                        {daysLeft <= (reminder.remindDaysBefore ?? 7) && (
                            <p style={{ color: "#dc2626", fontSize: "12px" }}>
                                Renew soon to avoid issues.
                            </p>
                        )}

                        <button onClick={reset} style={{ marginTop: "8px" }}>
                            Reset
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}