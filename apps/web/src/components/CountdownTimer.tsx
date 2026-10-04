import React, { useState, useEffect } from "react";
import { authApi } from "../lib/api";

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  ended: boolean;
  active: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function CountdownTimer() {
  const [compConfig, setCompConfig] = useState<{
    isActive: boolean;
    startTime: string;
    endTime: string;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    ended: false,
    active: false,
  });

  useEffect(() => {
    authApi.getCompetitionStatus().then((res) => {
      setCompConfig(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!compConfig) return;

    const updateTimer = () => {
      const nowMs = Date.now();
      const endMs = new Date(compConfig.endTime).getTime();
      const remainingMs = Math.max(0, endMs - nowMs);

      const ended = nowMs >= endMs || (!compConfig.isActive && remainingMs <= 0);
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
      const seconds = Math.floor((remainingMs / 1000) % 60);

      setTimeLeft({
        hours,
        minutes,
        seconds,
        ended,
        active: compConfig.isActive,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [compConfig]);

  const units = [
    { label: "HRS",  value: timeLeft.hours   },
    { label: "MIN",   value: timeLeft.minutes },
    { label: "SEC",   value: timeLeft.seconds },
  ];

  return (
    <div
      style={{
        border: "3px solid #A855F7",
        borderRadius: "4px",
        background: "rgba(10, 5, 22, 0.92)",
        boxShadow: "0 0 30px rgba(168, 85, 247, 0.3), 6px 6px 0px #000000",
        marginBottom: "32px",
        overflow: "hidden",
        position: "relative",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Top accent line */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #06B6D4, #A855F7, #A3E635)" }} />

      <div style={{ padding: "20px 24px" }}>
        {/* Header label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <span
            className="font-pixel"
            style={{
              fontSize: "0.72rem",
              color: timeLeft.ended ? "#F43F5E" : "#A855F7",
              letterSpacing: "1px",
            }}
          >
            {timeLeft.ended ? "⚠️ COMPETITION ENDED" : "⏱️ COMPETITION ENDS IN"}
          </span>
          <span
            className="font-mono text-xs"
            style={{
              color: "#06B6D4",
              fontWeight: 700,
            }}
          >
            {timeLeft.ended ? "SUBMISSIONS LOCKED" : "4-HOUR ARENA TIMER"}
          </span>
        </div>

        {/* Numbers */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {units.map((unit, i) => (
            <React.Fragment key={unit.label}>
              <div style={{ textAlign: "center", minWidth: "3.5ch" }}>
                <div
                  className="font-pixel"
                  style={{
                    fontSize: "2.4rem",
                    fontWeight: 900,
                    color: timeLeft.ended ? "#F43F5E" : "#FFFFFF",
                    lineHeight: 1,
                    textShadow: timeLeft.ended ? "0 0 14px #F43F5E" : "0 0 14px #A855F7",
                  }}
                >
                  {pad(unit.value)}
                </div>
                <div
                  className="font-mono text-xs"
                  style={{
                    fontWeight: 800,
                    color: "#A8A0B8",
                    marginTop: "6px",
                    letterSpacing: "1px",
                  }}
                >
                  {unit.label}
                </div>
              </div>
              {i < units.length - 1 && (
                <div
                  className="font-pixel"
                  style={{
                    fontSize: "2rem",
                    color: "#A855F7",
                    lineHeight: 1,
                    paddingBottom: "18px",
                  }}
                >
                  :
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "rgba(255, 255, 255, 0.1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: timeLeft.ended ? "100%" : `${Math.min(100, Math.max(0, ((timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds) / (4 * 3600)) * 100))}%`,
            background: timeLeft.ended ? "#F43F5E" : "linear-gradient(90deg, #06B6D4, #A855F7)",
            transition: "width 1s linear",
          }}
        />
      </div>
    </div>
  );
}
