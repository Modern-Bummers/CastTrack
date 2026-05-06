import { useEffect, useState } from "react";

// Single source of truth for auth state. Always read/written through these
// helpers so we can fire a custom event and let any subscribed component
// re-render immediately, without waiting for a full page refresh.

const AUTH_EVENT = "casttrack:auth-change";

export function setAuth({ token, role, email, displayName }) {
    if (token) localStorage.setItem("token", token);
    if (role) localStorage.setItem("userRole", role);
    if (email) localStorage.setItem("userEmail", email);
    if (displayName) localStorage.setItem("userDisplayName", displayName);
    window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userDisplayName");
    window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getAuth() {
    return {
        token: localStorage.getItem("token"),
        role: localStorage.getItem("userRole"),
        email: localStorage.getItem("userEmail"),
        displayName: localStorage.getItem("userDisplayName"),
        isLoggedIn: !!localStorage.getItem("token"),
    };
}

// React hook — components that gate on auth use this so they re-render
// the moment login or logout happens, on this tab or any other.
export function useAuth() {
    const [state, setState] = useState(getAuth);

    useEffect(() => {
        function handler() {
            setState(getAuth());
        }
        window.addEventListener(AUTH_EVENT, handler);
        window.addEventListener("storage", handler);
        return () => {
            window.removeEventListener(AUTH_EVENT, handler);
            window.removeEventListener("storage", handler);
        };
    }, []);

    return state;
}
