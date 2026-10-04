import React, { useEffect, useState, useRef } from "react";
import { leaderboardApi, LeaderboardEntry } from "../lib/api";
import { sound } from "../lib/sound";
import AnimatedCounter from "../components/AnimatedCounter";
import { io, Socket } from "socket.io-client";

interface SolveAlert {
  id: string;
  message: string;
  timestamp: string;
}

const COMPETITION_START = new Date("2026-10-08T04:30:00.000Z");

export default function LiveLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [recentSolve, setRecentSolve] = useState<SolveAlert | null>(null);
  const [solveFeed, setSolveFeed] = useState<SolveAlert[]>([]);
  const [glitchActive, setGlitchActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number }>({
    h: 0,
    m: 0,
    s: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = COMPETITION_START.getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ h: hours, m: mins, s: secs });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerGlitchEffect = () => {
    sound.playStinger();
    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 900);
  };

  const fetchLive = async () => {
    try {
      const res = await leaderboardApi.live();
      setLeaderboard(res.data.leaderboard);
    } catch (err) {
      console.error("Live fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();

    const socket: Socket = io(import.meta.env.VITE_API_URL || "", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("leaderboard:update", (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
    });

    socket.on("solve:event", (data: { teamName: string; stageNumber: number; points: number }) => {
      sound.playStinger();
      const newAlert: SolveAlert = {
        id: Math.random().toString(),
        message: `🔥 ${data.teamName} solved Stage ${data.stageNumber} (+${data.points} PTS)!`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setRecentSolve(newAlert);
      setSolveFeed((prev) => [newAlert, ...prev.slice(0, 15)]);

      setTimeout(() => {
        setRecentSolve(null);
      }, 8000);
    });

    const pollInterval = setInterval(fetchLive, 10000);
    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, []);

  const toggleFullscreen = () => {
    sound.playClick();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const top3 = leaderboard.slice(0, 3);

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 30%, rgba(168, 85, 247, 0.15) 0%, rgba(3, 1, 6, 0.95) 75%)",
        color: "#ffffff",
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 36px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {glitchActive && <div className="glitch-overlay" />}

      {/* Top Header Tag */}
      <div
        className="font-mono text-xs"
        style={{
          position: "absolute",
          top: 12,
          right: 24,
          zIndex: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 12px",
          borderRadius: "2px",
          background: "#000000",
          border: "2px solid #06B6D4",
          boxShadow: "3px 3px 0px #06B6D4",
          color: "#06B6D4",
          fontWeight: 800,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A3E635" }} />
        HALL BROADCAST // CYBERCARNIVAL '26
      </div>

      {/* Dynamic scanline background effect */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(rgba(18, 16, 38, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))",
          backgroundSize: "100% 3px, 6px 100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Header Bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 2,
          borderBottom: "2px solid #06B6D4",
          boxShadow: "0 0 20px rgba(6, 182, 212, 0.3)",
          paddingBottom: "16px",
          marginTop: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              border: "2px solid #06B6D4",
              background: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 14px #06B6D4, inset 0 0 10px rgba(6, 182, 212, 0.4)",
            }}
          >
            <span className="font-pixel" style={{ color: "#A855F7", fontSize: "0.85rem", fontWeight: 900 }}>
              BB
            </span>
          </div>
          <div>
            <h1
              className="font-pixel glitch-text"
              data-text="BUG BOUNTYY"
              style={{
                margin: 0,
                fontSize: "1.5rem",
                color: "#FFFFFF",
                textShadow: "0 0 15px #A855F7, 2px 2px 0px #000",
                letterSpacing: "1px",
              }}
            >
              Bug <span style={{ color: "#A855F7" }}>Bountyy</span> — Broadcast
            </h1>
            <div className="font-mono text-xs" style={{ color: "#06B6D4", letterSpacing: "1px", fontWeight: 800 }}>
              LIVE ARENA BROADCAST • VENUE DISPLAY STREAM
            </div>
          </div>
        </div>

        {/* Center Countdown */}
        <div
          style={{
            background: "#000000",
            border: "2px solid #A855F7",
            boxShadow: "4px 4px 0px #000000",
            borderRadius: "2px",
            padding: "8px 24px",
            textAlign: "center",
          }}
        >
          <span className="font-mono text-xs" style={{ display: "block", color: "#A8A0B8", fontWeight: 800 }}>
            COMPETITION COUNTDOWN
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: "1.4rem",
              fontWeight: 900,
              color: "#A3E635",
              textShadow: "0 0 10px #A3E635",
            }}
          >
            {String(timeLeft.h).padStart(2, "0")}:{String(timeLeft.m).padStart(2, "0")}:
            {String(timeLeft.s).padStart(2, "0")}
          </span>
        </div>

        {/* Live Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={triggerGlitchEffect}
            className="pixel-btn-cyan"
            style={{ padding: "8px 14px", fontSize: "0.65rem" }}
          >
            ⚡ GLITCH
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              background: "#000000",
              border: connected ? "2px solid #A3E635" : "2px solid #F59E0B",
              color: connected ? "#A3E635" : "#F59E0B",
              fontWeight: 800,
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: connected ? "#A3E635" : "#F59E0B",
                boxShadow: connected ? "0 0 10px #A3E635" : "0 0 10px #F59E0B",
              }}
            />
            {connected ? "LIVE SOCKET" : "POLLING REFRESH"}
          </div>

          <button
            onClick={toggleFullscreen}
            className="pixel-btn-magenta"
            style={{ padding: "8px 14px", fontSize: "0.65rem" }}
          >
            ⛶ FULLSCREEN
          </button>
        </div>
      </header>

      {/* Live Solve Banner */}
      {recentSolve && (
        <div
          style={{
            zIndex: 10,
            position: "absolute",
            top: "100px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#A855F7",
            color: "#FFFFFF",
            border: "3px solid #FFFFFF",
            boxShadow: "0 0 30px #A855F7, 6px 6px 0px #000000",
            padding: "14px 36px",
            fontWeight: 900,
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>🔥</span>
          <span>{recentSolve.message}</span>
        </div>
      )}

      {/* Main Grid Content */}
      <main
        style={{
          flex: 1,
          margin: "24px 0",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: "28px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Podium */}
        <div>
          <h2
            className="font-pixel"
            style={{
              fontSize: "1rem",
              color: "#06B6D4",
              marginBottom: "16px",
              letterSpacing: "1px",
            }}
          >
            🏆 TOP CONTENDERS
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {top3.map((entry, index) => {
              const styles = [
                { bg: "rgba(10, 5, 22, 0.95)", border: "#FFE600", color: "#FFE600", icon: "🥇", badge: "1ST PLACE" },
                { bg: "rgba(10, 5, 22, 0.95)", border: "#06B6D4", color: "#06B6D4", icon: "🥈", badge: "2ND PLACE" },
                { bg: "rgba(10, 5, 22, 0.95)", border: "#A855F7", color: "#A855F7", icon: "🥉", badge: "3RD PLACE" },
              ][index];

              return (
                <div
                  key={entry.id}
                  style={{
                    background: styles.bg,
                    border: `3px solid ${styles.border}`,
                    boxShadow: "6px 6px 0px #000000",
                    borderRadius: "3px",
                    padding: "20px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>{styles.icon}</div>
                    <div>
                      <span
                        className="font-mono text-xs"
                        style={{
                          fontWeight: 800,
                          color: styles.color,
                          letterSpacing: "1px",
                        }}
                      >
                        {styles.badge}
                      </span>
                      <h3
                        className="font-display"
                        style={{
                          margin: "2px 0 0 0",
                          fontSize: "1.4rem",
                          fontWeight: 900,
                          color: "#ffffff",
                        }}
                      >
                        {entry.name}
                      </h3>
                      <div className="font-mono text-xs" style={{ color: "#A8A0B8", marginTop: "4px" }}>
                        {entry.members.join(" • ")}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: "1.8rem",
                        fontWeight: 900,
                        color: "#A3E635",
                        lineHeight: 1,
                      }}
                    >
                      <AnimatedCounter value={entry.totalPoints} />
                    </div>
                    <span
                      className="font-mono text-xs"
                      style={{
                        color: "#A8A0B8",
                        letterSpacing: "1px",
                      }}
                    >
                      PTS • Stage {entry.highestStage}/8
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Full Standings Board */}
        <div>
          <h2
            className="font-pixel"
            style={{
              fontSize: "1rem",
              color: "#A855F7",
              marginBottom: "16px",
              letterSpacing: "1px",
            }}
          >
            📊 LEADERBOARD STANDINGS
          </h2>

          <div
            style={{
              background: "rgba(10, 5, 22, 0.95)",
              border: "3px solid #06B6D4",
              boxShadow: "6px 6px 0px #000000",
              borderRadius: "3px",
              padding: "16px",
              maxHeight: "480px",
              overflowY: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid #06B6D4",
                    color: "#06B6D4",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    letterSpacing: "1px",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>RANK</th>
                  <th style={{ padding: "12px 16px" }}>OPERATIVE</th>
                  <th style={{ padding: "12px 16px" }}>STAGE</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>POINTS</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: "1px solid #241A35",
                      background: entry.rank <= 3 ? "rgba(6, 182, 212, 0.08)" : "transparent",
                    }}
                  >
                    <td className="font-mono" style={{ padding: "14px 16px", fontWeight: 800, color: "#06B6D4" }}>
                      #{entry.rank}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 800 }}>
                      {entry.name}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        className="font-mono text-xs"
                        style={{
                          padding: "2px 8px",
                          background: "rgba(244, 63, 94, 0.15)",
                          color: "#A855F7",
                          border: "1px solid #A855F7",
                          fontWeight: 800,
                        }}
                      >
                        S{entry.highestStage}
                      </span>
                    </td>
                    <td
                      className="font-mono"
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontWeight: 900,
                        color: "#A3E635",
                      }}
                    >
                      <AnimatedCounter value={entry.totalPoints} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer Solves Feed Ticker */}
      <footer
        style={{
          zIndex: 2,
          background: "#000000",
          border: "2px solid #06B6D4",
          boxShadow: "4px 4px 0px #000000",
          borderRadius: "2px",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          overflow: "hidden",
        }}
      >
        <span
          className="font-pixel text-xs"
          style={{
            background: "#A855F7",
            color: "#FFFFFF",
            padding: "4px 10px",
            border: "1px solid #FFFFFF",
            letterSpacing: "1px",
            whiteSpace: "nowrap",
          }}
        >
          LIVE SOLVE FEED
        </span>

        <div style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap" }}>
          <div
            className="font-mono"
            style={{
              display: "inline-flex",
              gap: "32px",
              animation: "marquee 25s linear infinite",
            }}
          >
            {solveFeed.length === 0 ? (
              <span style={{ color: "#A8A0B8", fontSize: "0.85rem" }}>
                Waiting for incoming flag submissions... Bug Bountyy competition active!
              </span>
            ) : (
              solveFeed.map((item) => (
                <span key={item.id} style={{ fontSize: "0.9rem", color: "#06B6D4", fontWeight: 700 }}>
                  [{item.timestamp}] {item.message}
                </span>
              ))
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
