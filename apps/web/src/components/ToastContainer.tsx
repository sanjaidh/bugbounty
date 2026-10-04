import React from "react";
import { useToast, ToastItem } from "../context/ToastContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 380,
        width: "calc(100vw - 48px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const getColors = () => {
    switch (toast.type) {
      case "success":
        return {
          bg: "rgba(10, 25, 18, 0.95)",
          border: "rgba(16, 185, 129, 0.5)",
          accent: "#10b981",
          icon: "✓",
          glow: "rgba(16, 185, 129, 0.3)",
        };
      case "error":
        return {
          bg: "rgba(28, 12, 16, 0.95)",
          border: "rgba(239, 68, 68, 0.5)",
          accent: "#ef4444",
          icon: "✕",
          glow: "rgba(239, 68, 68, 0.3)",
        };
      case "warning":
        return {
          bg: "rgba(28, 22, 10, 0.95)",
          border: "rgba(245, 158, 11, 0.5)",
          accent: "#f59e0b",
          icon: "⚠",
          glow: "rgba(245, 158, 11, 0.3)",
        };
      case "info":
      default:
        return {
          bg: "rgba(14, 18, 36, 0.95)",
          border: "rgba(34, 211, 238, 0.5)",
          accent: "#22d3ee",
          icon: "⚡",
          glow: "rgba(34, 211, 238, 0.3)",
        };
    }
  };

  const style = getColors();

  return (
    <div
      className="animate-slideUp"
      style={{
        pointerEvents: "auto",
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px ${style.glow}`,
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        color: "var(--text-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Icon badge */}
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: `rgba(255, 255, 255, 0.08)`,
          border: `1px solid ${style.accent}`,
          color: style.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "0.85rem",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {style.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.875rem",
              color: style.accent,
              marginBottom: 2,
            }}
          >
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: "0.825rem", color: "var(--text-primary)", lineHeight: 1.4 }}>
          {toast.message}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: "1rem",
          lineHeight: 1,
          padding: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
      >
        ✕
      </button>

      {/* Progress bar line */}
      {toast.duration && toast.duration > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            background: style.accent,
            width: "100%",
            animation: `toastProgress ${toast.duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}
