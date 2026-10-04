import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { challengeApi, Challenge } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { sound } from "../lib/sound";

const TYPE_ICONS: Record<string, string> = {
  SSTV: "📻",
  OSINT: "🔍",
  STEGANOGRAPHY: "🖼",
  NETWORK: "🌐",
  WEB: "🕷",
  REVERSE_ENGINEERING: "🔬",
};

function FlagSubmitter({
  challengeId,
  points,
  onSolved,
}: {
  challengeId: string;
  points: number;
  onSolved: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [errorPulse, setErrorPulse] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    setResult(null);
    setSuccessAnimation(false);
    setErrorPulse(false);

    try {
      const res = await challengeApi.submit(challengeId, answer.trim());
      setResult({ correct: res.data.correct, message: res.data.message });

      if (res.data.correct) {
        setSuccessAnimation(true);
        sound.playSuccess();
        showSuccess(`+${points} POINTS EARNED!`, "✓ FLAG CAPTURED");
        onSolved();
        setAnswer("");
      } else {
        setErrorPulse(true);
        sound.playError();
        showError(res.data.message || "Incorrect flag. Try again!", "✕ VERIFICATION FAILED");
        setTimeout(() => setErrorPulse(false), 800);
      }
    } catch (err) {
      setErrorPulse(true);
      sound.playError();
      const msg = (err as Error).message;
      setResult({ correct: false, message: msg });
      showError(msg, "Submission Error");
      setTimeout(() => setErrorPulse(false), 800);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="animate-slideUp"
      style={{
        background: "rgba(10, 5, 22, 0.95)",
        border: successAnimation
          ? "3px solid #A3E635"
          : errorPulse
          ? "3px solid #FB7185"
          : "3px solid #A855F7",
        boxShadow: successAnimation
          ? "0 0 35px rgba(163,230,53,0.4), 6px 6px 0px #000000"
          : errorPulse
          ? "0 0 30px rgba(251,113,133,0.4), 6px 6px 0px #000000"
          : "6px 6px 0px #000000",
        borderRadius: "3px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Retro Header Bar */}
      <div
        style={{
          background: "#000000",
          borderBottom: "2px solid #A855F7",
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          fontWeight: 800,
          color: "#A855F7",
          letterSpacing: "0.08em",
        }}
      >
        <span>FLAG_VERIFICATION_MODULE.EXE</span>
        <span>[{submitting ? "VERIFYING..." : "READY"}]</span>
      </div>

      <div style={{ padding: "24px" }}>
        {successAnimation && (
          <div
            className="animate-slideUp font-pixel"
            style={{
              position: "absolute",
              top: 42,
              right: 16,
              background: "#A3E635",
              color: "#000000",
              padding: "6px 14px",
              border: "2px solid #000",
              fontWeight: 900,
              fontSize: "0.7rem",
              boxShadow: "3px 3px 0px #000",
            }}
          >
            +{points} PTS CAPTURED! 🎉
          </div>
        )}

        <h3
          className="font-pixel"
          style={{
            fontSize: "0.95rem",
            color: "#FFFFFF",
            marginBottom: "16px",
          }}
        >
          🎯 SUBMIT ANSWER
        </h3>

        {result && (
          <div
            className={`alert ${result.correct ? "alert-success" : "alert-error"} animate-fadeIn`}
            style={{ marginBottom: "20px", border: result.correct ? "2px solid #A3E635" : "2px solid #FB7185" }}
          >
            <span>{result.correct ? "✓" : "✕"}</span>
            <span style={{ fontWeight: 700 }} className="font-mono">{result.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <input
            id="flag-input"
            type="text"
            className="form-input form-input--mono"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter your answer..."
            disabled={submitting}
            style={{
              flex: 1,
              minWidth: 240,
              background: "#05020A",
              border: errorPulse ? "2px solid #FB7185" : "2px solid #06B6D4",
              color: "#FFF",
            }}
          />
          <button
            id="submit-flag-btn"
            type="submit"
            className="pixel-btn-magenta"
            disabled={submitting || !answer.trim()}
            style={{
              minWidth: 170,
            }}
          >
            {submitting ? "VERIFYING..." : successAnimation ? "✓ VERIFIED" : "SUBMIT FLAG ▶"}
          </button>
        </form>
      </div>
    </div>
  );
}


function ChallengeContent({ challenge }: { challenge: Challenge }) {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const contentUrl = challenge.contentUrl?.trim() || "";

  if (!contentUrl && !challenge.contentHtml) return null;

  const lowerUrl = contentUrl.toLowerCase();
  const isExternal = lowerUrl.startsWith("http://") || lowerUrl.startsWith("https://");
  
  // Full target URL for media and downloads
  const fullUrl = isExternal ? contentUrl : `${API_URL}${contentUrl.startsWith('/') ? '' : '/'}${contentUrl}`;

  // File extension detectors
  const isImageFile = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(contentUrl);
  const isAudioFile = /\.(wav|mp3|ogg|aac|flac)(\?.*)?$/i.test(contentUrl);
  const isJupyterNotebook = /\.ipynb(\?.*)?$/i.test(contentUrl) || lowerUrl.includes("jupyter");

  // Category Icon helper
  const getCategoryIcon = (type: string) => {
    const upper = (type || "").toUpperCase();
    if (upper.includes("SSTV") || upper.includes("AUDIO")) return "📻";
    if (upper.includes("OSINT") || upper.includes("INVESTIGATION")) return "🔍";
    if (upper.includes("STEG")) return "🖼";
    if (upper.includes("FORENSIC") || upper.includes("DISK")) return "💾";
    if (upper.includes("REV") || upper.includes("BINARY")) return "🔬";
    if (upper.includes("WEB")) return "🕷";
    return "📦";
  };

  // 1. Audio Transmissions (SSTV / WAV / Audio files)
  if (isAudioFile || (challenge.type === "SSTV" && !isExternal)) {
    return (
      <div
        style={{
          background: "rgba(10, 5, 22, 0.95)",
          border: "3px solid #06B6D4",
          boxShadow: "6px 6px 0px #000000",
          borderRadius: "3px",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <h3 className="font-pixel" style={{ fontSize: "0.95rem", color: "#FFFFFF", marginBottom: "12px" }}>
          📻 {challenge.type} AUDIO TRANSMISSION
        </h3>
        <p className="font-mono text-xs" style={{ color: "#A8A0B8", marginBottom: "16px" }}>
          Download and analyze this audio transmission for hidden signals.
        </p>
        <audio
          id="sstv-player"
          controls
          style={{ width: "100%", marginBottom: "16px" }}
          src={fullUrl}
        />
        <a
          href={fullUrl}
          download
          className="pixel-btn-cyan"
          id="sstv-download-btn"
          onClick={() => sound.playClick()}
          style={{ textDecoration: "none" }}
        >
          ⬇ DOWNLOAD AUDIO FILE
        </a>
      </div>
    );
  }

  // 2. Image Display (Steganography / Image files)
  if (isImageFile) {
    return (
      <div
        style={{
          background: "rgba(10, 5, 22, 0.95)",
          border: "3px solid #06B6D4",
          boxShadow: "6px 6px 0px #000000",
          borderRadius: "3px",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <h3 className="font-pixel" style={{ fontSize: "0.95rem", color: "#FFFFFF", marginBottom: "12px" }}>
          🖼 {challenge.type} TARGET IMAGE
        </h3>
        <p className="font-mono text-xs" style={{ color: "#A8A0B8", marginBottom: "16px" }}>
          Examine this image file using forensic or steganography tools.
        </p>
        <img
          src={fullUrl}
          alt="Challenge target"
          id="challenge-image"
          style={{
            maxWidth: "100%",
            borderRadius: "2px",
            border: "2px solid #06B6D4",
            marginBottom: "16px",
          }}
        />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a
            href={fullUrl}
            download
            className="pixel-btn-cyan"
            id="image-download-btn"
            onClick={() => sound.playClick()}
            style={{ textDecoration: "none" }}
          >
            ⬇ DOWNLOAD IMAGE FILE
          </a>
          {isExternal && (
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pixel-btn-magenta"
              onClick={() => sound.playClick()}
              style={{ textDecoration: "none" }}
            >
              OPEN LINK IN NEW TAB ▶
            </a>
          )}
        </div>
      </div>
    );
  }

  // 3. Jupyter Notebook specific
  if (isJupyterNotebook) {
    return (
      <div
        style={{
          background: "rgba(10, 5, 22, 0.95)",
          border: "3px solid #06B6D4",
          boxShadow: "6px 6px 0px #000000",
          borderRadius: "3px",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <h3 className="font-pixel" style={{ fontSize: "0.95rem", color: "#FFFFFF", marginBottom: "12px" }}>
          🔬 JUPYTER ANALYSIS WORKBENCH
        </h3>
        <p className="font-mono text-xs" style={{ color: "#A8A0B8", marginBottom: "16px" }}>
          Launch the interactive notebook environment below.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-btn-magenta"
            id="notebook-link-btn"
            onClick={() => sound.playClick()}
            style={{ textDecoration: "none" }}
          >
            OPEN JUPYTER NOTEBOOK ▶
          </a>
          <a
            href={fullUrl}
            download
            className="pixel-btn-cyan"
            onClick={() => sound.playClick()}
            style={{ textDecoration: "none" }}
          >
            ⬇ DOWNLOAD NOTEBOOK FILE
          </a>
        </div>
      </div>
    );
  }

  // 4. General Target Resource / File Download (Default for all other contentUrls)
  if (contentUrl) {
    const icon = getCategoryIcon(challenge.type);
    const filename = contentUrl.split('/').pop() || "resource_file";

    return (
      <div
        style={{
          background: "rgba(10, 5, 22, 0.95)",
          border: "3px solid #06B6D4",
          boxShadow: "6px 6px 0px #000000",
          borderRadius: "3px",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <h3 className="font-pixel" style={{ fontSize: "0.95rem", color: "#FFFFFF", marginBottom: "12px" }}>
          {icon} STAGE TARGET RESOURCE ({challenge.type})
        </h3>
        <p className="font-mono text-xs" style={{ color: "#A8A0B8", marginBottom: "16px" }}>
          Access or download the target resource file for this stage.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <a
            href={fullUrl}
            download={filename}
            className="pixel-btn-lime"
            id="content-download-btn"
            onClick={() => sound.playClick()}
            style={{ textDecoration: "none" }}
          >
            ⬇ DOWNLOAD FILE ({filename})
          </a>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pixel-btn-cyan"
            id="content-link-btn"
            onClick={() => sound.playClick()}
            style={{ textDecoration: "none" }}
          >
            OPEN LINK IN NEW TAB ▶
          </a>
        </div>
      </div>
    );
  }

  // 5. Custom HTML content
  if (challenge.contentHtml) {
    return (
      <div
        style={{
          background: "rgba(10, 5, 22, 0.95)",
          border: "3px solid #06B6D4",
          boxShadow: "6px 6px 0px #000000",
          borderRadius: "3px",
          padding: "24px",
          marginBottom: "32px",
        }}
        dangerouslySetInnerHTML={{ __html: challenge.contentHtml }}
      />
    );
  }

  return null;
}

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [solved, setSolved] = useState(false);

  const load = () => {
    if (!id) return;
    challengeApi
      .get(id)
      .then((res) => {
        setChallenge(res.data.challenge);
        setSolved(res.data.challenge.status === "SOLVED");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSolved = () => {
    setSolved(true);
    setTimeout(() => load(), 1200);
  };

  const isLocked = challenge?.status === "LOCKED";
  const isFinalStage = challenge?.stageNumber === 8;

  return (
    <div style={{ minHeight: "100vh", position: "relative", zIndex: 1, color: "#FFFFFF" }}>
      <NavBar />
      <main
        className="container container--narrow"
        style={{ paddingTop: "40px", paddingBottom: "80px" }}
      >
        <button
          onClick={() => {
            sound.playClick();
            navigate("/challenges");
          }}
          className="pixel-btn-cyan"
          style={{ marginBottom: "32px", padding: "8px 16px", fontSize: "0.68rem" }}
          id="back-btn"
        >
          ◀ BACK TO CHALLENGES
        </button>

        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            <span className="font-mono text-muted text-sm">Loading stage details...</span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        ) : !challenge ? null : (
          <div className="animate-fadeIn">
            {/* Header Stage Card */}
            <div
              style={{
                background: solved
                  ? "rgba(10, 25, 18, 0.95)"
                  : "rgba(10, 5, 22, 0.95)",
                border: solved
                  ? "3px solid #A3E635"
                  : isLocked
                  ? "3px solid #241A35"
                  : "3px solid #06B6D4",
                boxShadow: solved
                  ? "0 0 35px rgba(163,230,53,0.3), 8px 8px 0px #000000"
                  : "8px 8px 0px #000000",
                borderRadius: "3px",
                marginBottom: "32px",
                overflow: "hidden",
              }}
            >
              {/* Retro Header Bar */}
              <div
                style={{
                  background: "#000000",
                  borderBottom: solved ? "2px solid #A3E635" : "2px solid #06B6D4",
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: solved ? "#A3E635" : "#06B6D4",
                  letterSpacing: "0.08em",
                }}
              >
                <span>CHALLENGE_STAGE_0{challenge.stageNumber}.EXE</span>
                <span>[{solved ? "SOLVED" : isLocked ? "LOCKED" : "UNLOCKED"}]</span>
              </div>

              <div style={{ padding: "28px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "24px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      className="font-mono text-xs"
                      style={{
                        color: "#06B6D4",
                        marginBottom: "8px",
                        fontWeight: 800,
                      }}
                    >
                      STAGE {challenge.stageNumber} OF 8
                    </div>
                    <h1
                      className="font-display"
                      style={{
                        fontSize: "1.8rem",
                        fontWeight: 900,
                        color: "#FFFFFF",
                        marginBottom: "12px",
                      }}
                    >
                      <span style={{ marginRight: "12px" }}>
                        {TYPE_ICONS[challenge.type]}
                      </span>
                      {challenge.title}
                    </h1>
                    <p style={{ color: "#A8A0B8", lineHeight: 1.7, fontSize: "1rem" }}>
                      {challenge.description}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: "2.4rem",
                        fontWeight: 900,
                        color: "#A3E635",
                        lineHeight: 1,
                      }}
                    >
                      {challenge.points}
                    </div>
                    <div
                      className="font-mono text-xs"
                      style={{
                        color: "#A8A0B8",
                        fontWeight: 800,
                        marginTop: 4,
                      }}
                    >
                      BOUNTY PTS
                    </div>
                  </div>
                </div>

                {/* Hint */}
                {challenge.hintText && !isLocked && (
                  <div
                    className="alert alert-info"
                    style={{ marginTop: "24px", border: "2px solid #06B6D4" }}
                  >
                    <span>💡</span>
                    <span className="font-mono text-xs">{challenge.hintText}</span>
                  </div>
                )}

                {/* Solved Banner */}
                {solved && (
                  <div
                    className="alert alert-success animate-fadeIn"
                    style={{ marginTop: "24px", border: "2px solid #A3E635" }}
                  >
                    <span>🏆</span>
                    <span className="font-mono">
                      Stage solved! +{challenge.points} points awarded.{" "}
                      {challenge.stageNumber < 8
                        ? "Next stage is now unlocked."
                        : "You completed the entire challenge chain! 🎉"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Content (audio/image/link) */}
            {!isLocked && <ChallengeContent challenge={challenge} />}

            {/* Flag submission box */}
            {!isLocked && !solved && (
              <FlagSubmitter
                challengeId={challenge.id}
                points={challenge.points}
                onSolved={handleSolved}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
