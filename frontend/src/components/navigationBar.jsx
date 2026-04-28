import React from "react";
import { Link } from "react-router-dom";
import LoginButton from "./login";
import { useAuth } from "../lib/auth";
import "../style.css";

export default function Navbar() {
  const { isLoggedIn } = useAuth();

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
        {isLoggedIn && <Link to="/reminders">Reminders</Link>}
      </div>

      <div className="right-button">
        <LoginButton />
      </div>
    </nav>
  );
}
