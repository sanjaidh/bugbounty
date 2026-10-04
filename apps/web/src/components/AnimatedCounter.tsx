import React, { useEffect, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in ms
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedCounter({
  value = 0,
  duration = 600,
  prefix = "",
  suffix = "",
  className,
  style,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value ?? 0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const initialValue = displayValue;
    const diff = value - initialValue;

    if (diff === 0) return;

    // Check prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easedProgress = 1 - (1 - progress) * (1 - progress);
      const current = Math.floor(initialValue + diff * easedProgress);
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {prefix}
      {(displayValue ?? 0).toLocaleString()}
      {suffix}
    </span>
  );
}
