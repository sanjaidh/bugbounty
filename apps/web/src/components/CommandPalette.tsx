import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sound } from "../lib/sound";
import { useAuth } from "../context/AuthContext";

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Action" | "System";
  icon: string;
  action: () => void;
  shortcut?: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [isMuted, setIsMuted] = useState(sound.isMuted());

  useEffect(() => {
    setIsMuted(sound.isMuted());
  }, [isOpen]);

  const items: CommandItem[] = [
    {
      id: "nav-challenges",
      title: "Go to Challenges",
      category: "Navigation",
      icon: "⚡",
      action: () => navigate("/challenges"),
    },
    {
      id: "nav-leaderboard",
      title: "Go to Leaderboard",
      category: "Navigation",
      icon: "🏆",
      action: () => navigate("/leaderboard"),
    },
    {
      id: "nav-live",
      title: "Open Live Broadcast Screen",
      category: "Navigation",
      icon: "📺",
      action: () => navigate("/live"),
    },
    ...(user?.role === "ADMIN"
      ? [
          {
            id: "nav-admin",
            title: "Admin Control Center",
            category: "Navigation" as const,
            icon: "⚙",
            action: () => navigate("/admin"),
          },
        ]
      : []),
    {
      id: "toggle-sound",
      title: isMuted ? "Unmute Audio Effects" : "Mute Audio Effects",
      category: "Action",
      icon: isMuted ? "🔇" : "🔊",
      action: () => {
        const nextState = sound.toggleMute();
        setIsMuted(nextState);
      },
    },
    {
      id: "action-logout",
      title: "Sign Out",
      category: "Action",
      icon: "🚪",
      action: () => logout(),
    },
  ];

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
        background: "rgba(5, 5, 15, 0.75)",
        backdropFilter: "blur(12px)",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "rgba(15, 15, 32, 0.95)",
          border: "1px solid rgba(124, 58, 237, 0.4)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(124, 58, 237, 0.3)",
          overflow: "hidden",
          margin: "0 16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "1.2rem", color: "var(--accent)" }}>🔍</span>
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontFamily: "var(--font-ui)",
              fontSize: "1rem",
            }}
          />
          <kbd
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div style={{ maxHeight: "320px", overflowY: "auto", padding: "8px" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    background: isSelected ? "rgba(124, 58, 237, 0.2)" : "transparent",
                    border: isSelected
                      ? "1px solid rgba(124, 58, 237, 0.4)"
                      : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                    <span
                      style={{
                        fontWeight: isSelected ? 700 : 600,
                        fontSize: "0.9rem",
                        color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                      }}
                    >
                      {item.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-muted)",
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 20px",
            background: "rgba(0, 0, 0, 0.3)",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          <span>Use ↑ ↓ to navigate, Enter to select</span>
          <span style={{ color: "var(--accent)" }}>CyberCarnival Palette</span>
        </div>
      </div>
    </div>
  );
}
