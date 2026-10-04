import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { sound } from "../lib/sound";
import CommandPalette from "./CommandPalette";

export default function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinks = [
    { to: "/challenges",  label: "CHALLENGES",  short: "▸" },
    { to: "/leaderboard", label: "LEADERBOARD",  short: "♜" },
    ...(user?.role === "ADMIN" ? [{ to: "/admin", label: "ADMIN", short: "⚙" }] : []),
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const toggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(5, 2, 12, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "2px solid #06B6D4",
          boxShadow: "0 0 20px rgba(6, 182, 212, 0.3)",
          transition: "all var(--transition-fast)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            padding: "0 24px",
          }}
        >
          {/* Logo Box */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Link
              to="/challenges"
              onMouseEnter={() => sound.playClick()}
              style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: "2px solid #06B6D4",
                  background: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 14px #06B6D4, inset 0 0 10px rgba(6, 182, 212, 0.4)",
                }}
              >
                <span className="font-pixel" style={{ color: "#A855F7", fontSize: "0.8rem", fontWeight: 900 }}>
                  BB
                </span>
              </div>

              <h1 className="font-pixel" style={{ fontSize: "0.95rem", color: "#FFFFFF", textShadow: "0 0 10px #A855F7, 2px 2px 0px #000", margin: 0, letterSpacing: "1px" }}>
                Bug <span style={{ color: "#A855F7" }}>Bountyy</span>
              </h1>
            </Link>

            {/* Event Badge */}
            <span
              className="font-mono text-xs"
              style={{
                background: "rgba(168, 85, 247, 0.15)",
                color: "#C084FC",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                padding: "3px 8px",
                borderRadius: "3px",
                fontWeight: 700,
              }}
            >
              CC '26
            </span>
          </div>

          {/* Desktop Nav */}
          <div
            className="nav-links-desktop"
            style={{ display: "flex", alignItems: "center", gap: "16px" }}
          >
            {navLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="font-mono"
                  style={{
                    textDecoration: "none",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    color: active ? "#06B6D4" : "#A8A0B8",
                    padding: "4px 8px",
                    borderRadius: "2px",
                    background: active ? "rgba(6, 182, 212, 0.12)" : "transparent",
                    border: active ? "1px solid #06B6D4" : "1px solid transparent",
                    textShadow: active ? "0 0 8px #06B6D4" : "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    sound.playClick();
                    if (!active) {
                      e.currentTarget.style.color = "#A855F7";
                      e.currentTarget.style.textShadow = "0 0 8px #A855F7";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "#A8A0B8";
                      e.currentTarget.style.textShadow = "none";
                    }
                  }}
                >
                  {link.short} {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Search Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 10px",
                borderRadius: "2px",
                background: "#000",
                border: "1px solid #06B6D4",
                color: "#06B6D4",
                fontSize: "0.68rem",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                boxShadow: "2px 2px 0px #000",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                sound.playClick();
                e.currentTarget.style.borderColor = "#A855F7";
                e.currentTarget.style.color = "#A855F7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#06B6D4";
                e.currentTarget.style.color = "#06B6D4";
              }}
              title="Search (Ctrl+K)"
            >
              <span>⌕</span>
              <kbd style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "#FFF" }}>⌃K</kbd>
            </button>

            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                border: `1px solid ${isMuted ? "var(--border-mid)" : "rgba(139,92,246,0.4)"}`,
                color: isMuted ? "var(--text-muted)" : "var(--primary)",
                cursor: "pointer",
                fontSize: "0.8rem",
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = isMuted ? "var(--border-mid)" : "rgba(139,92,246,0.4)";
              }}
              title={isMuted ? "Audio: OFF" : "Audio: ON"}
              id="audio-toggle-btn"
            >
              {isMuted ? "⊘" : "◉"}
            </button>

            {/* Separator */}
            <div style={{ width: 1, height: 20, background: "var(--border-mid)", flexShrink: 0 }} />

            {/* User info */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.2 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {user?.username}
              </span>
              {user?.team && (
                <span style={{ fontSize: "0.6rem", color: "var(--primary)", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
                  {user.team.name}
                </span>
              )}
            </div>

            <button
              onClick={logout}
              className="btn btn-outline btn-sm"
              id="logout-btn"
              onMouseEnter={() => sound.playClick()}
              style={{ fontSize: "0.72rem", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}
            >
              EXIT
            </button>

            {/* Mobile hamburger */}
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: "transparent",
                border: "1px solid var(--border-mid)",
                color: "var(--text-secondary)",
                fontSize: "1rem",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                display: "none",
              }}
            >
              {mobileMenuOpen ? "✕" : "≡"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: "var(--space-4) var(--space-6)",
              borderTop: "1px solid var(--border-mid)",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  color: isActive(link.to) ? "var(--primary)" : "var(--text-muted)",
                  background: isActive(link.to) ? "rgba(139,92,246,0.1)" : "transparent",
                  border: isActive(link.to) ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent",
                }}
              >
                {link.short} {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
