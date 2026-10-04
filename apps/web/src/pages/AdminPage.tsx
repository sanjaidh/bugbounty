import React, { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import AnimatedCounter from "../components/AnimatedCounter";
import { adminApi } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { sound } from "../lib/sound";

interface Stats {
  totalParticipants: number;
  totalTeams: number;
  totalSubmissions: number;
  correctSubmissions: number;
  accuracy: string;
}

interface Team {
  id: string;
  name: string;
  inviteCode: string;
  _count?: { users: number };
}

interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  team?: { name: string } | null;
  createdAt: string;
}

interface ChallengeAdmin {
  id: string;
  stageNumber: number;
  title: string;
  type: string;
  description: string;
  hintText: string | null;
  contentUrl: string | null;
  contentHtml: string | null;
  points: number;
  isActive: boolean;
  maxAttempts: number;
  cooldownMins: number;
  answerConfigured?: boolean;
  _count?: { submissions: number };
}

interface SubmissionItem {
  id: string;
  participant: string;
  team: string | null;
  stage: number;
  challengeTitle: string;
  submittedFlag: string;
  isCorrect: boolean;
  ipAddress: string | null;
  createdAt: string;
}

interface CompetitionConfig {
  forceState: "AUTO" | "ACTIVE" | "PAUSED" | "STOPPED";
  startTime: string;
  endTime: string;
}

