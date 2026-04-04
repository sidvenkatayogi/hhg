"use client";

import { useHonkAuth } from "./HonkAuthProvider";

export default function HonkAuthPrompt() {
  const {
    isRegistered,
    isAuthenticated,
    startAuth,
    authError,
    authAttempts,
    showRegistration,
    reRegister,
    phoneNumber,
  } = useHonkAuth();

  if (isAuthenticated) return null;

  return (
    <div className="honk-on-surface bg-surface border-2 border-primary/50 rounded-xl p-6 space-y-4">
      <div className="text-center space-y-2">
        <div className="text-4xl">🪿</div>
        <h3 className="text-xl font-display text-primary">
          {isRegistered
            ? "HONK-OTP VERIFICATION"
            : "HONK-OTP REGISTRATION REQUIRED"}
        </h3>
        <p className="honk-on-surface-muted text-sm">
          {isRegistered
            ? `Phone ${phoneNumber} on file. Start Honk verification—the Seed Honk plays in this browser (no real call).`
            : "No phone on file. Register a contact number to continue (prototype: stored locally only)."}
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

      <div className="flex gap-3">
        {isRegistered ? (
          <>
            <button
              onClick={reRegister}
              className="flex-1 py-3 rounded-lg border border-white/25 honk-on-surface-muted hover:bg-white/10 transition-colors text-sm"
            >
              Change Phone
            </button>
            <button
              onClick={startAuth}
              className="flex-1 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/80 transition-colors animate-pulse-glow"
            >
              START HONK VERIFICATION
            </button>
          </>
        ) : (
          <button
            onClick={showRegistration}
            className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/80 transition-colors animate-pulse-glow"
          >
            REGISTER PHONE
          </button>
        )}
      </div>
    </div>
  );
}
