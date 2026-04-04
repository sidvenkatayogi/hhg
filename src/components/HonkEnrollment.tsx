"use client";

import { useHonkAuth } from "./HonkAuthProvider";

const STEP_LABELS = [
  "",
  "Resting Honk — baseline frequency profile",
  "Alert Honk — elevated urgency, test your upper register",
  "Territorial Honk — full intensity, honk at this screen",
];

export default function HonkEnrollment() {
  const {
    enrollmentState,
    captureEnrollmentHonk,
    cancelEnrollment,
    isCapturing,
  } = useHonkAuth();

  const { step, status, error } = enrollmentState;

  if (step === 0 && status !== "complete") return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-surface border-2 border-primary rounded-2xl p-8 max-w-lg w-full mx-4 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-display text-primary">
            HONK-IN ENROLLMENT
          </h2>
          <p className="text-muted text-sm mt-2">
            Three honks to establish your voiceprint identity.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all ${
                i < step
                  ? "bg-success glow-green"
                  : i === step
                  ? "bg-primary animate-pulse glow-orange"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>

        {status === "complete" ? (
          <div className="text-center space-y-4">
            <div className="text-6xl">🪿</div>
            <p className="text-success font-bold text-xl">
              Enrollment Complete
            </p>
            <p className="text-muted text-sm">
              Honkprint generated. You are now a goose.
            </p>
          </div>
        ) : (
          <>
            {/* Current step instruction */}
            <div className="text-center space-y-2">
              <p className="text-foreground font-bold">
                Honk {step} of 3
              </p>
              <p className="text-muted text-sm">{STEP_LABELS[step]}</p>
            </div>

            {/* Microphone visualization */}
            <div className="flex justify-center">
              <div
                className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all ${
                  isCapturing
                    ? "border-primary bg-primary/20 animate-honk-pulse"
                    : "border-white/20 bg-white/5"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`w-10 h-10 ${
                    isCapturing ? "text-primary" : "text-muted"
                  }`}
                >
                  <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                  <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                </svg>
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div
                className={`p-3 rounded-lg border text-sm text-center ${
                  error.severity === "critical"
                    ? "bg-danger/20 border-danger text-danger"
                    : error.severity === "error"
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-secondary/20 border-secondary text-secondary"
                }`}
              >
                <span className="font-bold">[{error.code}] {error.label}:</span>{" "}
                {error.message}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={cancelEnrollment}
                className="flex-1 py-3 rounded-lg border border-white/20 text-muted hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={captureEnrollmentHonk}
                disabled={isCapturing}
                className="flex-1 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
              >
                {isCapturing ? "LISTENING..." : `HONK ${step}/3`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
