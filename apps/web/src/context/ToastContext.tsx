import React, { createContext, useContext, useState, useCallback } from "react";
import { sound } from "../lib/sound";

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, type, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, title, message, type, duration };

      // Play subtle sound according to toast type
      if (type === "success") sound.playSuccess();
      else if (type === "error") sound.playError();
      else sound.playNotification();

      setToasts((prev) => [...prev.slice(-4), newToast]); // Limit to max 5 visible toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ message, title, type: "success" });
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast({ message, title, type: "error" });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast({ message, title, type: "info" });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast({ message, title, type: "warning" });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
