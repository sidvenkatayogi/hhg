"use client";

import { useHonkAuth } from "./HonkAuthProvider";

export default function HonkAuthPrompt() {
  const {
    isAuthenticated,
    startAuth,
    authError,
    authAttempts,
  } = useHonkAuth();

  if (isAuthenticated) return null;

  return (
    <div className="honk-on-surface bg-surface border-2 border-primary/50 rounded-xl p-6 space-y-4">
      <div className="text-center space-y-2">
        <div className="text-4xl">🪿</div>
        <h3 className="text-xl font-display text-primary">
          HONK VERIFICATION REQUIRED
        </h3>
        <p className="honk-on-surface-muted text-sm">
          Authenticate your goose vocalization to place bets. The Seed Honk plays in this browser — honk it back into your microphone.
        </p>
      </div>

      {authError && (
        <div
          className={`p-3 rounded-lg border text-sm text-center ${
            authError.severity === "critical"
              ? "bg-danger/25 border-danger text-[#fff5f5]"
              : authError.severity === "error"
              ? "bg-black/35 border-primary text-[#fff8ed]"
              : "bg-black/35 border-secondary text-[#fffbeb]"
          }`}
        >
          <span className="font-bold">
            [{authError.code}] {authError.label}:
          </span>{" "}
          {authError.message}
          {authAttempts >= 1 && (
            <p className="mt-1 text-xs opacity-90">Attempt {authAttempts}.</p>
          )}
        </div>
      )}

      <button
        onClick={startAuth}
        className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/80 transition-colors animate-pulse-glow"
      >
        START HONK VERIFICATION
      </button>
    </div>
  );
}
