import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import CountdownTimer from "../components/CountdownTimer";
import AnimatedCounter from "../components/AnimatedCounter";
import { challengeApi, Challenge } from "../lib/api";
import { sound } from "../lib/sound";

const TYPE_ICONS: Record<string, string> = {
  SSTV: "📻",
  OSINT: "🔍",
  STEGANOGRAPHY: "🖼",
  NETWORK: "🌐",
  WEB: "🕷",
  REVERSE_ENGINEERING: "🔬",
};

const TYPE_LABELS: Record<string, string> = {
  SSTV: "SSTV",
  OSINT: "OSINT",
  STEGANOGRAPHY: "Steganography",
  NETWORK: "Network",
  WEB: "Web",
  REVERSE_ENGINEERING: "Rev Eng",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "SOLVED")
    return <span className="badge badge-green" style={{ border: "1px solid #A3E635", color: "#A3E635" }}>✓ SOLVED</span>;
  if (status === "UNLOCKED")
    return <span className="badge badge-cyan" style={{ border: "1px solid #06B6D4", color: "#06B6D4" }}>▶ ACTIVE</span>;
  return <span className="badge badge-gray" style={{ border: "1px solid #5A5270" }}>🔒 LOCKED</span>;
}

function ChallengeCardSkeleton({ index }: { index: number }) {
  return (
    <div className="retro-window" style={{ height: 260, display: "flex", flexDirection: "column", gap: 16, background: "#05020A", borderColor: "#241A35" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 2 }} />
        <div className="skeleton" style={{ width: 60, height: 20 }} />
      </div>
      <div className="skeleton" style={{ width: "70%", height: 24 }} />
      <div className="skeleton" style={{ width: "100%", height: 48 }} />
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between" }}>
        <div className="skeleton" style={{ width: 80, height: 24 }} />
        <div className="skeleton" style={{ width: 100, height: 36 }} />
      </div>
    </div>
  );
}

