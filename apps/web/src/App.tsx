import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/ToastContainer";
import CyberBackground from "./components/CyberBackground";
import GlobalSolveNotifier from "./components/GlobalSolveNotifier";

// Lazy load pages for performance
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ChallengePage = lazy(() => import("./pages/ChallengePage"));
const ChallengeDetailPage = lazy(() => import("./pages/ChallengeDetailPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const LiveLeaderboardPage = lazy(() => import("./pages/LiveLeaderboardPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: "100vh" }}>
        <div className="spinner" />
        <span className="text-muted text-sm">Authenticating...</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/challenges" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense
      fallback={
        <div className="loading-center" style={{ minHeight: "100vh" }}>
          <div className="spinner" />
        </div>
      }
    >
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/challenges" replace /> : <LoginPage />}
        />
        <Route
          path="/challenges"
          element={
            <ProtectedRoute>
              <ChallengePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/challenges/:id"
          element={
            <ProtectedRoute>
              <ChallengeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <LeaderboardPage />
            </ProtectedRoute>
          }
        />
        {/* Hall screen — no auth required so it can be on a display */}
        <Route path="/live" element={<LiveLeaderboardPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/challenges" replace />} />
        <Route path="*" element={<Navigate to="/challenges" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CyberBackground />
          <GlobalSolveNotifier />
          <AppRoutes />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

