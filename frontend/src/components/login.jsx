import React, { useState } from "react";
import { api } from "../lib/api";
import { setAuth, clearAuth, useAuth } from "../lib/auth";

export default function Login() {
    const [showModal, setShowModal] = useState(false);
    const [isLogin, setIsLogin] = useState(true);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");

    const { isLoggedIn } = useAuth();

    async function handleSubmit() {
        try {
            const path = isLogin ? "/auth/login" : "/auth/register";
            const body = isLogin
                ? { email, password }
                : { email, password, displayName };

            const data = await api.post(path, body);

            if (isLogin) {
                setAuth({ token: data.token, role: data.user.role });
                alert("Login successful!");
            } else {
                alert("Account created! You can now log in.");
                setIsLogin(true);
            }

            setShowModal(false);
            setEmail("");
            setPassword("");
            setDisplayName("");
        } catch (err) {
            console.error(err);
            alert(err.message || "Server error");
        }
    }

    function handleLogout() {
        clearAuth();
        alert("Logged out");
    }

    return (
        <>
            <button
                className="right-button"
                onClick={() => {
                    if (isLoggedIn) {
                        handleLogout();
                    } else {
                        setShowModal(true);
                    }
                }}
            >
                {isLoggedIn ? "Logout" : "Login / Sign up"}
            </button>

            {showModal && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="login-title">
                            {isLogin ? "Login" : "Create Account"}
                        </h2>

                        <div className="form-row">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            {!isLogin && (
                                <input
                                    type="text"
                                    placeholder="Display Name"
                                    value={displayName}
                                    onChange={(e) =>
                                        setDisplayName(e.target.value)
                                    }
                                />
                            )}

                            <button onClick={handleSubmit}>
                                {isLogin ? "Log in" : "Sign up"}
                            </button>

                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                style={{
                                    background: "transparent",
                                    color: "#4a90e2",
                                    border: "none"
                                }}
                            >
                                {isLogin
                                    ? "Need an account?"
                                    : "Already have an account?"}
                            </button>
                            {import.meta.env.DEV && (
                                <button
                                    onClick={() => {
                                        setEmail("dev@casttrack.local");
                                        setPassword("devpassword123");
                                        setIsLogin(true);
                                    }}
                                    style={{ background: "transparent", color: "#aaa", border: "1px dashed #aaa", fontSize: "0.8rem" }}
                                >
                                    Fill Dev Credentials
                                </button>
                            )}

                            <button onClick={() => setShowModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
