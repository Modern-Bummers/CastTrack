import React, { useState, useEffect } from "react";
import { api } from "../lib/api";

const CATEGORIES = [
    "ALGAL_BLOOM",
    "FREE_FISHING_DAY",
    "TOURNAMENT",
    "SEASONAL_CLOSURE",
    "ACCESS_RESTRICTION",
];

export default function addEvent({
    canManage,
    waterbodies,
    user,
    onSuccess,
    editEvent
}) {
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        if (editEvent) {
            openEdit(editEvent);
        }
    }, [editEvent]);

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

    function openCreate() {
        setEditingId(null);
        setForm(emptyForm);
        setShowModal(true);
    }

    function openEdit(event) {
        setEditingId(event.id);
        setForm({
            title: event.title,
            description: event.description,
            category: event.category,
            waterbodyId: event.waterbodyId || "",
            startDate: event.startDate?.slice(0, 10) || "",
            endDate: event.endDate?.slice(0, 10) || "",
            sourceUrl: event.sourceUrl || "",
        });
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            const payload = {
                title: form.title,
                description: form.description,
                category: form.category,
                startDate: new Date(form.startDate).toISOString(),
                endDate: form.endDate
                    ? new Date(form.endDate).toISOString()
                    : undefined,
                waterbodyId: form.waterbodyId || undefined,
                sourceUrl: form.sourceUrl || undefined,
                createdBy: user?.id,
            };

            if (editingId) {
                await api.patch(`/events/${editingId}`, payload);
            } else {
                await api.post("/events", payload);
            }

            setShowModal(false);
            setForm(emptyForm);

            onSuccess?.();
            setEditingId(null);

        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.message || err.message);
        }
    }

    if (!canManage) return null;

    return (
        <>
            {/* FAB */}
            <button
                className="fab-button"
                style={{ background: "#1f4f91", color: "white" }}
                onClick={openCreate}
            >
                +
            </button>

            {/* MODAL */}
            {showModal && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="modal-card clean-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2>
                            {editingId ? "Edit Event" : "Create Event"}
                        </h2>

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="field">
                                <label>Title</label>
                                <input
                                    value={form.title}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            title: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>Description</label>
                                <textarea
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            description: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>Category</label>
                                <select
                                    value={form.category}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            category: e.target.value,
                                        })
                                    }
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label>Location</label>
                                <select
                                    value={form.waterbodyId}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            waterbodyId: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">None</option>
                                    {waterbodies.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            startDate: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            endDate: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{
                                        background: "#1f4f91",
                                        color: "white",
                                    }}
                                >
                                    {editingId ? "Update" : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}