export default function AdminPage() {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<"challenges" | "competition" | "overview" | "teams" | "users" | "logs">("challenges");
  const [stats, setStats] = useState<Stats | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [challenges, setChallenges] = useState<ChallengeAdmin[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Competition Control State
  const [compConfig, setCompConfig] = useState<CompetitionConfig>({
    forceState: "AUTO",
    startTime: "2026-10-08T04:30:00.000Z",
    endTime: "2026-10-08T18:30:00.000Z",
  });
  const [isCompActive, setIsCompActive] = useState<boolean>(true);
  const [savingComp, setSavingComp] = useState(false);

  // Forms
  const [newTeamName, setNewTeamName] = useState("");
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", teamId: "" });

  // Add Challenge State
  const [createChallengeModalOpen, setCreateChallengeModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    stageNumber: "",
    title: "",
    type: "WEB",
    points: 100,
    description: "",
    hintText: "",
    contentUrl: "",
    plainAnswer: "",
    maxAttempts: 5,
    cooldownMins: 5,
  });

  // Edit Challenge State
  const [editingChallenge, setEditingChallenge] = useState<ChallengeAdmin | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    type: "WEB",
    description: "",
    hintText: "",
    contentUrl: "",
    points: 100,
    isActive: true,
    maxAttempts: 5,
    cooldownMins: 5,
    plainAnswer: "",
  });
  const [savingChallenge, setSavingChallenge] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, teamsRes, usersRes, challengesRes, subRes, compRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getTeams(),
        adminApi.getUsers(),
        adminApi.getChallenges(),
        adminApi.getSubmissions(),
        adminApi.getCompetition(),
      ]);

      setStats(statsRes.data);
      setTeams(teamsRes.data.teams || []);
      setUsers(usersRes.data.users || []);
      setChallenges(challengesRes.data.challenges || []);
      setSubmissions(subRes.data.submissions || []);
      setCompConfig(compRes.data.config || compConfig);
      setIsCompActive(compRes.data.isCurrentlyActive);
    } catch (err: any) {
      const errorText = err.message || "Failed to load admin data";
      setMsg({ text: errorText, type: "error" });
      showError(errorText);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (tab: typeof activeTab) => {
    sound.playClick();
    setActiveTab(tab);
  };

  // Competition Controls
  const handleUpdateCompState = async (forceState: CompetitionConfig["forceState"]) => {
    sound.playClick();
    setSavingComp(true);
    try {
      const res = await adminApi.updateCompetition({ forceState });
      setCompConfig(res.data.config);
      setIsCompActive(res.data.isCurrentlyActive);
      sound.playSuccess();
      showSuccess(`Competition state set to ${forceState}!`, "COMPETITION UPDATED");
      setMsg({ text: `Competition state changed to ${forceState}.`, type: "success" });
    } catch (err: any) {
      sound.playError();
      showError(err.message, "Update Failed");
    } finally {
      setSavingComp(false);
    }
  };

  const handleSaveCompTimes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingComp(true);
    try {
      const res = await adminApi.updateCompetition({
        startTime: compConfig.startTime,
        endTime: compConfig.endTime,
      });
      setCompConfig(res.data.config);
      setIsCompActive(res.data.isCurrentlyActive);
      sound.playSuccess();
      showSuccess("Competition timer schedule saved!", "TIMERS UPDATED");
      setMsg({ text: "Competition countdown start/end timers updated.", type: "success" });
    } catch (err: any) {
      sound.playError();
      showError(err.message, "Failed to save timers");
    } finally {
      setSavingComp(false);
    }
  };

  // Create Challenge Stage
  const handleCreateChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    setSavingChallenge(true);

    try {
      const payload: Record<string, any> = {
        title: createForm.title.trim(),
        type: createForm.type,
        description: createForm.description.trim(),
        hintText: createForm.hintText.trim() || undefined,
        contentUrl: createForm.contentUrl.trim() || undefined,
        points: Number(createForm.points),
        maxAttempts: Number(createForm.maxAttempts),
        cooldownMins: Number(createForm.cooldownMins),
      };

      if (createForm.stageNumber.trim()) {
        payload.stageNumber = Number(createForm.stageNumber);
      }

      if (createForm.plainAnswer.trim()) {
        payload.plainAnswer = createForm.plainAnswer.trim();
      }

      await adminApi.createChallenge(payload);
      sound.playSuccess();
      showSuccess(`New challenge "${createForm.title}" created!`, "STAGE CREATED");
      setMsg({ text: `New challenge stage "${createForm.title}" created successfully!`, type: "success" });
      setCreateChallengeModalOpen(false);
      setCreateForm({
        stageNumber: "",
        title: "",
        type: "WEB",
        points: 100,
        description: "",
        hintText: "",
        contentUrl: "",
        plainAnswer: "",
        maxAttempts: 5,
        cooldownMins: 5,
      });
      fetchData();
    } catch (err: any) {
      sound.playError();
      showError(err.message, "Creation Failed");
    } finally {
      setSavingChallenge(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await adminApi.createTeam(newTeamName.trim());
      sound.playSuccess();
      showSuccess(`Team "${newTeamName}" created successfully!`, "TEAM CREATED");
      setMsg({ text: `Team "${newTeamName}" created successfully!`, type: "success" });
      setNewTeamName("");
      fetchData();
    } catch (err: any) {
      sound.playError();
      showError(err.message, "Creation Failed");
      setMsg({ text: err.message, type: "error" });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        teamId: newUser.teamId || undefined,
      });
      sound.playSuccess();
      showSuccess(`User "${newUser.username}" created successfully!`, "USER CREATED");
      setMsg({ text: `User "${newUser.username}" created successfully!`, type: "success" });
      setNewUser({ username: "", email: "", password: "", teamId: "" });
      fetchData();
    } catch (err: any) {
      sound.playError();
      showError(err.message, "User Creation Failed");
      setMsg({ text: err.message, type: "error" });
    }
  };

  const handleResetUser = async (userId: string, username: string) => {
    if (!window.confirm(`Reset progress for user "${username}"? This cannot be undone.`)) return;
    try {
      await adminApi.resetUser(userId);
      sound.playNotification();
      showSuccess(`Progress for ${username} reset.`, "USER RESET");
      setMsg({ text: `Progress for ${username} reset.`, type: "success" });
      fetchData();
    } catch (err: any) {
      sound.playError();
      showError(err.message, "Reset Failed");
      setMsg({ text: err.message, type: "error" });
    }
  };

  // Open Edit Modal for a Challenge
  const handleStartEditChallenge = (challenge: ChallengeAdmin) => {
    sound.playClick();
    setEditingChallenge(challenge);
    setEditForm({
      title: challenge.title || "",
      type: challenge.type || "WEB",
      description: challenge.description || "",
      hintText: challenge.hintText || "",
      contentUrl: challenge.contentUrl || "",
      points: challenge.points || 100,
      isActive: challenge.isActive ?? true,
      maxAttempts: challenge.maxAttempts || 5,
      cooldownMins: challenge.cooldownMins || 5,
      plainAnswer: "",
    });
  };

  // Submit Challenge Updates
  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;
    setSavingChallenge(true);

    try {
      const payload: Record<string, any> = {
        title: editForm.title,
        type: editForm.type,
        description: editForm.description,
        hintText: editForm.hintText,
        contentUrl: editForm.contentUrl,
        points: Number(editForm.points),
        isActive: editForm.isActive,
        maxAttempts: Number(editForm.maxAttempts),
        cooldownMins: Number(editForm.cooldownMins),
      };

      if (editForm.plainAnswer.trim()) {
        payload.plainAnswer = editForm.plainAnswer.trim();
      }

      await adminApi.updateChallenge(editingChallenge.id, payload);
      sound.playSuccess();
      showSuccess(`Stage ${editingChallenge.stageNumber} updated!`, "CHALLENGE SAVED");
      setMsg({ text: `Stage ${editingChallenge.stageNumber} ("${editForm.title}") updated successfully!`, type: "success" });
      setEditingChallenge(null);
      fetchData();
    } catch (err: any) {
      sound.playError();
      showError(err.message, "Save Failed");
      setMsg({ text: err.message, type: "error" });
    } finally {
      setSavingChallenge(false);
    }
  };

  // Reorder Challenges (Move Up / Down)
  const handleMoveChallenge = async (index: number, direction: "up" | "down") => {
    sound.playClick();
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= challenges.length) return;

    const newChallenges = [...challenges];
    const temp = newChallenges[index];
    newChallenges[index] = newChallenges[targetIndex];
    newChallenges[targetIndex] = temp;

    setChallenges(newChallenges);

    const orderedIds = newChallenges.map((c) => c.id);
    try {
      await adminApi.reorderChallenges(orderedIds);
      sound.playSuccess();
      showSuccess("Stage sequence updated!", "REORDER SUCCESS");
      fetchData();
    } catch (err: any) {
      sound.playError();
      showError(err.message, "Reorder Failed");
      fetchData();
    }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", zIndex: 1, color: "#FFFFFF" }}>
      <NavBar />

      <main className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
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
              ADMIN CONTROL CENTER // ARENA ENGINE
            </span>
          </div>

          <h1 className="font-pixel" style={{ margin: 0, fontSize: "2.2rem", color: "#FFFFFF", textShadow: "0 0 20px #A855F7, 3px 3px 0px #000" }}>
            Admin <span style={{ color: "#A855F7" }}>Control</span> Center
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: "1rem", color: "#A8A0B8" }}>
            Bug Bountyy '26 • Challenge Editor, Competition Start/Stop, Countdown Timers & Audit Telemetry
          </p>
        </div>

        <div className="glitch-divider" style={{ marginBottom: "32px" }} />

        {msg && (
          <div
            className={`alert ${msg.type === "success" ? "alert-success" : "alert-error"} animate-fadeIn`}
            style={{ marginBottom: "24px", border: msg.type === "success" ? "2px solid #A3E635" : "2px solid #FB7185" }}
          >
            <span>{msg.type === "success" ? "✅" : "⚠️"}</span>
            <span className="font-mono">{msg.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "32px",
            flexWrap: "wrap",
          }}
        >
          {[
            { id: "challenges", label: "🎯 CHALLENGE EDITOR" },
            { id: "competition", label: "⏱️ COMPETITION CONTROLS" },
            { id: "overview", label: "📊 OVERVIEW" },
            { id: "teams", label: "👥 TEAMS" },
            { id: "users", label: "👤 PARTICIPANTS" },
            { id: "logs", label: "📜 AUDIT LOGS" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className="font-mono"
              style={{
                background: activeTab === tab.id ? "#06B6D4" : "#000000",
                border: activeTab === tab.id ? "2px solid #FFFFFF" : "2px solid #06B6D4",
                color: activeTab === tab.id ? "#000000" : "#06B6D4",
                fontWeight: 900,
                fontSize: "0.8rem",
                padding: "10px 18px",
                cursor: "pointer",
                boxShadow: activeTab === tab.id ? "4px 4px 0px #A855F7" : "4px 4px 0px #000000",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-center" style={{ minHeight: "300px" }}>
            <div className="spinner" />
            <span className="font-mono text-muted text-sm">Loading admin telemetry...</span>
          </div>
        ) : (
          <>
            {/* ── CHALLENGES TAB (ADD & EDIT CHALLENGES) ── */}
            {activeTab === "challenges" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                  <div>
                    <h3 className="font-pixel" style={{ fontSize: "1.1rem", margin: 0, color: "#FFFFFF" }}>
                      CHALLENGE STAGES ({challenges.length} STAGES)
                    </h3>
                    <span className="font-mono text-xs" style={{ color: "#A855F7", fontWeight: 800 }}>
                      Create new stages or edit existing challenge parameters and flags.
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setCreateChallengeModalOpen(true);
                    }}
                    className="pixel-btn-magenta"
                    style={{ padding: "12px 20px" }}
                  >
                    ➕ ADD NEW STAGE
                  </button>
                </div>

                {/* Challenge Cards Grid */}
                <div style={{ display: "grid", gap: "20px" }}>
                  {challenges.map((c, index) => (
                    <div
                      key={c.id}
                      style={{
                        background: "rgba(10, 5, 22, 0.95)",
                        border: "3px solid #06B6D4",
                        boxShadow: "6px 6px 0px #000000",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      {/* Card Header */}
                      <div
                        style={{
                          background: "#000000",
                          borderBottom: "2px solid #06B6D4",
                          padding: "8px 16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          color: "#06B6D4",
                        }}
                      >
                        <span>STAGE_0{c.stageNumber}.EXE • {c.type}</span>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span style={{ color: c.isActive ? "#A3E635" : "#FB7185" }}>
                            [{c.isActive ? "ACTIVE" : "INACTIVE"}]
                          </span>
                          <span style={{ color: c.answerConfigured ? "#A3E635" : "#F59E0B" }}>
                            [{c.answerConfigured ? "FLAG SET" : "NO FLAG"}]
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <h4 className="font-display" style={{ margin: "0 0 6px 0", fontSize: "1.2rem", color: "#FFFFFF" }}>
                            {c.title}
                          </h4>
                          <p className="font-mono text-xs" style={{ color: "#A8A0B8", margin: 0 }}>
                            {c.description ? (c.description.length > 120 ? c.description.substring(0, 120) + "..." : c.description) : "No description."}
                          </p>
                          {c.hintText && (
                            <div className="font-mono text-xs" style={{ color: "#06B6D4", marginTop: "6px" }}>
                              💡 Hint: {c.hintText}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <div style={{ textAlign: "right" }}>
                            <div className="font-mono" style={{ fontWeight: 900, color: "#A3E635", fontSize: "1.2rem" }}>
                              +{c.points} PTS
                            </div>
                            <div className="font-mono text-xs" style={{ color: "#A8A0B8" }}>
                              {c.maxAttempts} max attempts
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <button
                                disabled={index === 0}
                                onClick={() => handleMoveChallenge(index, "up")}
                                className="pixel-btn-cyan"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "0.6rem",
                                  opacity: index === 0 ? 0.35 : 1,
                                  cursor: index === 0 ? "not-allowed" : "pointer",
                                }}
                                title="Move Stage Up"
                              >
                                ▲ UP
                              </button>
                              <button
                                disabled={index === challenges.length - 1}
                                onClick={() => handleMoveChallenge(index, "down")}
                                className="pixel-btn-cyan"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "0.6rem",
                                  opacity: index === challenges.length - 1 ? 0.35 : 1,
                                  cursor: index === challenges.length - 1 ? "not-allowed" : "pointer",
                                }}
                                title="Move Stage Down"
                              >
                                ▼ DOWN
                              </button>
                            </div>

                            <button
                              onClick={() => handleStartEditChallenge(c)}
                              className="pixel-btn-magenta"
                              style={{ padding: "10px 18px", fontSize: "0.68rem" }}
                            >
                              ✏️ EDIT STAGE
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── COMPETITION CONTROL & COUNTDOWN TIMERS TAB ── */}
            {activeTab === "competition" && (
              <div style={{ display: "grid", gap: "28px" }}>
                {/* Status Indicator & Live Switch Box */}
                <div
                  style={{
                    background: "rgba(10, 5, 22, 0.95)",
                    border: isCompActive ? "3px solid #A3E635" : "3px solid #FB7185",
                    boxShadow: isCompActive ? "0 0 30px rgba(163,230,53,0.3), 8px 8px 0px #000000" : "0 0 30px rgba(251,113,133,0.3), 8px 8px 0px #000000",
                    borderRadius: "3px",
                    padding: "28px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                    <div>
                      <span className="font-mono text-xs" style={{ color: "#A8A0B8", fontWeight: 800 }}>
                        ARENA RUNTIME OVERRIDE
                      </span>
                      <h3 className="font-pixel" style={{ fontSize: "1.4rem", margin: "4px 0", color: "#FFFFFF" }}>
                        LIVE COMPETITION CONTROL
                      </h3>
                    </div>

                    <div
                      style={{
                        padding: "8px 20px",
                        background: "#000000",
                        border: isCompActive ? "2px solid #A3E635" : "2px solid #FB7185",
                        color: isCompActive ? "#A3E635" : "#FB7185",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 900,
                        fontSize: "0.95rem",
                      }}
                    >
                      STATE: {compConfig.forceState} ({isCompActive ? "● ACTIVE FOR PLAY" : "⏸ INACTIVE / PAUSED"})
                    </div>
                  </div>

                  <p className="font-mono text-xs" style={{ color: "#A8A0B8", marginBottom: "24px" }}>
                    Instantly force-start, pause, or stop flag submissions for all participants across the entire platform.
                  </p>

                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <button
                      disabled={savingComp || compConfig.forceState === "ACTIVE"}
                      onClick={() => handleUpdateCompState("ACTIVE")}
                      className="pixel-btn-lime"
                      style={{ padding: "14px 24px" }}
                    >
                      ▶ START COMPETITION
                    </button>

                    <button
                      disabled={savingComp || compConfig.forceState === "PAUSED"}
                      onClick={() => handleUpdateCompState("PAUSED")}
                      className="pixel-btn-cyan"
                      style={{ padding: "14px 24px" }}
                    >
                      ⏸ PAUSE COMPETITION
                    </button>

                    <button
                      disabled={savingComp || compConfig.forceState === "STOPPED"}
                      onClick={() => handleUpdateCompState("STOPPED")}
                      className="pixel-btn-magenta"
                      style={{ padding: "14px 24px" }}
                    >
                      ⏹ STOP COMPETITION
                    </button>

                    <button
                      disabled={savingComp || compConfig.forceState === "AUTO"}
                      onClick={() => handleUpdateCompState("AUTO")}
                      style={{
                        background: "#000",
                        color: "#06B6D4",
                        border: "2px solid #06B6D4",
                        padding: "14px 24px",
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      🔄 AUTO (SCHEDULED TIMER)
                    </button>
                  </div>
                </div>

                {/* Countdown Timers Config Box */}
                <div
                  style={{
                    background: "rgba(10, 5, 22, 0.95)",
                    border: "3px solid #06B6D4",
                    boxShadow: "8px 8px 0px #000000",
                    borderRadius: "3px",
                    padding: "28px",
                  }}
                >
                  <h3 className="font-pixel" style={{ fontSize: "1.1rem", margin: "0 0 16px 0", color: "#FFFFFF" }}>
                    ⏱️ COUNTDOWN & EVENT TIMERS CONFIGURATION
                  </h3>
                  <p className="font-mono text-xs" style={{ color: "#A8A0B8", marginBottom: "24px" }}>
                    Set the official competition start and end dates/times for the venue countdown timer display.
                  </p>

                  <form onSubmit={handleSaveCompTimes} style={{ display: "grid", gap: "20px" }}>
                    <div className="grid grid-2" style={{ gap: "20px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>
                          Competition Start ISO Timestamp
                        </label>
                        <input
                          type="text"
                          className="form-input form-input--mono"
                          value={compConfig.startTime}
                          onChange={(e) => setCompConfig({ ...compConfig, startTime: e.target.value })}
                          placeholder="2026-10-08T04:30:00.000Z"
                          required
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>
                          Competition End ISO Timestamp
                        </label>
                        <input
                          type="text"
                          className="form-input form-input--mono"
                          value={compConfig.endTime}
                          onChange={(e) => setCompConfig({ ...compConfig, endTime: e.target.value })}
                          placeholder="2026-10-08T18:30:00.000Z"
                          required
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="submit"
                        disabled={savingComp}
                        className="pixel-btn-cyan"
                        style={{ padding: "12px 24px" }}
                      >
                        💾 SAVE COUNTDOWN TIMERS
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── CREATE CHALLENGE MODAL ── */}
            {createChallengeModalOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  background: "rgba(0, 0, 0, 0.85)",
                  backdropFilter: "blur(8px)",
                  zIndex: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                }}
              >
                <div
                  className="animate-slideUp"
                  style={{
                    background: "rgba(10, 5, 22, 0.98)",
                    border: "3px solid #06B6D4",
                    boxShadow: "0 0 40px rgba(6, 182, 212, 0.5), 10px 10px 0px #000000",
                    borderRadius: "3px",
                    maxWidth: "700px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      background: "#000000",
                      borderBottom: "2px solid #06B6D4",
                      padding: "12px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span className="font-pixel" style={{ fontSize: "0.85rem", color: "#06B6D4" }}>
                      ➕ CREATE NEW STAGE
                    </span>
                    <button
                      onClick={() => setCreateChallengeModalOpen(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#FB7185",
                        fontSize: "1.2rem",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateChallengeSubmit} style={{ padding: "24px", display: "grid", gap: "16px" }}>
                    <div className="grid grid-2" style={{ gap: "16px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>Stage Number (Optional)</label>
                        <input
                          type="number"
                          className="form-input form-input--mono"
                          placeholder="Auto-calculated if blank"
                          value={createForm.stageNumber}
                          onChange={(e) => setCreateForm({ ...createForm, stageNumber: e.target.value })}
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>Track Category / Type</label>
                        <input
                          type="text"
                          list="category-suggestions"
                          className="form-input form-input--mono"
                          placeholder="e.g. SSTV, OSINT, FORENSICS, WEB"
                          value={createForm.type}
                          onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                          required
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-2" style={{ gap: "16px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>Title</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Web Vulnerability Inspection"
                          value={createForm.title}
                          onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                          required
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>Bounty Points</label>
                        <input
                          type="number"
                          className="form-input form-input--mono"
                          value={createForm.points}
                          onChange={(e) => setCreateForm({ ...createForm, points: Number(e.target.value) })}
                          required
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: "#06B6D4" }}>Description</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Detailed instructions for participants..."
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        required
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: "#06B6D4" }}>Hint Text (Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Inspect the HTTP response headers."
                        value={createForm.hintText}
                        onChange={(e) => setCreateForm({ ...createForm, hintText: e.target.value })}
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: "#06B6D4" }}>Resource Content URL (Optional)</label>
                      <input
                        type="text"
                        className="form-input form-input--mono"
                        placeholder="/files/audio.wav or image.png"
                        value={createForm.contentUrl}
                        onChange={(e) => setCreateForm({ ...createForm, contentUrl: e.target.value })}
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      />
                    </div>

                    <div className="form-group" style={{ background: "rgba(168, 85, 247, 0.1)", border: "2px solid #A855F7", padding: "14px", borderRadius: "2px" }}>
                      <label className="form-label" style={{ color: "#A855F7" }}>🔑 Plaintext Flag Answer</label>
                      <input
                        type="text"
                        className="form-input form-input--mono"
                        placeholder="e.g. CC{my_new_stage_flag}"
                        value={createForm.plainAnswer}
                        onChange={(e) => setCreateForm({ ...createForm, plainAnswer: e.target.value })}
                        style={{ background: "#05020A", border: "2px solid #A855F7", color: "#FFF" }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                      <button
                        type="button"
                        onClick={() => setCreateChallengeModalOpen(false)}
                        className="pixel-btn-cyan"
                        style={{ padding: "12px 20px" }}
                      >
                        CANCEL
                      </button>
                      <button
                        type="submit"
                        disabled={savingChallenge}
                        className="pixel-btn-magenta"
                        style={{ padding: "12px 24px" }}
                      >
                        {savingChallenge ? "CREATING..." : "➕ CREATE STAGE"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── EDIT CHALLENGE MODAL ── */}
            {editingChallenge && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  background: "rgba(0, 0, 0, 0.85)",
                  backdropFilter: "blur(8px)",
                  zIndex: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                }}
              >
                <div
                  className="animate-slideUp"
                  style={{
                    background: "rgba(10, 5, 22, 0.98)",
                    border: "3px solid #A855F7",
                    boxShadow: "0 0 40px rgba(168, 85, 247, 0.5), 10px 10px 0px #000000",
                    borderRadius: "3px",
                    maxWidth: "700px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      background: "#000000",
                      borderBottom: "2px solid #A855F7",
                      padding: "12px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span className="font-pixel" style={{ fontSize: "0.85rem", color: "#A855F7" }}>
                      ✏️ EDIT STAGE {editingChallenge.stageNumber} ({editingChallenge.type})
                    </span>
                    <button
                      onClick={() => setEditingChallenge(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#FB7185",
                        fontSize: "1.2rem",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveChallenge} style={{ padding: "24px", display: "grid", gap: "16px" }}>
                    <div className="grid grid-2" style={{ gap: "16px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>
                          Stage Title
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          required
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>
                          Track Category / Type
                        </label>
                        <input
                          type="text"
                          list="category-suggestions"
                          className="form-input form-input--mono"
                          placeholder="e.g. SSTV, OSINT, FORENSICS, WEB"
                          value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                          required
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-2" style={{ gap: "16px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>
                          Bounty Points
                        </label>
                        <input
                          type="number"
                          className="form-input form-input--mono"
                          value={editForm.points}
                          onChange={(e) => setEditForm({ ...editForm, points: Number(e.target.value) })}
                          required
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ color: "#06B6D4" }}>
                          Active Status
                        </label>
                        <select
                          className="form-input form-input--mono"
                          value={editForm.isActive ? "true" : "false"}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "true" })}
                          style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                        >
                          <option value="true">Active (Unlocked for play)</option>
                          <option value="false">Inactive (Disabled)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: "#06B6D4" }}>
                        Challenge Description
                      </label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        required
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF", resize: "vertical" }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: "#06B6D4" }}>
                        Hint Text (Optional)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.hintText}
                        onChange={(e) => setEditForm({ ...editForm, hintText: e.target.value })}
                        placeholder="e.g. Try analyzing the audio spectral display in QSSTV."
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ color: "#06B6D4" }}>
                        Resource Content URL (Audio / Image / Link)
                      </label>
                      <input
                        type="text"
                        className="form-input form-input--mono"
                        value={editForm.contentUrl}
                        onChange={(e) => setEditForm({ ...editForm, contentUrl: e.target.value })}
                        placeholder="e.g. /files/stage1.wav or https://jupyter.org"
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      />
                    </div>

                    <div className="form-group" style={{ background: "rgba(168, 85, 247, 0.1)", border: "2px solid #A855F7", padding: "14px", borderRadius: "2px" }}>
                      <label className="form-label" style={{ color: "#A855F7" }}>
                        🔑 Update Flag Answer (Plaintext)
                      </label>
                      <input
                        type="text"
                        className="form-input form-input--mono"
                        value={editForm.plainAnswer}
                        onChange={(e) => setEditForm({ ...editForm, plainAnswer: e.target.value })}
                        placeholder="Enter new plaintext flag (e.g. CC{sstv_signal_found}). Leave empty to keep current."
                        style={{ background: "#05020A", border: "2px solid #A855F7", color: "#FFF" }}
                      />
                    </div>



                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
                      <button
                        type="button"
                        onClick={() => setEditingChallenge(null)}
                        className="pixel-btn-cyan"
                        style={{ padding: "12px 20px" }}
                      >
                        CANCEL
                      </button>
                      <button
                        type="submit"
                        disabled={savingChallenge}
                        className="pixel-btn-magenta"
                        style={{ padding: "12px 24px" }}
                      >
                        {savingChallenge ? "SAVING..." : "💾 SAVE STAGE CONFIG"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── OVERVIEW TAB ── */}
            {activeTab === "overview" && stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
                <div style={{ background: "rgba(10, 5, 22, 0.95)", border: "3px solid #06B6D4", boxShadow: "6px 6px 0px #000", padding: "24px", borderRadius: "3px" }}>
                  <div className="font-mono text-xs" style={{ color: "#A8A0B8" }}>PARTICIPANTS</div>
                  <div className="font-mono" style={{ fontSize: "2rem", fontWeight: 900, color: "#06B6D4" }}>
                    <AnimatedCounter value={stats.totalParticipants} />
                  </div>
                </div>

                <div style={{ background: "rgba(10, 5, 22, 0.95)", border: "3px solid #A855F7", boxShadow: "6px 6px 0px #000", padding: "24px", borderRadius: "3px" }}>
                  <div className="font-mono text-xs" style={{ color: "#A8A0B8" }}>REGISTERED TEAMS</div>
                  <div className="font-mono" style={{ fontSize: "2rem", fontWeight: 900, color: "#A855F7" }}>
                    <AnimatedCounter value={stats.totalTeams} />
                  </div>
                </div>

                <div style={{ background: "rgba(10, 5, 22, 0.95)", border: "3px solid #A3E635", boxShadow: "6px 6px 0px #000", padding: "24px", borderRadius: "3px" }}>
                  <div className="font-mono text-xs" style={{ color: "#A8A0B8" }}>FLAG SUBMISSIONS</div>
                  <div className="font-mono" style={{ fontSize: "2rem", fontWeight: 900, color: "#A3E635" }}>
                    <AnimatedCounter value={stats.totalSubmissions} />
                  </div>
                </div>

                <div style={{ background: "rgba(10, 5, 22, 0.95)", border: "3px solid #FFE600", boxShadow: "6px 6px 0px #000", padding: "24px", borderRadius: "3px" }}>
                  <div className="font-mono text-xs" style={{ color: "#A8A0B8" }}>ACCURACY RATE</div>
                  <div className="font-mono" style={{ fontSize: "2rem", fontWeight: 900, color: "#FFE600" }}>
                    {stats.accuracy}
                  </div>
                </div>
              </div>
            )}

            {/* ── TEAMS TAB ── */}
            {activeTab === "teams" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "28px" }}>
                <div style={{ background: "rgba(10, 5, 22, 0.95)", border: "3px solid #06B6D4", boxShadow: "6px 6px 0px #000", padding: "24px", borderRadius: "3px" }}>
                  <h3 className="font-pixel" style={{ margin: "0 0 16px 0", fontSize: "0.95rem", color: "#FFFFFF" }}>➕ CREATE TEAM</h3>
                  <form onSubmit={handleCreateTeam}>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label" style={{ color: "#06B6D4" }}>Team Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. CyberSec Elite"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        required
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      />
                    </div>
                    <button type="submit" className="pixel-btn-cyan" style={{ width: "100%" }}>
                      CREATE TEAM ▶
                    </button>
                  </form>
                </div>

                <div style={{ background: "rgba(10, 5, 22, 0.95)", border: "3px solid #06B6D4", boxShadow: "6px 6px 0px #000", padding: "24px", borderRadius: "3px" }}>
                  <h3 className="font-pixel" style={{ margin: "0 0 16px 0", fontSize: "0.95rem", color: "#FFFFFF" }}>
                    TEAMS ({teams.length})
                  </h3>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr style={{ background: "#000", color: "#06B6D4", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                          <th>Team Name</th>
                          <th>Invite Code</th>
                          <th>Members</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((t) => (
                          <tr key={t.id} style={{ borderBottom: "1px solid #241A35" }}>
                            <td style={{ fontWeight: 800, color: "#FFF" }}>{t.name}</td>
                            <td className="font-mono" style={{ color: "#A855F7", fontWeight: 800 }}>{t.inviteCode}</td>
                            <td className="font-mono">{t._count?.users || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS TAB ── */}
            {activeTab === "users" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "28px" }}>
                <div style={{ background: "rgba(10, 5, 22, 0.95)", border: "3px solid #06B6D4", boxShadow: "6px 6px 0px #000", padding: "24px", borderRadius: "3px" }}>
                  <h3 className="font-pixel" style={{ margin: "0 0 16px 0", fontSize: "0.95rem", color: "#FFFFFF" }}>➕ ADD PARTICIPANT</h3>
                  <form onSubmit={handleCreateUser}>
                    <div className="form-group" style={{ marginBottom: "12px" }}>
                      <label className="form-label" style={{ color: "#06B6D4" }}>Username</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="john_doe"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        required
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "12px" }}>
                      <label className="form-label" style={{ color: "#06B6D4" }}>Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="john@example.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "12px" }}>
                      <label className="form-label" style={{ color: "#06B6D4" }}>Password</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="••••••••"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        required
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label" style={{ color: "#06B6D4" }}>Assign Team</label>
                      <select
                        className="form-input"
                        value={newUser.teamId}
                        onChange={(e) => setNewUser({ ...newUser, teamId: e.target.value })}
                        style={{ background: "#05020A", border: "2px solid #06B6D4", color: "#FFF" }}
                      >
                        <option value="">No Team (Solo)</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" className="pixel-btn-magenta" style={{ width: "100%" }}>
                      CREATE PARTICIPANT ▶
                    </button>
                  </form>
                </div>

                <div style={{ background: "rgba(10, 5, 22, 0.95)", border: "3px solid #06B6D4", boxShadow: "6px 6px 0px #000", padding: "24px", borderRadius: "3px" }}>
                  <h3 className="font-pixel" style={{ margin: "0 0 16px 0", fontSize: "0.95rem", color: "#FFFFFF" }}>
                    PARTICIPANTS ({users.length})
                  </h3>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr style={{ background: "#000", color: "#06B6D4", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                          <th>Username</th>
                          <th>Role</th>
                          <th>Team</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} style={{ borderBottom: "1px solid #241A35" }}>
                            <td style={{ fontWeight: 800, color: "#FFF" }}>{u.username}</td>
                            <td>
                              <span className={`badge ${u.role === "ADMIN" ? "badge-purple" : "badge-cyan"}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="font-mono text-xs" style={{ color: "#A8A0B8" }}>{u.team?.name || "Solo"}</td>
                            <td style={{ textAlign: "right" }}>
                              {u.role !== "ADMIN" && (
                                <button
                                  onClick={() => handleResetUser(u.id, u.username)}
                                  className="btn btn-danger btn-sm"
                                  style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem" }}
                                >
                                  Reset Progress
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── AUDIT LOGS TAB ── */}
            {activeTab === "logs" && (
              <div style={{ background: "rgba(10, 5, 22, 0.95)", border: "3px solid #06B6D4", boxShadow: "6px 6px 0px #000", padding: "24px", borderRadius: "3px" }}>
                <h3 className="font-pixel" style={{ margin: "0 0 16px 0", fontSize: "0.95rem", color: "#FFFFFF" }}>
                  📜 FLAG SUBMISSION AUDIT LOG ({submissions.length})
                </h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr style={{ background: "#000", color: "#06B6D4", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                        <th>Time</th>
                        <th>User</th>
                        <th>Stage</th>
                        <th>Submitted Answer</th>
                        <th>Result</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s) => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #241A35" }}>
                          <td className="font-mono text-xs" style={{ color: "#A8A0B8" }}>
                            {new Date(s.createdAt).toLocaleTimeString()}
                          </td>
                          <td style={{ fontWeight: 800, color: "#FFF" }}>
                            {s.participant} {s.team ? `(${s.team})` : ""}
                          </td>
                          <td className="font-mono">Stage {s.stage}</td>
                          <td className="font-mono" style={{ color: "#A855F7", fontWeight: 800 }}>
                            {s.submittedFlag}
                          </td>
                          <td>
                            <span className={`badge ${s.isCorrect ? "badge-green" : "badge-red"}`}>
                              {s.isCorrect ? "SOLVED" : "WRONG"}
                            </span>
                          </td>
                          <td className="font-mono text-xs" style={{ color: "#A8A0B8" }}>{s.ipAddress || "local"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
