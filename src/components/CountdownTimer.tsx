"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  bettingEndsAt: number;
  status: string;
}

export default function CountdownTimer({ bettingEndsAt, status }: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, Math.ceil((bettingEndsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [bettingEndsAt]);

  if (status === "resolved") {
    return null;
  }

  if (status === "revealing" || secondsLeft === 0) {
    return (
      <div className="text-center">
        <div className="inline-block bg-danger/20 border border-danger/50 rounded-xl px-6 py-3">
          <span className="text-danger font-bold text-xl animate-pulse">
            {status === "revealing" ? "REVEALING..." : "BETTING CLOSED"}
          </span>
        </div>
      </div>
    );
  }

  const isUrgent = secondsLeft <= 10;
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="text-center">
      <div
        className={`inline-block rounded-xl px-6 py-3 border ${
          isUrgent
            ? "bg-danger/20 border-danger/50 animate-scale-pulse"
            : "bg-surface border-white/10"
        }`}
      >
        <span className="text-muted text-sm mr-2">Time remaining</span>
        <span
          className={`font-bold text-2xl tabular-nums ${
            isUrgent ? "text-danger" : "text-foreground"
          }`}
        >
          {minutes}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
