import React from "react";
import { Link } from "react-router-dom";
import LoginButton from "./login";
import { useAuth } from "../lib/auth";
import "../style.css";

export default function Navbar() {
  const { isLoggedIn, displayName, email, role } = useAuth();
  const greeting = displayName || email || "Account";

  return (
    <nav className="header-container">
      <div className="brand-block">
        <h1 className="brand-title">CastTrack</h1>
        <p className="brand-subtitle">Fishing conditions and community insights</p>
      </div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/regulationPage">Waterbody & Weather</Link>
        <Link to="/catchPage">Catch Reports</Link>
        <Link to="/eventPage">Events & Advisories</Link>
      </div>

      <div className="right-button" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {isLoggedIn && (
          <span style={{ color: "white", fontSize: "0.95rem", fontWeight: 600 }}>
            Hi, {greeting}
            {role && role !== "USER" && (
              <span
                style={{
                  marginLeft: "6px",
                  background: "rgba(255,255,255,0.2)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                {role}
              </span>
            )}
          </span>
        )}
        <LoginButton />
      </div>
    </nav>
  );
}
