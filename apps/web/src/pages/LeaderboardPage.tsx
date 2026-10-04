import React, { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import AnimatedCounter from "../components/AnimatedCounter";
import { leaderboardApi, LeaderboardEntry } from "../lib/api";
import { sound } from "../lib/sound";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

function TableRowSkeleton() {
  return (
    <tr style={{ borderBottom: "1px solid #241A35" }}>
      <td style={{ padding: "16px 20px" }}><div className="skeleton" style={{ width: 32, height: 32, borderRadius: 2 }} /></td>
      <td style={{ padding: "16px 20px" }}><div className="skeleton" style={{ width: 140, height: 20 }} /></td>
      <td style={{ padding: "16px 20px" }}><div className="skeleton" style={{ width: 120, height: 16 }} /></td>
      <td style={{ padding: "16px 20px" }}><div className="skeleton" style={{ width: 80, height: 22 }} /></td>
      <td style={{ padding: "16px 20px" }}><div className="skeleton" style={{ width: 60, height: 20 }} /></td>
      <td style={{ padding: "16px 20px", textAlign: "right" }}><div className="skeleton" style={{ width: 80, height: 24, marginLeft: "auto" }} /></td>
    </tr>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [glitchActive, setGlitchActive] = useState(false);

  // Terminal state for retro OS interactive widget
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "SCORE_ENGINE.EXE v2.6.0 [INITIALIZED]",
    "Real-time WebSocket score stream ready. Type 'help' or 'top' for details.",
  ]);

  const triggerGlitchEffect = () => {
    sound.playStinger();
    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 900);
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await leaderboardApi.get();
      setLeaderboard(res.data.leaderboard);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    const socket: Socket = io(import.meta.env.VITE_API_URL || "", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("leaderboard:update", (data: { leaderboard: LeaderboardEntry[]; builtAt: string }) => {
      setLeaderboard(data.leaderboard);
      setLastUpdated(new Date(data.builtAt).toLocaleTimeString());
      sound.playNotification();
    });

    const interval = setInterval(fetchLeaderboard, 15000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toLowerCase();
    if (!cmd) return;
    sound.playClick();

    let output = "";
    if (cmd === "help") {
      output = "COMMANDS: help | status | top | luck | matrix | glitch | clear";
    } else if (cmd === "top") {
      const leader = leaderboard[0];
      output = leader ? `RANK #1: ${leader.name} with ${leader.totalPoints} PTS (${leader.solvedCount}/8 Solves)` : "No rankings recorded yet.";
    } else if (cmd === "luck") {
      output = "MESSAGE: Best of luck to all operatives on the scoreboard! Keep hacking and pushing stages!";
    } else if (cmd === "status") {
      output = `SCORE ENGINE: WebSocket ${connected ? "ONLINE" : "POLLING"}. ${leaderboard.length} operatives registered.`;
    } else if (cmd === "matrix") {
      output = "01010011 01000011 01001111 01010010 01000101 01000010 01001111 01000001 01010010 01000100";
    } else if (cmd === "glitch") {
      triggerGlitchEffect();
      output = "GLITCH SYSTEM OVERDRIVE TRIGGERED!";
    } else if (cmd === "clear") {
      setTerminalLogs([]);
      setTerminalInput("");
      return;
    } else {
      output = `Command not recognized: '${cmd}'. Type 'help' for command list.`;
    }

    setTerminalLogs((prev) => [...prev, `> ${terminalInput}`, output]);
    setTerminalInput("");
  };

  const filtered = leaderboard.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.members.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const top3 = leaderboard.slice(0, 3);
  const currentUserTeamName = user?.team?.name || user?.username;

  return (
    <div style={{ minHeight: "100vh", position: "relative", zIndex: 1, color: "#FFFFFF" }}>
      {glitchActive && <div className="glitch-overlay" />}
      <NavBar />

      <main className="container" style={{ padding: "40px 20px 80px 20px" }}>
        {/* ── Top Header Section (Login Page Aesthetic) ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "40px",
            gap: "24px",
          }}
        >
          <div style={{ maxWidth: "680px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                borderRadius: "2px",
                background: "#000",
                border: "2px solid #06B6D4",
                boxShadow: "4px 4px 0px #06B6D4",
                marginBottom: "16px",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#A3E635", boxShadow: "0 0 10px #A3E635" }} />
              <span className="font-pixel" style={{ fontSize: "0.65rem", color: "#06B6D4", letterSpacing: "1px" }}>
                GLOBAL STANDINGS // REAL-TIME SCOREBOARD
              </span>
            </div>

            <h1
              className="font-pixel glitch-text"
              data-text="COMPETITION SCOREBOARD"
              style={{
                fontSize: "2.2rem",
                lineHeight: 1.3,
                color: "#FFFFFF",
                textShadow: "0 0 20px #A855F7, 3px 3px 0px #000",
                margin: "0 0 16px 0",
              }}
            >
              Arena <span style={{ color: "#A855F7" }}>Leaderboard</span>
            </h1>

            <p style={{ fontSize: "1.05rem", color: "#A8A0B8", lineHeight: 1.6, margin: 0 }}>
              Live CTF rankings updated instantly via WebSocket stream. Track top operatives as they capture flags and claim bounties across all stages. May the best hackers rise to the top! 🏆⚡
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Glitch Overdrive Button */}
            <button
              onClick={triggerGlitchEffect}
              className="pixel-btn-magenta"
              style={{ padding: "12px 18px", fontSize: "0.68rem" }}
            >
              ⚡ OVERDRIVE
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                borderRadius: "2px",
                background: "rgba(10, 5, 22, 0.92)",
                border: connected ? "2px solid #A3E635" : "2px solid #F59E0B",
                boxShadow: "4px 4px 0px #000000",
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
              <span className="font-mono text-xs" style={{ color: connected ? "#A3E635" : "#F59E0B", fontWeight: 800 }}>
                {connected ? "LIVE SOCKET CONNECTED" : "POLLING MODE"}
              </span>
            </div>

            {lastUpdated && (
              <span className="font-mono text-xs" style={{ color: "#A8A0B8" }}>
                UPDATED: {lastUpdated}
              </span>
            )}
          </div>
        </div>

        {/* Glitch Divider Bar */}
        <div className="glitch-divider" style={{ marginBottom: "40px" }} />

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "24px", border: "2px solid #FB7185" }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Top 3 Brutalist Podium Cards ── */}
        {!loading && top3.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "28px",
              marginBottom: "48px",
            }}
          >
            {top3.map((entry, index) => {
              const ranks = [
                { label: "1ST PLACE CHAMPION", color: "#FFE600", border: "#FFE600", icon: "🥇", glow: "rgba(255, 230, 0, 0.4)", file: "RANK_01_GOLD.EXE" },
                { label: "2ND PLACE RUNNER-UP", color: "#06B6D4", border: "#06B6D4", icon: "🥈", glow: "rgba(6, 182, 212, 0.4)", file: "RANK_02_SILVER.EXE" },
                { label: "3RD PLACE CONTENDER", color: "#A855F7", border: "#A855F7", icon: "🥉", glow: "rgba(244, 63, 94, 0.4)", file: "RANK_03_BRONZE.EXE" },
              ];
              const rankInfo = ranks[index];
              const isCurrentUser = currentUserTeamName && entry.name.toLowerCase() === currentUserTeamName.toLowerCase();

              return (
                <div
                  key={entry.id}
                  className="animate-slideUp glitch-hover"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    background: "rgba(10, 5, 22, 0.95)",
                    border: `3px solid ${rankInfo.border}`,
                    boxShadow: `0 0 30px ${rankInfo.glow}, 8px 8px 0px #000000`,
                    borderRadius: "3px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Retro Window Header */}
                  <div
                    style={{
                      background: "#000000",
                      borderBottom: `2px solid ${rankInfo.border}`,
                      padding: "8px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: rankInfo.color,
                      letterSpacing: "0.08em",
                    }}
                  >
                    <span>{rankInfo.file}</span>
                    <span>[{index === 0 ? "LEADER" : "TOP 3"}]</span>
                  </div>

                  <div style={{ padding: "24px", textAlign: "center" }}>
                    {isCurrentUser && (
                      <span
                        className="y2k-badge"
                        style={{
                          position: "absolute",
                          top: 42,
                          right: 12,
                          background: "#A855F7",
                          color: "#FFF",
                          border: "1px solid #FFF",
                          fontSize: "0.6rem",
                        }}
                      >
                        YOUR TEAM
                      </span>
                    )}

                    <div style={{ fontSize: "3rem", marginBottom: "8px", lineHeight: 1 }}>
                      {rankInfo.icon}
                    </div>

                    <div
                      className="font-pixel"
                      style={{
                        fontSize: "0.7rem",
                        color: rankInfo.color,
                        marginBottom: "10px",
                        letterSpacing: "1px",
                      }}
                    >
                      {rankInfo.label}
                    </div>

                    <h3
                      className="font-display"
                      style={{
                        color: "#FFFFFF",
                        fontSize: "1.5rem",
                        fontWeight: 900,
                        margin: "0 0 8px 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.name}
                    </h3>

                    <div className="font-mono text-xs" style={{ color: "#A8A0B8", marginBottom: "20px", minHeight: 18 }}>
                      {entry.members.join(", ")}
                    </div>

                    <div
                      style={{
                        display: "inline-block",
                        padding: "8px 24px",
                        background: "#000000",
                        border: `2px solid ${rankInfo.border}`,
                        boxShadow: "4px 4px 0px #000000",
                        color: rankInfo.color,
                        fontWeight: 900,
                        fontSize: "1.3rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <AnimatedCounter value={entry.totalPoints} suffix=" PTS" />
                    </div>

                    <div
                      className="font-mono text-xs"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "20px",
                        paddingTop: "12px",
                        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#A8A0B8",
                      }}
                    >
                      <span>Solves: {entry.solvedCount} / 8</span>
                      <span>Highest: Stage {entry.highestStage}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Search Toolbar & Full Ranking Table ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <h2 className="font-pixel" style={{ fontSize: "1.1rem", margin: 0, color: "#FFFFFF" }}>
            FULL RANKING STANDINGS
          </h2>

          {/* Search Box */}
          <div style={{ position: "relative", width: 300, maxWidth: "100%" }}>
            <span className="font-mono" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#06B6D4", fontWeight: 800 }}>&gt;</span>
            <input
              type="text"
              className="form-input form-input--mono"
              placeholder="search_team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: 30,
                fontSize: "0.85rem",
                background: "#05020A",
                border: "2px solid #06B6D4",
                color: "#FFF",
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#A855F7",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Cyber Table Container */}
        <div
          style={{
            background: "rgba(10, 5, 22, 0.95)",
            border: "3px solid #06B6D4",
            boxShadow: "8px 8px 0px #000000",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr
                  style={{
                    background: "#000000",
                    borderBottom: "2px solid #06B6D4",
                    color: "#06B6D4",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  <th style={{ padding: "16px 20px" }}>RANK</th>
                  <th style={{ padding: "16px 20px" }}>TEAM / OPERATIVE</th>
                  <th style={{ padding: "16px 20px" }}>MEMBERS</th>
                  <th style={{ padding: "16px 20px" }}>HIGHEST STAGE</th>
                  <th style={{ padding: "16px 20px" }}>SOLVES</th>
                  <th style={{ padding: "16px 20px", textAlign: "right" }}>BOUNTY POINTS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="font-mono"
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#A8A0B8",
                      }}
                    >
                      No rankings found matching "{searchTerm}".
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry) => {
                    const isUserRow = currentUserTeamName && entry.name.toLowerCase() === currentUserTeamName.toLowerCase();
                    return (
                      <tr
                        key={entry.id}
                        style={{
                          borderBottom: "1px solid #241A35",
                          background: isUserRow ? "rgba(244, 63, 94, 0.15)" : "transparent",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isUserRow) e.currentTarget.style.background = "rgba(6, 182, 212, 0.1)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isUserRow) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <td style={{ padding: "16px 20px" }}>
                          <span
                            className="font-mono"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "36px",
                              height: "36px",
                              borderRadius: "2px",
                              fontWeight: 900,
                              fontSize: "0.9rem",
                              background:
                                entry.rank === 1
                                  ? "#FFE600"
                                  : entry.rank === 2
                                  ? "#06B6D4"
                                  : entry.rank === 3
                                  ? "#A855F7"
                                  : "#000000",
                              color: entry.rank <= 3 ? "#000000" : "#FFFFFF",
                              border: "2px solid #000000",
                              boxShadow: "2px 2px 0px #000000",
                            }}
                          >
                            #{entry.rank}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", fontWeight: 800, color: "#FFFFFF" }}>
                          {entry.name}
                          {isUserRow && (
                            <span
                              className="font-mono text-xs"
                              style={{
                                marginLeft: "10px",
                                padding: "2px 6px",
                                background: "#A855F7",
                                color: "#FFF",
                                border: "1px solid #FFF",
                                fontWeight: 800,
                              }}
                            >
                              YOU
                            </span>
                          )}
                          <span
                            className="font-mono text-xs"
                            style={{
                              marginLeft: "8px",
                              padding: "2px 6px",
                              background: "rgba(168, 85, 247, 0.15)",
                              color: "#C084FC",
                              border: "1px solid rgba(168, 85, 247, 0.4)",
                            }}
                          >
                            {entry.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="font-mono text-xs" style={{ padding: "16px 20px", color: "#A8A0B8" }}>
                          {entry.members.join(", ")}
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          <span
                            className="font-mono text-xs"
                            style={{
                              padding: "4px 8px",
                              background: "rgba(6, 182, 212, 0.15)",
                              color: "#06B6D4",
                              border: "1px solid #06B6D4",
                              fontWeight: 800,
                            }}
                          >
                            Stage {entry.highestStage}
                          </span>
                        </td>
                        <td className="font-mono" style={{ padding: "16px 20px", fontWeight: 800, color: "#FFFFFF" }}>
                          {entry.solvedCount} / 8
                        </td>
                        <td
                          className="font-mono"
                          style={{
                            padding: "16px 20px",
                            textAlign: "right",
                            fontWeight: 900,
                            fontSize: "1.1rem",
                            color: "#A3E635",
                          }}
                        >
                          <AnimatedCounter value={entry.totalPoints} suffix=" PTS" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Retro Interactive OS Terminal Section ── */}
        <div style={{ marginTop: "48px" }}>
          <div className="retro-window" style={{ boxShadow: "10px 10px 0px #000" }}>
            <div className="retro-window-header" style={{ background: "#000", color: "#FFF" }}>
              <span>SCORE_ENGINE.EXE — TERMINAL CONSOLE</span>
              <span>v2.6</span>
            </div>

            <div style={{ background: "#000000", color: "#00FF66", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto" }}>
                {terminalLogs.map((log, idx) => (
                  <div key={idx} style={{ color: log.startsWith(">") ? "#06B6D4" : "#00FF66" }}>
                    {log}
                  </div>
                ))}
              </div>

              <form onSubmit={handleTerminalSubmit} style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid #333", paddingTop: "12px" }}>
                <span style={{ color: "#A855F7", fontWeight: 800 }}>&gt;</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="type 'help' or 'top'..."
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#00FF66",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.88rem",
                    width: "100%",
                  }}
                />
                <span className="animate-blink" style={{ color: "#00FF66" }}>█</span>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
