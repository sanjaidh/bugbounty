import React from "react";

export default function CyberBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {/* Top-left ambient purple glow */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "50vw",
          height: "50vw",
          background:
            "radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />

      {/* Bottom-right ambient purple glow */}
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-10%",
          width: "45vw",
          height: "45vw",
          background:
            "radial-gradient(ellipse at center, rgba(168,85,247,0.05) 0%, transparent 65%)",
          filter: "blur(70px)",
        }}
      />

      {/* Technical grid — 3% opacity, fades toward edges */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at 50% 40%, black 30%, rgba(0,0,0,0.6) 55%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 40%, black 30%, rgba(0,0,0,0.6) 55%, transparent 80%)",
        }}
      />
    </div>
  );
}