function ChallengeCard({ challenge, index }: { challenge: Challenge; index: number }) {
  const isLocked = challenge.status === "LOCKED";
  const isSolved = challenge.status === "SOLVED";

  return (
    <div
      className="animate-fadeIn glitch-hover"
      style={{
        animationDelay: `${index * 60}ms`,
        opacity: isLocked ? 0.6 : 1,
        filter: isLocked ? "grayscale(0.4)" : "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        if (!isLocked) {
          e.currentTarget.style.transform = "translate(-3px, -3px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isLocked) {
          e.currentTarget.style.transform = "translate(0, 0)";
        }
      }}
    >
      <div
        style={{
          background: isSolved
            ? "rgba(10, 25, 18, 0.95)"
            : isLocked
            ? "rgba(15, 10, 24, 0.75)"
            : "rgba(10, 5, 22, 0.92)",
          border: isSolved
            ? "3px solid #A3E635"
            : isLocked
            ? "3px solid #241A35"
            : "3px solid #06B6D4",
          boxShadow: isSolved
            ? "0 0 25px rgba(163,230,53,0.25), 6px 6px 0px #000000"
            : isLocked
            ? "4px 4px 0px #000000"
            : "0 0 25px rgba(6,182,212,0.25), 6px 6px 0px #000000",
          borderRadius: "3px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Retro Window Top Bar */}
        <div
          style={{
            background: "#000000",
            borderBottom: isSolved
              ? "2px solid #A3E635"
              : isLocked
              ? "2px solid #241A35"
              : "2px solid #06B6D4",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            fontWeight: 800,
            color: isSolved ? "#A3E635" : isLocked ? "#A8A0B8" : "#06B6D4",
            letterSpacing: "0.08em",
          }}
        >
          <span>STAGE_0{challenge.stageNumber}.EXE</span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.65rem", color: isSolved ? "#A3E635" : "#A855F7" }}>
              [{isSolved ? "COMPLETED" : isLocked ? "LOCKED" : "READY"}]
            </span>
          </div>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1, gap: "16px" }}>
          {/* Icon + Title */}
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "8px", display: "inline-block" }}>
              {TYPE_ICONS[challenge.type] ?? "⚡"}
            </div>
            <h3
              className="font-display"
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#FFFFFF",
                marginBottom: "8px",
                lineHeight: 1.3,
              }}
            >
              {challenge.title}
            </h3>
            <span
              className="font-mono text-xs"
              style={{
                background: "rgba(244, 63, 94, 0.15)",
                color: "#A855F7",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                padding: "2px 6px",
                borderRadius: "2px",
                fontWeight: 700,
              }}
            >
              {TYPE_LABELS[challenge.type] ?? challenge.type}
            </span>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: "0.88rem",
              color: "#A8A0B8",
              lineHeight: 1.6,
              flex: 1,
            }}
          >
            {isLocked
              ? "Complete the previous stage in sequence to unlock this challenge."
              : challenge.description}
          </p>

          {/* Meta & Status Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "12px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <StatusBadge status={challenge.status} />
              <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#06B6D4" }}>
                {challenge.points} PTS
              </span>
            </div>

            {isSolved && challenge.solvedAt && (
              <span style={{ fontSize: "0.7rem", color: "#A3E635" }}>
                ✓ {new Date(challenge.solvedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* CTA Action Button */}
          {!isLocked && (
            <Link
              to={`/challenges/${challenge.id}`}
              id={`challenge-card-${challenge.id}`}
              onClick={() => sound.playClick()}
              className={isSolved ? "pixel-btn-lime" : "pixel-btn-magenta"}
              style={{ width: "100%", textDecoration: "none", textAlign: "center", marginTop: "4px" }}
            >
              {isSolved ? "REVIEW STAGE ▶" : "ENTER STAGE ▶"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChallengePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [competitionActive, setCompetitionActive] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);

  // Terminal state for retro OS interactive panel
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "CHALLENGE_STATION.EXE v2.6.0 [ONLINE]",
    "Operative security tracks initialized. Type 'help' or 'bounties' for command log.",
  ]);

  // Search & Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    challengeApi
      .list()
      .then((res) => {
        setChallenges(res.data.challenges);
        setCompetitionActive(res.data.competitionActive);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const triggerGlitchEffect = () => {
    sound.playStinger();
    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 900);
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toLowerCase();
    if (!cmd) return;
    sound.playClick();

    let output = "";
    if (cmd === "help") {
      output = "COMMANDS: help | status | bounties | luck | matrix | glitch | clear";
    } else if (cmd === "bounties") {
      output = "BOUNTIES: 8 Progressive CTF Stages • Total 2,000 PTS • Cryptographic Flag Engine.";
    } else if (cmd === "luck") {
      output = "MESSAGE: May your exploits execute cleanly, your payloads land true, and your flag captures be swift! Good luck operatives! 🏴‍☠️✨";
    } else if (cmd === "status") {
      output = `ARENA STATUS: ${challenges.length} Stages Unlocked. Competition ACTIVE.`;
    } else if (cmd === "matrix") {
      output = "01000011 01011001 01000010 01010000 01010101 01001110 01001011 00100000 00110010 00110000 00110010 00110110";
    } else if (cmd === "glitch") {
      triggerGlitchEffect();
      output = "SYS_ALERT: GLITCH OVERDRIVE ACTIVATED!";
    } else if (cmd === "clear") {
      setTerminalLogs([]);
      setTerminalInput("");
      return;
    } else {
      output = `Unknown command: '${cmd}'. Type 'help' for options.`;
    }

    setTerminalLogs((prev) => [...prev, `> ${terminalInput}`, output]);
    setTerminalInput("");
  };

  const categories = ["ALL", ...Array.from(new Set(challenges.map((c) => c.type)))];

  const filteredChallenges = challenges.filter((c) => {
    const matchesCategory = selectedCategory === "ALL" || c.type === selectedCategory;
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const solvedCount = challenges.filter((c) => c.status === "SOLVED").length;
  const totalPoints = challenges
    .filter((c) => c.status === "SOLVED")
    .reduce((s, c) => s + c.points, 0);

  return (
    <div style={{ minHeight: "100vh", position: "relative", zIndex: 1, color: "#FFFFFF" }}>
      {glitchActive && <div className="glitch-overlay" />}
      <NavBar />

      <main className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        {/* ── Top Hero Arena Banner (Login Page Aesthetic) ── */}
        <div style={{ marginBottom: "40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "24px",
            }}
          >
            <div style={{ maxWidth: "680px" }}>
              {/* Event Badge */}
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
                  BUG BOUNTY ARENA // CHALLENGE TRACKS
                </span>
              </div>

              <h1
                className="font-pixel glitch-text"
                data-text="CHALLENGE CHAIN"
                style={{
                  fontSize: "2.2rem",
                  lineHeight: 1.3,
                  color: "#FFFFFF",
                  textShadow: "0 0 20px #A855F7, 3px 3px 0px #000",
                  margin: "0 0 16px 0",
                }}
              >
                Challenge <span style={{ color: "#A855F7" }}>Chain</span>
              </h1>

              <p style={{ fontSize: "1.05rem", color: "#A8A0B8", lineHeight: 1.6, margin: 0 }}>
                Hunt security vulnerabilities across progressive stages. Discover exploits, analyze attack vectors, and claim bounties across Web, Binary, OSINT, and Reverse Engineering stages. May your exploits execute cleanly and good luck to all operatives! 🏴‍☠️✨
              </p>
            </div>

            {/* Right Status Cards */}
            {!loading && challenges.length > 0 && (
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                {/* Glitch Trigger Button */}
                <button
                  onClick={triggerGlitchEffect}
                  className="pixel-btn-cyan"
                  style={{ padding: "12px 18px", fontSize: "0.68rem" }}
                  title="Trigger Glitch FX"
                >
                  ⚡ GLITCH OVERDRIVE
                </button>

                <div
                  style={{
                    background: "rgba(10, 5, 22, 0.92)",
                    border: "3px solid #A3E635",
                    boxShadow: "5px 5px 0px #000000",
                    padding: "16px 24px",
                    textAlign: "center",
                    borderRadius: "3px",
                  }}
                >
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#A3E635", fontFamily: "var(--font-mono)" }}>
                    <AnimatedCounter value={solvedCount} /> / {challenges.length}
                  </div>
                  <div className="font-mono text-xs" style={{ color: "#A8A0B8", marginTop: 2, fontWeight: 800 }}>
                    STAGES SOLVED
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(10, 5, 22, 0.92)",
                    border: "3px solid #06B6D4",
                    boxShadow: "5px 5px 0px #000000",
                    padding: "16px 24px",
                    textAlign: "center",
                    borderRadius: "3px",
                  }}
                >
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#06B6D4", fontFamily: "var(--font-mono)" }}>
                    <AnimatedCounter value={totalPoints} suffix=" PTS" />
                  </div>
                  <div className="font-mono text-xs" style={{ color: "#A8A0B8", marginTop: 2, fontWeight: 800 }}>
                    BOUNTIES EARNED
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Glitch Divider Bar */}
        <div className="glitch-divider" style={{ marginBottom: "32px" }} />

        {/* Countdown Timer */}
        <CountdownTimer />

        {/* ── Search & Retro Category Toolbar ── */}
        {!loading && challenges.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "32px",
              background: "rgba(10, 5, 22, 0.92)",
              border: "3px solid #A855F7",
              boxShadow: "6px 6px 0px #000000",
              padding: "18px 24px",
              borderRadius: "3px",
            }}
          >
            {/* Category tabs */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      sound.playClick();
                      setSelectedCategory(cat);
                    }}
                    className="font-mono"
                    style={{
                      background: active ? "#06B6D4" : "#000000",
                      border: active ? "2px solid #FFFFFF" : "2px solid #06B6D4",
                      color: active ? "#000000" : "#06B6D4",
                      padding: "6px 14px",
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      cursor: "pointer",
                      boxShadow: active ? "3px 3px 0px #A855F7" : "3px 3px 0px #000000",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cat === "ALL" ? "ALL STAGES" : (TYPE_LABELS[cat] ?? cat).toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Command Search Box */}
            <div style={{ position: "relative", width: 280, maxWidth: "100%" }}>
              <span className="font-mono" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#A855F7", fontWeight: 800 }}>&gt;</span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-input form-input--mono"
                placeholder="search_stages... (/)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  paddingLeft: 30,
                  paddingRight: 32,
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
                    fontSize: "0.9rem",
                    fontWeight: 800,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Challenge Grid Content ── */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ChallengeCardSkeleton key={i} index={i} />
            ))}
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        ) : challenges.length === 0 ? (
          <div className="retro-window text-center animate-fadeIn" style={{ padding: "48px", background: "rgba(10, 5, 22, 0.92)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🏗️</div>
            <h2 className="font-pixel" style={{ fontSize: "1.2rem", color: "#FFFFFF" }}>STAGES COMING SOON</h2>
            <p className="font-mono" style={{ marginTop: "12px", color: "#A8A0B8" }}>
              The event admins are initializing challenge stages. Check back soon.
            </p>
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="retro-window text-center animate-fadeIn" style={{ padding: "40px", background: "rgba(10, 5, 22, 0.92)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔍</div>
            <h3 className="font-pixel" style={{ fontSize: "1rem" }}>NO MATCHING CHALLENGES</h3>
            <p className="font-mono" style={{ marginTop: "8px", color: "#A8A0B8", marginBottom: "20px" }}>
              No challenge stages match your filter parameters.
            </p>
            <button
              className="pixel-btn-cyan"
              onClick={() => {
                setSelectedCategory("ALL");
                setSearchTerm("");
              }}
            >
              RESET FILTERS ↺
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "28px" }}>
              {filteredChallenges.map((challenge, i) => (
                <ChallengeCard key={challenge.id} challenge={challenge} index={i} />
              ))}
            </div>

            {/* Overall Chain Progress Bar Box */}
            <div
              className="animate-slideUp"
              style={{
                marginTop: "48px",
                padding: "24px",
                background: "rgba(10, 5, 22, 0.92)",
                border: "3px solid #06B6D4",
                boxShadow: "8px 8px 0px #000000",
                borderRadius: "3px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
                <span className="font-pixel" style={{ fontSize: "0.75rem", color: "#FFFFFF", letterSpacing: "1px" }}>
                  OVERALL CHAIN PROGRESS
                </span>
                <span className="font-mono" style={{ fontSize: "0.95rem", fontWeight: 900, color: "#A3E635" }}>
                  {Math.round((solvedCount / challenges.length) * 100)}% COMPLETE
                </span>
              </div>

              <div
                style={{
                  height: 14,
                  background: "#05020A",
                  border: "2px solid #241A35",
                  borderRadius: "2px",
                  overflow: "hidden",
                  padding: "2px",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(solvedCount / challenges.length) * 100}%`,
                    background: "linear-gradient(90deg, #A855F7 0%, #06B6D4 50%, #A3E635 100%)",
                    borderRadius: "1px",
                    transition: "width 0.8s ease",
                    boxShadow: "0 0 12px #A3E635",
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Retro Interactive OS Terminal Section ── */}
        <div style={{ marginTop: "48px" }}>
          <div className="retro-window" style={{ boxShadow: "10px 10px 0px #000" }}>
            <div className="retro-window-header" style={{ background: "#000", color: "#FFF" }}>
              <span>CHALLENGE_STATION.EXE — ARENA TERMINAL</span>
              <span>v2.6</span>
            </div>

            <div style={{ background: "#000000", color: "#00FF66", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "0.85rem", minHeight: "240px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto" }}>
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
                  placeholder="type 'help' or 'bounties'..."
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
