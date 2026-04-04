"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

// V-formation positions: leader at center-top, wings spread back
const GEESE = [
  { endX: 0, endY: -60, delay: 0 },       // Leader
  { endX: -50, endY: -20, delay: 0.1 },    // Left wing 1
  { endX: 50, endY: -20, delay: 0.1 },     // Right wing 1
  { endX: -100, endY: 20, delay: 0.2 },    // Left wing 2
  { endX: 100, endY: 20, delay: 0.2 },     // Right wing 2
  { endX: -150, endY: 60, delay: 0.3 },    // Left wing 3
  { endX: 150, endY: 60, delay: 0.3 },     // Right wing 3
];

export default function VFormationAnimation({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasConfettied = useRef(false);

  useEffect(() => {
    if (!hasConfettied.current) {
      hasConfettied.current = true;
      // Gold + orange goose confetti
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FF6B00", "#00FF88", "#FFFFFF"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.5, x: 0.3 },
          colors: ["#FFD700", "#FF6B00"],
        });
      }, 400);
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.5, x: 0.7 },
          colors: ["#FFD700", "#FF6B00"],
        });
      }, 600);
    }

    const timer = setTimeout(() => {
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-48 overflow-hidden flex items-center justify-center"
    >
      {GEESE.map((goose, i) => (
        <span
          key={i}
          className="absolute text-3xl v-formation-goose"
          style={
            {
              "--end-x": `${goose.endX}px`,
              "--end-y": `${goose.endY}px`,
              "--delay": `${goose.delay}s`,
              animationDelay: `${goose.delay}s`,
            } as React.CSSProperties
          }
        >
          🪿
        </span>
      ))}
      {/* Honk ripple text */}
      <div className="absolute bottom-2 text-center w-full v-formation-text">
        <span className="text-primary font-display text-lg tracking-widest">
          HONK VERIFIED
        </span>
      </div>
    </div>
  );
}
