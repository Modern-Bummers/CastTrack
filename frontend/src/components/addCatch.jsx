import React, { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function AddCatch({
    waterbodies,
    onSuccess
}) {
    const [showModal, setShowModal] = useState(false);
    const [localWaterbodyId, setLocalWaterbodyId] = useState("");

    useEffect(() => {
        if (waterbodies.length > 0) {
            setLocalWaterbodyId((prev) => prev || waterbodies[0].id);
        }
    }, [waterbodies]);

    const emptyForm = {
        species: "",
        method: "",
        notes: "",
        visibility: "PUBLIC",
    };

    const [form, setForm] = useState(emptyForm);

    async function handleSubmit(e) {
        e.preventDefault();

        if (!localWaterbodyId || !form.species.trim() || !form.method.trim()) {
            return;
        }

        try {
            await api.post("/catch-reports", {
                waterbodyId: localWaterbodyId,
                species: form.species.trim(),
                method: form.method.trim(),
                notes: form.notes?.trim() || undefined,
                visibility: form.visibility,
            });

            setForm(emptyForm);
            setShowModal(false);

            onSuccess?.();

        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.message || "Failed to submit catch.");
        }
    }

    return (
        <>
            {/* FAB */}
            {!showModal && (
                <button
                    className="fab-button"
                    style={{ background: "#1f4f91", color: "white" }}
                    onClick={() => setShowModal(true)}
                >
                    +
                </button>
            )}

            {/* MODAL */}
            {showModal && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Add Catch</h3>

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="field">
                                <label>Waterbody</label>
                                    <select
                                        value={localWaterbodyId}
                                        onChange={(e) => setLocalWaterbodyId(e.target.value)}
                                    >
                                    {waterbodies.length === 0 ? (
                                        <option value="">No locations available</option>
                                    ) : (
                                        waterbodies.map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div className="field">
                                <label>Species</label>
                                <input
                                    value={form.species}
                                    onChange={(e) =>
                                        setForm({ ...form, species: e.target.value })
                                    }
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>Method</label>
                                <input
                                    value={form.method}
                                    onChange={(e) =>
                                        setForm({ ...form, method: e.target.value })
                                    }
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) =>
                                        setForm({ ...form, notes: e.target.value })
                                    }
                                />
                            </div>

                            <div className="field">
                                <label>Visibility</label>
                                <select
                                    value={form.visibility}
                                    onChange={(e) =>
                                        setForm({ ...form, visibility: e.target.value })
                                    }
                                >
                                    <option value="PUBLIC">Public</option>
                                    <option value="ANONYMOUS">Anonymous</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>

                                <button type="submit">
                                    Submit Catch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}