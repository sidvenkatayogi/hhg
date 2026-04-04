"use client";

import { useHonkAuth } from "./HonkAuthProvider";
import { TIER_CONFIG } from "@/lib/honk-types";

export default function HonkTierBadge() {
  const { isAuthenticated, tier, session, clearSession } = useHonkAuth();

  if (!isAuthenticated || !tier || !session) return null;

  const config = TIER_CONFIG[tier];

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={clearSession}
        title="Disconnect honk session"
        className="group flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border transition-all hover:border-white/30"
        style={{ borderColor: config.color + "40" }}
      >
        {/* Tier dot */}
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: config.color }}
        />
        {/* Label */}
        <span
          className="text-xs font-bold hidden sm:inline"
          style={{ color: config.color }}
        >
          {config.label.toUpperCase()}
        </span>
        {/* Disconnect icon on hover */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
