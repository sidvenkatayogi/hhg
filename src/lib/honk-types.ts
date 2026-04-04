// ── Honk-in Biometric Voice Authentication — Types ──

export type HonkTier = "apex" | "compliant" | "gosling" | "locked";

export type HonkErrorCode =
  | "HNK-001" // Weak Honk
  | "HNK-002" // Duck Mimicry
  | "HNK-003" // Goose-Adjacent Vocalization
  | "HNK-004" // Silent Submission
  | "HNK-005" // Muffled Honk
  | "HNK-006" // Replay Attack
  | "HNK-007" // Excessive Honk
  | "HNK-008" // Formant Drift
  | "HNK-009"; // Competitive Honking

export interface HonkError {
  code: HonkErrorCode;
  label: string;
  message: string;
  severity: "warning" | "error" | "critical";
}

export interface HonkAnalysis {
  f0: number; // Fundamental frequency (Hz)
  f1: number; // First formant (Hz)
  f2: number; // Second formant (Hz)
  peakDbfs: number; // Peak amplitude in dBFS
  rmsDbfs: number; // RMS amplitude in dBFS
  duration: number; // Duration of detected vocalization (ms)
  mfcc: number[]; // 13 MFCC coefficients
  isValid: boolean;
  errorCode: HonkErrorCode | null;
}

export interface Honkprint {
  digest: string; // SHA-3 hex digest
  meanF0: number;
  f1Band: [number, number]; // F1 range
  f2Band: [number, number]; // F2 range
  enrollmentPeakDbfs: number;
  enrollmentRmsDbfs: number;
  mfccTemplate: number[][]; // 3 enrollment MFCC sequences
  enrolledAt: number; // Unix ms
}

export interface HonkSession {
  pubkey: string;
  honkprint: string; // SHA-3 digest
  tier: HonkTier;
  authenticatedAt: number; // Unix ms
  roundId: string; // Scoped to a round
}

export interface HonkEnrollmentState {
  step: 0 | 1 | 2 | 3; // 0 = not started, 1-3 = honk number
  captures: HonkAnalysis[];
  status: "idle" | "listening" | "processing" | "complete" | "error";
  error: HonkError | null;
}

export const HONK_ERRORS: Record<HonkErrorCode, Omit<HonkError, "code">> = {
  "HNK-001": {
    label: "Weak Honk",
    message: "Your honk was insufficient. Please honk with conviction.",
    severity: "warning",
  },
  "HNK-002": {
    label: "Duck Mimicry",
    message: "Quack signature detected. You are not a duck. Try again as a goose.",
    severity: "critical",
  },
  "HNK-003": {
    label: "Goose-Adjacent Vocalization",
    message: "That was not a honk. Please honk.",
    severity: "warning",
  },
  "HNK-004": {
    label: "Silent Submission",
    message: "No vocalization detected. Silence is not authentication.",
    severity: "error",
  },
  "HNK-005": {
    label: "Muffled Honk",
    message: "Honk is muffled. Ensure microphone is uncovered.",
    severity: "error",
  },
  "HNK-006": {
    label: "Replay Attack",
    message: "Recorded playback detected. Account locked.",
    severity: "critical",
  },
  "HNK-007": {
    label: "Excessive Honk",
    message: "Honk registered at extreme volume. Noise complaint auto-filed.",
    severity: "warning",
  },
  "HNK-008": {
    label: "Formant Drift",
    message: "Voiceprint has drifted. Re-enrollment recommended.",
    severity: "warning",
  },
  "HNK-009": {
    label: "Competitive Honking",
    message: "Multiple simultaneous honks detected. Please honk one at a time.",
    severity: "error",
  },
};

export const TIER_CONFIG: Record<
  HonkTier,
  { label: string; color: string; minRelativeDb: number; access: string }
> = {
  apex: {
    label: "Dominant Gander",
    color: "#FFD700",
    minRelativeDb: -3, // Within 3 dBFS of enrollment peak
    access: "Full access + admin prompt bypass",
  },
  compliant: {
    label: "Standard Goose",
    color: "#00FF88",
    minRelativeDb: -12, // Within 12 dBFS
    access: "Full access",
  },
  gosling: {
    label: "Gosling (Probationary)",
    color: "#FF6B00",
    minRelativeDb: -22, // Within 22 dBFS
    access: "Read-only, 30-day grace period",
  },
  locked: {
    label: "Low-Energy Predator",
    color: "#FF4444",
    minRelativeDb: -Infinity,
    access: "Permanently locked out",
  },
};
