"use client";

import { useState } from "react";
import { useHonkAuth } from "./HonkAuthProvider";
import { HONK_PASS_THRESHOLD } from "@/lib/honk-types";
import VFormationAnimation from "./VFormationAnimation";

export default function HonkOtpFlow() {
  const { otpState, cancelAuth, cancelRegistration, registerPhone } =
    useHonkAuth();

  const [phoneInput, setPhoneInput] = useState("");

  const { step, error, matchScore } = otpState;

  // Only show modal for active flow steps
  if (step === "idle") return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="honk-on-surface bg-surface border-2 border-primary rounded-2xl p-8 max-w-lg w-full mx-4 space-y-6">
        {/* ── Phone Entry ── */}
        {step === "phone-entry" && (
          <>
            <div className="text-center">
              <h2 className="text-2xl font-display text-primary">
                HONK-OTP REGISTRATION
              </h2>
              <p className="honk-on-surface-muted text-sm mt-2">
                Save a contact number for your Honk-OTP profile. In this
                prototype, the Seed Honk always plays in this browser—no real
                outbound call is placed.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm honk-on-surface-muted">Phone Number</label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+1 (555) 867-5309"
                className="w-full bg-black/40 border border-white/25 rounded-lg px-4 py-3 text-[#fdfbf5] placeholder:text-[rgba(253,251,245,0.45)] focus:border-primary focus:outline-none transition-colors"
              />
              <p className="text-xs honk-on-surface-subtle">
                Stored on this device only. Real voice/SMS delivery can be wired
                in later; for now it is account metadata.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelRegistration}
                className="flex-1 py-3 rounded-lg border border-white/25 honk-on-surface-muted hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (phoneInput.trim().length >= 7) {
                    registerPhone(phoneInput.trim());
                    setPhoneInput("");
                  }
                }}
                disabled={phoneInput.trim().length < 7}
                className="flex-1 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                REGISTER PHONE
              </button>
            </div>
          </>
        )}

        {/* ── Calling (prototype: fetch challenge, no PSTN) ── */}
        {step === "calling" && (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-display text-primary">
              PREPARING SEED HONK
            </h2>
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-primary bg-primary/20 flex items-center justify-center animate-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-10 h-10 text-primary"
                >
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                  <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                </svg>
              </div>
            </div>
            <p className="honk-on-surface-muted text-sm animate-pulse">
              Fetching your challenge from the server...
            </p>
            <p className="text-xs honk-on-surface-subtle">
              Audio will play through this device&apos;s speakers next—not over
              the phone network.
            </p>
          </div>
        )}

        {/* ── Playing Seed Honk ── */}
        {step === "playing-seed" && (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-display text-primary">
              SEED HONK (THIS DEVICE)
            </h2>
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-secondary bg-secondary/20 flex items-center justify-center seed-honk-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-10 h-10 text-secondary"
                >
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                  <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                </svg>
              </div>
            </div>
            {/* Waveform visualization */}
            <div className="flex items-center justify-center gap-1 h-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-secondary rounded-full seed-honk-bar"
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    height: `${12 + Math.sin(i * 0.8) * 10}px`,
                  }}
                />
              ))}
            </div>
            <p className="text-secondary font-bold animate-pulse">
              SEED HONK PLAYING...
            </p>
            <p className="text-xs honk-on-surface-muted">
              Listen on this computer—you will re-capture a similar honk through
              the microphone in the next step.
            </p>
          </div>
        )}

        {/* ── Listening ── */}
        {step === "listening" && (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-display text-primary">
              RE-TRANSMIT INTO MICROPHONE
            </h2>
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-primary bg-primary/20 flex items-center justify-center animate-honk-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-10 h-10 text-primary"
                >
                  <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                  <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                </svg>
              </div>
            </div>
            <p className="text-primary font-bold">
              Play back the honk you just heard (e.g. from another phone or
              speaker held near this mic), or produce a matching honk.
            </p>
            <p className="text-xs honk-on-surface-muted">
              The protocol compares your microphone capture to the Seed Honk
              that played here—not to a cellular call.
            </p>
          </div>
        )}

        {/* ── Verifying ─��� */}
        {step === "verifying" && (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-display text-primary">
              ANALYZING HONK SIGNATURE
            </h2>
            <div className="space-y-3">
              <VerifyBar label="Frequency Profile" delay={0} />
              <VerifyBar label="Amplitude Dynamics" delay={0.3} />
              <VerifyBar label="Aggression Coefficient" delay={0.6} />
            </div>
            <p className="honk-on-surface-muted text-sm animate-pulse">
              Running Waterfowl Handshake Protocol verification...
            </p>
          </div>
        )}

        {/* ── Success ── */}
        {step === "success" && (
          <div className="text-center space-y-4">
            <VFormationAnimation
              onComplete={() => {
                // Auto-dismiss after animation
              }}
            />
            <p className="text-success font-bold text-xl">ACCESS GRANTED</p>
            {matchScore !== null && (
              <p className="honk-on-surface-muted text-sm">
                Acoustic match: {(matchScore * 100).toFixed(1)}%
              </p>
            )}
            <button
              onClick={cancelAuth}
              className="py-2 px-6 rounded-lg bg-success/20 border border-success text-success hover:bg-success/30 transition-colors"
            >
              CONTINUE
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {step === "error" && error && (
          <div className="text-center space-y-4">
            <div className="text-6xl">
              {error.code === "HNK-011" ? "🦆" : "🪿"}
            </div>
            <h2 className="text-2xl font-display text-danger">
              AUTHENTICATION FAILED
            </h2>
            <div
              className={`p-3 rounded-lg border text-sm ${
                error.severity === "critical"
                  ? "bg-danger/25 border-danger text-[#fff5f5]"
                  : error.severity === "error"
                  ? "bg-black/35 border-primary text-[#fff8ed]"
                  : "bg-black/35 border-secondary text-[#fffbeb]"
              }`}
            >
              <span className="font-bold opacity-100">
                [{error.code}] {error.label}:
              </span>{" "}
              {error.message}
            </div>
            {matchScore !== null && matchScore > 0 && (
              <p className="honk-on-surface-subtle text-xs">
                Acoustic match: {(matchScore * 100).toFixed(1)}% (
                {(HONK_PASS_THRESHOLD * 100).toFixed(0)}% required)
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={cancelAuth}
                className="flex-1 py-3 rounded-lg border border-white/25 honk-on-surface-muted hover:bg-white/10 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  cancelAuth();
                }}
                className="flex-1 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/80 transition-colors"
              >
                TRY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──

function VerifyBar({ label, delay }: { label: string; delay: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="honk-on-surface-muted">{label}</span>
        <span className="text-primary verify-check" style={{ animationDelay: `${delay + 0.5}s` }}>
          ...
        </span>
      </div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full verify-bar"
          style={{ animationDelay: `${delay}s` }}
        />
      </div>
    </div>
  );
}

