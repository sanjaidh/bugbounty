import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { sound } from "../lib/sound";

interface SolveEventData {
  username?: string;
  teamName?: string;
  stageNumber?: number;
  challengeTitle?: string;
  points?: number;
  solvedAt?: string;
}

export default function GlobalSolveNotifier() {
  const [activeAlert, setActiveAlert] = useState<SolveEventData | null>(null);
  const [timeUpAlert, setTimeUpAlert] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [solveHistory, setSolveHistory] = useState<SolveEventData[]>([]);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || "";
    const socket: Socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });

    socket.on("solve:event", (data: SolveEventData) => {
      // Trigger instant warning flash
      setIsFlashing(true);
      setActiveAlert(data);
      setSolveHistory((prev) => [data, ...prev].slice(0, 5));
      sound.playAlert();

      // Stop flash strobe after 1.5s
      const flashTimer = setTimeout(() => {
        setIsFlashing(false);
      }, 1500);

      // Auto dismiss modal banner after 6.5s
      const alertTimer = setTimeout(() => {
        setActiveAlert(null);
      }, 6500);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(alertTimer);
      };
    });

    socket.on("competition:status", (status: { isActive: boolean; expired?: boolean; endTime?: string }) => {
      if (status.expired || (!status.isActive && status.endTime && new Date() >= new Date(status.endTime))) {
        setTimeUpAlert(true);
        setIsFlashing(true);
        sound.playAlert();
        setTimeout(() => setIsFlashing(false), 2000);
      } else {
        setTimeUpAlert(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <>
      {/* ── Screen Flash Overlay Strobe ── */}
      {isFlashing && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            pointerEvents: "none",
            animation: "glitchStrobe 0.15s infinite alternate",
            mixBlendMode: "hard-light",
          }}
        />
      )}

      {/* ── Global Alert Banner / Modal ── */}
      {activeAlert && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999999,
            width: "92%",
            maxWidth: "760px",
            animation: "alertSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          <div
            style={{
              background: "rgba(10, 3, 20, 0.96)",
              border: "3px solid var(--red, #FB7185)",
              borderRadius: "8px",
              padding: "16px 24px",
              boxShadow: "0 0 50px rgba(251, 113, 133, 0.6), 5px 5px 0px rgba(251, 113, 133, 0.4)",
              backdropFilter: "blur(20px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Animated top danger line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: "linear-gradient(90deg, #FB7185, #22D3EE, #F43F5E, #A855F7)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1s infinite linear",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                {/* Flashing Warning Beacon Icon */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "8px",
                    background: "rgba(251, 113, 133, 0.2)",
                    border: "2px solid #FB7185",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    color: "#FB7185",
                    animation: "pulse 0.8s infinite",
                    flexShrink: 0,
                  }}
                >
                  ⚡
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.68rem",
                        fontWeight: 900,
                        background: "#FB7185",
                        color: "#000",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      GLOBAL WARNING &bull; FLAG CAPTURED
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.68rem",
                        color: "var(--cyan)",
                        fontWeight: 700,
                      }}
                    >
                      STAGE {activeAlert.stageNumber ?? "?"}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      margin: "4px 0 2px 0",
                      color: "#FFFFFF",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Operative{" "}
                    <span style={{ color: "var(--cyan)", textDecoration: "underline" }}>
                      {activeAlert.username || activeAlert.teamName || "Anonymous Hacker"}
                    </span>{" "}
                    captured the flag!
                  </h3>

                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {activeAlert.challengeTitle ? `Challenge: ${activeAlert.challengeTitle} — ` : ""}
                    Awarded{" "}
                    <span style={{ color: "var(--green)", fontWeight: 800 }}>
                      +{activeAlert.points ?? 100} PTS
                    </span>
                  </p>
                </div>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => setActiveAlert(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#FFF",
                  padding: "6px 14px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#FB7185";
                  e.currentTarget.style.color = "#000";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.color = "#FFF";
                }}
              >
                DISMISS ✕
              </button>
            </div>

            {/* Countdown progress bar line at bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: "3px",
                background: "var(--cyan)",
                animation: "toastProgress 6.5s linear forwards",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Time Up Warning Modal ── */}
      {timeUpAlert && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999999,
            width: "92%",
            maxWidth: "780px",
            background: "rgba(18, 5, 30, 0.98)",
            border: "3px solid #A855F7",
            borderRadius: "8px",
            padding: "20px 24px",
            boxShadow: "0 0 50px rgba(168, 85, 247, 0.8), 6px 6px 0px #000000",
            backdropFilter: "blur(20px)",
            animation: "alertSlideDown 0.4s ease-out both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "8px",
                  background: "rgba(244, 63, 94, 0.2)",
                  border: "2px solid #F43F5E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  color: "#F43F5E",
                  animation: "pulse 0.8s infinite",
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <span className="font-pixel text-xs" style={{ color: "#F43F5E", letterSpacing: "1px" }}>
                  COMPETITION STATUS: ENDED
                </span>
                <h2 className="font-pixel" style={{ color: "#FFFFFF", fontSize: "1.1rem", margin: "4px 0" }}>
                  TIME IS UP! ALL SUBMISSIONS LOCKED
                </h2>
                <p className="font-mono" style={{ color: "#CBD5E1", fontSize: "0.78rem", margin: 0, lineHeight: 1.5 }}>
                  The 4-hour competition period has officially expired. Stage flag submissions are now locked. Final scores are locked on the leaderboard!
                </p>
              </div>
            </div>
            <button
              onClick={() => setTimeUpAlert(false)}
              className="pixel-btn-magenta"
              style={{ padding: "6px 14px", fontSize: "0.7rem" }}
            >
              ACKNOWLEDGE ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
