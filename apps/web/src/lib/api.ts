import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor — attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cc_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error || err.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "PARTICIPANT";
  team: { id: string; name: string } | null;
}

export interface Challenge {
  id: string;
  stageNumber: number;
  title: string;
  type: string;
  description: string;
  hintText: string | null;
  contentUrl: string | null;
  contentHtml: string | null;
  points: number;
  maxAttempts: number;
  cooldownMins: number;
  status: "LOCKED" | "UNLOCKED" | "SOLVED";
  attempts: number;
  solvedAt: string | null;
  lockedUntil: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  type: "team" | "solo";
  members: string[];
  totalPoints: number;
  solvedCount: number;
  highestStage: number;
  lastSolvedAt: string | null;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ user: User }>("/api/auth/login", { username, password }),
  me: () => api.get<{ user: User }>("/api/auth/me"),
  logout: () => api.post("/api/auth/logout"),
  getCompetitionStatus: () =>
    api.get<{ isActive: boolean; forceState: string; startTime: string; endTime: string; serverTime: string }>("/api/auth/competition-status"),
};

// ─── Challenges ───────────────────────────────────────────────────────────────

export const challengeApi = {
  list: () =>
    api.get<{ challenges: Challenge[]; competitionActive: boolean }>("/api/challenges"),
  get: (id: string) => api.get<{ challenge: Challenge }>(`/api/challenges/${id}`),
  getFlag: (id: string) => api.get<{ flag: string }>(`/api/challenges/${id}/flag`),
  submit: (id: string, answer: string) =>
    api.post<{
      correct: boolean;
      points?: number;
      message: string;
      nextStage?: { id: string; title: string } | null;
      competitionComplete?: boolean;
      attempts?: number;
      maxAttempts?: number;
    }>(`/api/challenges/${id}/submit`, { answer }),
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export const leaderboardApi = {
  get: () =>
    api.get<{ leaderboard: LeaderboardEntry[]; builtAt: string }>("/api/leaderboard"),
  live: () =>
    api.get<{
      leaderboard: LeaderboardEntry[];
      builtAt: string;
      competition: { start: string; end: string };
    }>("/api/leaderboard/live"),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => api.get("/api/admin/stats"),
  getUsers: () => api.get("/api/admin/users"),
  createUser: (data: {
    username: string;
    email: string;
    password: string;
    teamId?: string;
  }) => api.post("/api/admin/users", data),
  updateUser: (id: string, data: object) => api.patch(`/api/admin/users/${id}`, data),
  resetUser: (id: string) => api.post(`/api/admin/users/${id}/reset`),
  getTeams: () => api.get("/api/admin/teams"),
  createTeam: (name: string) => api.post("/api/admin/teams", { name }),
  getChallenges: () => api.get("/api/admin/challenges"),
  createChallenge: (data: object) => api.post("/api/admin/challenges", data),
  updateChallenge: (id: string, data: object) =>
    api.patch(`/api/admin/challenges/${id}`, data),
  reorderChallenges: (orderedIds: string[]) =>
    api.post<{ message: string }>("/api/admin/challenges/reorder", { orderedIds }),
  getCompetition: () => api.get("/api/admin/competition"),
  updateCompetition: (data: object) => api.post("/api/admin/competition", data),
  getSubmissions: (page = 1, limit = 50) =>
    api.get(`/api/admin/submissions?page=${page}&limit=${limit}`),
};
