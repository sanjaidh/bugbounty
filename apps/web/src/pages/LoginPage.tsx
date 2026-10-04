import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { sound } from "../lib/sound";
import { authApi } from "../lib/api";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [compStatus, setCompStatus] = useState<{
    isActive: boolean;
    forceState: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");
  const [timerUnits, setTimerUnits] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    authApi.getCompetitionStatus().then((res) => {
      setCompStatus(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!compStatus) return;
    const updateTimer = () => {
      const nowMs = Date.now();
      const startMs = new Date(compStatus.startTime).getTime();
      const endMs = new Date(compStatus.endTime).getTime();

      const diffStart = Math.max(0, startMs - nowMs);
      const days = Math.floor(diffStart / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffStart / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffStart / (1000 * 60)) % 60);
      const seconds = Math.floor((diffStart / 1000) % 60);

      setTimerUnits({ days, hours, minutes, seconds });

      if (compStatus.isActive) {
        const remaining = endMs - nowMs;
        if (remaining <= 0) {
          setTimeLeftStr("00:00:00 - TIME IS UP!");
        } else {
          const hrs = Math.floor(remaining / 3600000);
          const mins = Math.floor((remaining % 3600000) / 60000);
          const secs = Math.floor((remaining % 60000) / 1000);
          setTimeLeftStr(`${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`);
        }
      } else {
        if (nowMs >= endMs) {
          setTimeLeftStr("COMPETITION ENDED");
        } else if (nowMs < startMs) {
          setTimeLeftStr(`${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
        } else {
          setTimeLeftStr("PAUSED / STOPPED");
        }
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [compStatus]);

  // Terminal interactive state for retro OS section
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "BUG_BOUNTYY_OS v2.6.0 [INITIALIZED]",
    "Type 'help' for available commands or 'status' to check system state.",
  ]);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toLowerCase();
    if (!cmd) return;
    sound.playClick();

    let output = "";
    if (cmd === "help") {
      output = "COMMANDS: help | rules | status | clear | matrix";
    } else if (cmd === "rules") {
      output = "RULES: 1. No DDoS against platform. 2. Standard SHA-256 flag verification. 3. Submissions rate-limited (5s cooldown).";
    } else if (cmd === "status") {
      output = "STATUS: Competition ACTIVE. All stages unlocked & verified.";
    } else if (cmd === "matrix") {
      output = "01000011 01011001 01000010 01000101 01010010 01000011 01000001 01010010 01001110 01001001 01010110 01000001 01001100";
    } else if (cmd === "clear") {
      setTerminalLogs([]);
      setTerminalInput("");
      return;
    } else {
      output = `Command not recognized: '${cmd}'. Type 'help' for commands.`;
    }

    setTerminalLogs((prev) => [...prev, `> ${terminalInput}`, output]);
    setTerminalInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    sound.playClick();

    try {
      await login(username.trim(), password);
      sound.playSuccess();
      showSuccess(`Welcome to Bug Bountyy, ${username}!`, "AUTHENTICATED");
      navigate("/challenges");
    } catch (err) {
      sound.playError();
      const msg = (err as Error).message;
      setError(msg);
      showError(msg, "AUTHENTICATION FAILED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "#FFFFFF", overflowX: "hidden" }}>
      {/* ── Top Header Bar ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(5, 2, 12, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "2px solid #06B6D4",
          boxShadow: "0 0 20px rgba(6, 182, 212, 0.3)",
          padding: "10px 24px",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          {/* Logo Box */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                border: "2px solid #06B6D4",
                background: "#000",
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

            <h1 className="font-pixel" style={{ fontSize: "1rem", color: "#FFFFFF", textShadow: "0 0 10px #A855F7, 2px 2px 0px #000", margin: 0, letterSpacing: "1px" }}>
              Bug <span style={{ color: "#A855F7" }}>Bountyy</span>
            </h1>

            {/* Single Cyber Carnival badge */}
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

          {/* Top Navigation Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
            {["TICKETS", "USERS", "TEAMS", "SCOREBOARD", "CHALLENGES", "NOTIFICATIONS", "PROFILE"].map((item) => (
              <a
                key={item}
                href={item === "SCOREBOARD" ? "/live" : item === "CHALLENGES" ? "/challenges" : "#about-section"}
                onClick={() => sound.playClick()}
                className="font-mono"
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: item === "CHALLENGES" || item === "SCOREBOARD" ? "#06B6D4" : "#A8A0B8",
                  textDecoration: "none",
                  letterSpacing: "0.1em",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#A855F7";
                  e.currentTarget.style.textShadow = "0 0 8px #A855F7";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = item === "CHALLENGES" || item === "SCOREBOARD" ? "#06B6D4" : "#A8A0B8";
                  e.currentTarget.style.textShadow = "none";
                }}
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main Hero & Login Arena Section ── */}
      <section
        style={{
          minHeight: "calc(100vh - 65px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          position: "relative",
          background: "radial-gradient(ellipse at 50% 30%, rgba(168, 85, 247, 0.15) 0%, rgba(3, 1, 6, 0.95) 75%)",
        }}
      >
        <div style={{ maxWidth: "1280px", width: "100%", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "48px", alignItems: "center" }}>
          {/* Left Side: Hero Text */}
          <div className="animate-slideUp">
            {/* Event Tag */}
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
                marginBottom: "24px",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#A3E635", boxShadow: "0 0 10px #A3E635" }} />
              <span className="font-pixel" style={{ fontSize: "0.65rem", color: "#06B6D4", letterSpacing: "1px" }}>
                BUG BOUNTY ARENA
              </span>
            </div>

            {/* Hero Title */}
            <h2
              className="font-pixel"
              style={{
                fontSize: "2.4rem",
                lineHeight: 1.3,
                color: "#FFFFFF",
                textShadow: "0 0 20px #A855F7, 3px 3px 0px #000",
                marginBottom: "20px",
              }}
            >
              Welcome to <br />
              <span style={{ color: "#A855F7" }}>Bug</span> <span style={{ color: "#06B6D4" }}>Bountyy</span>
            </h2>

            <p style={{ fontSize: "1.1rem", color: "#A8A0B8", marginBottom: "32px", maxWidth: "520px", lineHeight: 1.6 }}>
              Step into the arena. Learn, compete, and capture flags across progressive security tracks designed for offensive security mindsets.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              <a
                href="#login-card"
                onClick={() => sound.playClick()}
                className="pixel-btn-magenta"
              >
                Challenges ▶
              </a>
              <a
                href="/live"
                onClick={() => sound.playClick()}
                className="pixel-btn-cyan"
              >
                Scoreboard ♜
              </a>
            </div>

            {/* Live Competition Status Ticker */}
            <div style={{ marginTop: "40px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  ARENA STATUS
                </span>
                <span className="font-mono" style={{ fontSize: "0.9rem", color: compStatus?.isActive ? "#A3E635" : "#F59E0B", fontWeight: 800 }}>
                  {compStatus?.isActive ? `● LIVE NOW — ⏱️ ${timeLeftStr}` : `⏸ ${timeLeftStr === "COMPETITION ENDED" ? "⚠️ TIME IS UP (COMPETITION ENDED)" : `NOT STARTED (${timeLeftStr || "LOCKED"})`}`}
                </span>
              </div>
              <div style={{ width: "1px", height: "30px", background: "rgba(255,255,255,0.15)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  TOTAL PRIZE POOL
                </span>
                <span className="font-mono" style={{ fontSize: "0.9rem", color: "#06B6D4", fontWeight: 800 }}>
                  2,000 PTS
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Retro Login Card */}
          <div id="login-card" className="animate-fadeIn">
            <div
              style={{
                background: "rgba(10, 5, 22, 0.92)",
                border: "3px solid #A855F7",
                borderRadius: "4px",
                padding: "32px",
                boxShadow: "0 0 40px rgba(168, 85, 247, 0.4), 8px 8px 0px #000000",
                backdropFilter: "blur(20px)",
                position: "relative",
              }}
            >
              {/* Retro Card Header */}
              <div style={{ borderBottom: "2px solid rgba(168, 85, 247, 0.3)", paddingBottom: "16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#A855F7", boxShadow: "0 0 10px #A855F7" }} />
                  <span className="font-pixel" style={{ fontSize: "0.75rem", color: "#FFFFFF", letterSpacing: "1px" }}>
                    OPERATIVE LOGIN
                  </span>
                </div>
                <span className="font-mono text-xs" style={{ color: "#06B6D4" }}>
                  BUG_BOUNTYY_AUTH
                </span>
              </div>

              {/* Competition Inactive / Pre-start Banner */}
              {compStatus && !compStatus.isActive && (
                <div
                  style={{
                    background: "rgba(10, 5, 22, 0.95)",
                    border: "3px solid #A855F7",
                    borderRadius: "4px",
                    padding: "20px",
                    marginBottom: "24px",
                    boxShadow: "0 0 25px rgba(168, 85, 247, 0.3), 5px 5px 0px #000000",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span className="font-pixel" style={{ color: "#A855F7", fontSize: "0.75rem", letterSpacing: "1px" }}>
                      ⏱️ COMPETITION BEGINS IN
                    </span>
                    <span className="font-mono text-xs" style={{ color: "#06B6D4", fontWeight: 800 }}>
                      PRE-START LOCK
                    </span>
                  </div>

                  <p className="font-mono text-xs" style={{ color: "#A8A0B8", margin: "0 0 16px 0", lineHeight: 1.5 }}>
                    Player login and challenge tracks are locked until the competition officially starts.
                  </p>

                  {/* 4-Unit Retro Digit Box Display */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "space-between" }}>
                    <div style={{ textAlign: "center", flex: 1, background: "#000000", border: "2px solid #06B6D4", padding: "10px 4px", borderRadius: "3px" }}>
                      <div className="font-pixel" style={{ fontSize: "1.4rem", color: "#A3E635", textShadow: "0 0 10px #A3E635" }}>
                        {pad(timerUnits.days)}
                      </div>
                      <div className="font-mono text-xs" style={{ color: "#A8A0B8", marginTop: 4, fontWeight: 800 }}>DAYS</div>
                    </div>
                    <span className="font-pixel" style={{ color: "#A855F7", fontSize: "1.2rem" }}>:</span>
                    <div style={{ textAlign: "center", flex: 1, background: "#000000", border: "2px solid #06B6D4", padding: "10px 4px", borderRadius: "3px" }}>
                      <div className="font-pixel" style={{ fontSize: "1.4rem", color: "#A3E635", textShadow: "0 0 10px #A3E635" }}>
                        {pad(timerUnits.hours)}
                      </div>
                      <div className="font-mono text-xs" style={{ color: "#A8A0B8", marginTop: 4, fontWeight: 800 }}>HRS</div>
                    </div>
                    <span className="font-pixel" style={{ color: "#A855F7", fontSize: "1.2rem" }}>:</span>
                    <div style={{ textAlign: "center", flex: 1, background: "#000000", border: "2px solid #06B6D4", padding: "10px 4px", borderRadius: "3px" }}>
                      <div className="font-pixel" style={{ fontSize: "1.4rem", color: "#A3E635", textShadow: "0 0 10px #A3E635" }}>
                        {pad(timerUnits.minutes)}
                      </div>
                      <div className="font-mono text-xs" style={{ color: "#A8A0B8", marginTop: 4, fontWeight: 800 }}>MIN</div>
                    </div>
                    <span className="font-pixel" style={{ color: "#A855F7", fontSize: "1.2rem" }}>:</span>
                    <div style={{ textAlign: "center", flex: 1, background: "#000000", border: "2px solid #06B6D4", padding: "10px 4px", borderRadius: "3px" }}>
                      <div className="font-pixel" style={{ fontSize: "1.4rem", color: "#A3E635", textShadow: "0 0 10px #A3E635" }}>
                        {pad(timerUnits.seconds)}
                      </div>
                      <div className="font-mono text-xs" style={{ color: "#A8A0B8", marginTop: 4, fontWeight: 800 }}>SEC</div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="alert alert-error" style={{ marginBottom: "20px", border: "2px solid #FB7185" }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="form-group">
                  <label htmlFor="username" className="form-label" style={{ color: "#06B6D4" }}>
                    Calls / Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    className="form-input form-input--mono"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. player1"
                    autoComplete="username"
                    required
                    disabled={loading}
                    style={{ background: "#05020A", border: "2px solid #241A35", color: "#FFF" }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label" style={{ color: "#06B6D4" }}>
                    Passcode / Flag Key
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="form-input form-input--mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    style={{ background: "#05020A", border: "2px solid #241A35", color: "#FFF" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="pixel-btn-magenta"
                  style={{ width: "100%", marginTop: "10px" }}
                >
                  {loading ? "AUTHENTICATING..." : "ENTER ARENA ▶"}
                </button>
              </form>

              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <p className="font-mono text-xs" style={{ color: "var(--text-muted)", margin: 0 }}>
                  Official Event Credentials Issued by Organizers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Glitch Divider Bar ── */}
      <div className="glitch-divider" />

      {/* ── Section 2: Y2K Retro Brutalist Split Screen (Reference Image 2 Style) ── */}
      <section
        id="about-section"
        style={{
          background: "#F5F5F7",
          color: "#000000",
          padding: "80px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: "1350px", margin: "0 auto" }}>
          {/* Top Banner Tag */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px", flexWrap: "wrap", gap: "16px" }}>
            <span className="y2k-badge">THE RAW WEB OF 2026</span>
            <span className="font-mono" style={{ fontSize: "0.8rem", fontWeight: 800, color: "#000" }}>
              // ARENA DISCIPLINE: OFFENSIVE SECURITY & BUG HUNTING
            </span>
          </div>

          {/* Brutalist Split Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "40px", alignItems: "start" }}>
            {/* Left Column: Bold Y2K Brutalist Typography (MAKE. style) */}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "4.5rem",
                  fontWeight: 900,
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: "#000000",
                  marginBottom: "24px",
                  textTransform: "uppercase",
                }}
              >
                HACK.<br />
                BREAK.<br />
                CLAIM.
              </h2>

              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#333333", lineHeight: 1.6, marginBottom: "24px" }}>
                Bug Bountyy is a high-intensity offensive security challenge arena. Hunt vulnerabilities, analyze security flaws, and claim bounties across Web, Binary, OSINT, and Reverse Engineering stages. May your exploits be swift, your flags valid, and best of luck to all operatives in the arena! 🏴‍☠️⚡
              </p>

              {/* Checkered Y2K Feature Box */}
              <div className="retro-window" style={{ padding: "20px" }}>
                <div className="retro-window-header">
                  <span>EVENT_SPECS.LOG</span>
                  <span>[OK]</span>
                </div>
                <div style={{ paddingTop: "14px", display: "grid", gap: "10px", fontSize: "0.88rem" }}>
                  <div><strong>▸ INFRASTRUCTURE:</strong> Real-time WebSocket Leaderboard &amp; Solve Flash Alerts</div>
                  <div><strong>▸ FLAG SECURITY:</strong> Cryptographic SHA-256 flag validation</div>
                  <div><strong>▸ CHALLENGES:</strong> Multi-disciplinary signal processing, web, network, &amp; reverse engineering</div>
                  <div><strong>▸ RULES:</strong> Fair play, rate-limited attempts, automated anti-cheat engine</div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Retro Terminal Widget (Reference DESIGN.EXE) */}
            <div>
              <div className="retro-window" style={{ boxShadow: "10px 10px 0px #000" }}>
                <div className="retro-window-header" style={{ background: "#000", color: "#FFF" }}>
                  <span>BUG_BOUNTYY.EXE — TERMINAL</span>
                  <span>v2.6</span>
                </div>

                <div style={{ background: "#000000", color: "#00FF66", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", minHeight: "280px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  {/* Logs list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "220px", overflowY: "auto" }}>
                    {terminalLogs.map((log, idx) => (
                      <div key={idx} style={{ color: log.startsWith(">") ? "#06B6D4" : "#00FF66" }}>
                        {log}
                      </div>
                    ))}
                  </div>

                  {/* Terminal input form */}
                  <form onSubmit={handleTerminalSubmit} style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid #333", paddingTop: "12px" }}>
                    <span style={{ color: "#A855F7", fontWeight: 800 }}>&gt;</span>
                    <input
                      type="text"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder="type 'help'..."
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
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "#000", borderTop: "2px solid #241A35", padding: "24px", textAlign: "center" }}>
        <p className="font-mono text-xs" style={{ color: "var(--text-muted)", margin: 0 }}>
          Bug Bountyy &bull; Part of Cyber Carnival 2026 &bull; Designed with Retro Brutalist &amp; Y2K Glitch Aesthetics
        </p>
      </footer>
    </div>
  );
}
