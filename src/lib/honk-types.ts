// ── Honk-OTP 2FA — Types ──

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
  | "HNK-009" // Competitive Honking
  | "HNK-010" // Silent Gander (phone on mute)
  | "HNK-011" // Mallard Interference
  | "HNK-012" // Human Impersonation (mouth-honk)
  | "HNK-013" // Hissing Lockout (legacy; lockout disabled in app)
  | "HNK-014" // Bread Distraction (environmental noise)
  | "HNK-015"; // Seed Honk Expired

export interface HonkError {
  code: HonkErrorCode;
  label: string;
  message: string;
  severity: "warning" | "error" | "critical";
}

export interface HonkAnalysis {
  f0: number;
  f1: number;
  f2: number;
  peakDbfs: number;
  rmsDbfs: number;
  duration: number;
  mfcc: number[];
  isValid: boolean;
  errorCode: HonkErrorCode | null;
}

// ── Seed Honk Parameters ──
// Server generates these per auth attempt; client synthesizes the audio.
export interface SeedHonkParams {
  id: string;
  fundamentalHz: number;       // Base frequency (180–420 Hz, Canada goose range)
  harmonics: number[];          // Relative amplitudes for 2nd–5th harmonics
  amplitudeEnvelope: {
    attackMs: number;
    decayMs: number;
    sustainLevel: number;       // 0–1
    releaseMs: number;
  };
  durationMs: number;           // Total duration (400–900 ms)
  frequencyModulation: {
    rate: number;               // Vibrato rate (Hz)
    depth: number;              // Vibrato depth (Hz)
  };
  aggressionCoefficient: number; // 0–1, controls harmonic distortion
  createdAt: number;
  expiresAt: number;
}

/** Response from GET /api/honk-auth/challenge */
export interface HonkChallengeResponse {
  seedHonk: SeedHonkParams;
  expiresAt: number;
  /** Present when ElevenLabs is configured: pcm_44100 s16le mono, base64. */
  seedAudioPcmBase64?: string;
  seedAudioSampleRate?: number;
}

// ── OTP Flow State ──
export type HonkOtpStep =
  | "idle"
  | "phone-entry"
  | "calling"
  | "playing-seed"
  | "listening"
  | "verifying"
  | "success"
  | "error";

export interface HonkOtpState {
  step: HonkOtpStep;
  seedHonkParams: SeedHonkParams | null;
  phoneNumber: string;
  error: HonkError | null;
  matchScore: number | null;
}

// ── OTP Verification Result ──
export interface HonkOtpResult {
  matched: boolean;
  matchScore: number;
  tier: HonkTier;
  frequencyMatch: number;
  amplitudeMatch: number;
  aggressionMatch: number;
  antiImpersonation: {
    isHumanMouth: boolean;
    isMallard: boolean;
    confidence: number;
  };
  errorCode: HonkErrorCode | null;
}

/** Minimum composite match (0–1) to authenticate (~50%). */
export const HONK_PASS_THRESHOLD = 0.5;

/** Tier cutoffs: apex ≥ this, then compliant ≥ pass, gosling ≥ probation floor. */
export const HONK_APEX_THRESHOLD = 0.65;
export const HONK_GOSLING_THRESHOLD = 0.4;

// ── Phone Registration (replaces Honkprint) ──
export interface HonkRegistration {
  phoneNumber: string;
  registeredAt: number;
  pubkey: string;
}

export interface HonkSession {
  pubkey: string;
  tier: HonkTier;
  authenticatedAt: number;
  roundId: string;
  seedHonkId: string;
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
  "HNK-010": {
    label: "Silent Gander",
    message: "No audio detected. Is your phone on mute? The goose waits for no one.",
    severity: "error",
  },
  "HNK-011": {
    label: "Mallard Interference",
    message: "Sub-standard Mallard signature detected. Canada Goose protocol only.",
    severity: "critical",
  },
  "HNK-012": {
    label: "Human Impersonation",
    message: "Human mouth-honk detected. You cannot fool the Waterfowl Handshake Protocol.",
    severity: "critical",
  },
  "HNK-013": {
    label: "Hissing Lockout",
    message: "Three failures detected. Account locked for 24 hours. The geese are unimpressed.",
    severity: "critical",
  },
  "HNK-014": {
    label: "Bread Distraction",
    message: "Environmental noise detected. Please move to a quieter location and retry.",
    severity: "warning",
  },
  "HNK-015": {
    label: "Seed Honk Expired",
    message:
      "Your Seed Honk has expired. Start a new Honk verification to get a fresh challenge.",
    severity: "error",
  },
};

export const TIER_CONFIG: Record<
  HonkTier,
  { label: string; color: string; minScore: number; access: string }
> = {
  apex: {
    label: "Dominant Gander",
    color: "#FFD700",
    minScore: HONK_APEX_THRESHOLD,
    access: "Full access + admin prompt bypass",
  },
  compliant: {
    label: "Standard Goose",
    color: "#00FF88",
    minScore: HONK_PASS_THRESHOLD,
    access: "Full access",
  },
  gosling: {
    label: "Gosling (Probationary)",
    color: "#FF6B00",
    minScore: HONK_GOSLING_THRESHOLD,
    access: "Read-only, 30-day grace period",
  },
  locked: {
    label: "Low-Energy Predator",
    color: "#FF4444",
    minScore: -Infinity,
    access: "Permanently locked out",
  },
};
