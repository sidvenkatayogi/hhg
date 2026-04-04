"use client";

import { useHonkAuth } from "./HonkAuthProvider";
import { TIER_CONFIG } from "@/lib/honk-types";

export default function HonkAuthPrompt() {
  const {
    isEnrolled,
    isAuthenticated,
    authenticate,
    authError,
    authAttempts,
    isCapturing,
    startEnrollment,
    reEnroll,
    tier,
  } = useHonkAuth();

  // Already authenticated — show nothing
  if (isAuthenticated) return null;

  return (
    <div className="bg-surface border-2 border-primary/50 rounded-xl p-6 space-y-4">
      <div className="text-center space-y-2">
        <div className="text-4xl">🪿</div>
        <h3 className="text-xl font-display text-primary">
          {isEnrolled ? "HONK TO AUTHENTICATE" : "HONK-IN REQUIRED"}
        </h3>
        <p className="text-muted text-sm">
          {isEnrolled
            ? "Your honkprint is on file. Honk to verify your identity and place bets."
            : "No honkprint found. Enroll your goose vocalization to begin betting."}
        </p>
      </div>

      {/* Auth error */}
      {authError && (
        <div
          className={`p-3 rounded-lg border text-sm text-center ${
            authError.severity === "critical"
              ? "bg-danger/20 border-danger text-danger"
              : authError.severity === "error"
              ? "bg-primary/20 border-primary text-primary"
              : "bg-secondary/20 border-secondary text-secondary"
          }`}
        >
          <span className="font-bold">[{authError.code}] {authError.label}:</span>{" "}
          {authError.message}
          {authAttempts >= 2 && authAttempts < 5 && (
            <p className="mt-1 text-xs">
              Attempt {authAttempts}/5. The system is watching.
            </p>
          )}
        </div>
      )}

      {/* Microphone indicator */}
      {isCapturing && (
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary bg-primary/20 animate-honk-pulse flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-8 h-8 text-primary"
            >
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {isEnrolled ? (
          <>
            <button
              onClick={reEnroll}
              className="flex-1 py-3 rounded-lg border border-white/20 text-muted hover:bg-white/5 transition-colors text-sm"
            >
              Re-enroll
            </button>
            <button
              onClick={authenticate}
              disabled={isCapturing}
              className="flex-1 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
            >
              {isCapturing ? "LISTENING..." : "HONK NOW"}
            </button>
          </>
        ) : (
          <button
            onClick={startEnrollment}
            className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/80 transition-colors animate-pulse-glow"
          >
            BEGIN ENROLLMENT
          </button>
        )}
      </div>

      {/* Tier info if recently failed */}
      {authError && tier === null && authAttempts >= 3 && (
        <div className="text-center text-xs text-muted space-y-1">
          <p>Continued failures may result in Gosling tier demotion.</p>
          <p>
            Users who cannot honk at sufficient intensity will be classified as{" "}
            <span style={{ color: TIER_CONFIG.locked.color }}>
              {TIER_CONFIG.locked.label}
            </span>
            .
          </p>
        </div>
      )}
    </div>
  );
}
