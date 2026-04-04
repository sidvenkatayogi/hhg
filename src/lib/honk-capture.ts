// ── Honk-in Capture: Microphone access, real-time analysis, classification ──

import { getAudioContext } from "./audio-context";
import {
  yinPitchDetect,
  estimateFormants,
  extractMFCC,
  computeRmsDbfs,
  computePeakDbfs,
  cosineSimilarity,
  dtwDistance,
  computeHonkprintDigest,
} from "./honk-dsp";
import type {
  HonkAnalysis,
  HonkErrorCode,
  Honkprint,
  HonkTier,
} from "./honk-types";
import { TIER_CONFIG } from "./honk-types";

const FRAME_SIZE = 2048; // ~46ms at 44100 Hz for better analysis
const SILENCE_THRESHOLD_DBFS = -50; // Room noise floor (~-55 dBFS), detect honks above this
const HONK_MIN_DURATION_MS = 150; // Minimum honk duration
const HONK_MAX_DURATION_MS = 3000;
const ENERGY_DROP_FRAMES = 15; // ~250ms at 60fps — require sustained silence to end
const CAPTURE_TIMEOUT_MS = 6000;
// Maximum samples fed into DSP analysis. YIN and the DFT are O(N²) — passing
// the full concatenated recording (potentially 100k+ samples) causes multi-second
// browser freezes. 2048 samples (~46ms at 44100 Hz) is sufficient for pitch and
// formant analysis.
const ANALYSIS_WINDOW_SIZE = 2048;

export interface CaptureResult {
  analysis: HonkAnalysis;
  mfccSequence: number[][];
  rawPeakDbfs: number;
}

// Capture a single honk from the microphone and analyze it
export async function captureHonk(): Promise<CaptureResult> {
  const ctx = getAudioContext();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  try {
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.2; // Faster response
    source.connect(analyser);
    // Do NOT connect to destination — we don't want honk playback

    const result = await waitForHonk(analyser, ctx.sampleRate);
    source.disconnect();
    return result;
  } finally {
    // Always stop microphone tracks to prevent indicator leak
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function waitForHonk(
  analyser: AnalyserNode,
  sampleRate: number
): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    const buffer = new Float32Array(FRAME_SIZE);
    const mfccSequence: number[][] = [];
    let honkStarted = false;
    let honkStartTime = 0;
    let peakDbfs = -Infinity;
    let frames: Float32Array[] = [];
    let silenceFrameCount = 0; // Track consecutive silence frames
    const startTime = Date.now();
    let rafId: number | null = null; // FIX #1: Store RAF ID for cancellation

    function process() {
      const now = Date.now();

      // Timeout — no honk detected
      if (now - startTime > CAPTURE_TIMEOUT_MS) {
        if (rafId !== null) cancelAnimationFrame(rafId); // FIX #1: Cancel RAF loop
        reject(makeAnalysisError("HNK-004"));
        return;
      }

      analyser.getFloatTimeDomainData(buffer);
      const frame = buffer.slice(); // Use full frame, not partial
      const frameDbfs = computeRmsDbfs(frame);
      const framePeakDbfs = computePeakDbfs(frame);

      if (framePeakDbfs > peakDbfs) peakDbfs = framePeakDbfs;

      // Honk onset detection (FIX #3: Lower threshold from -40 to -50 dBFS)
      if (!honkStarted && frameDbfs > SILENCE_THRESHOLD_DBFS) {
        honkStarted = true;
        honkStartTime = now;
        frames = [];
        mfccSequence.length = 0;
        silenceFrameCount = 0;
      }

      if (honkStarted) {
        frames.push(frame.slice());

        const elapsed = now - honkStartTime;

        // FIX #3: Track sustained silence instead of immediate threshold drop
        if (frameDbfs < SILENCE_THRESHOLD_DBFS) {
          silenceFrameCount++;
        } else {
          silenceFrameCount = 0; // Reset if sound returns
        }

        // Honk end detection: sustained silence OR max duration
        const isSustainedSilence =
          silenceFrameCount >= ENERGY_DROP_FRAMES && elapsed > HONK_MIN_DURATION_MS;
        const isMaxDuration = elapsed > HONK_MAX_DURATION_MS;

        if (isSustainedSilence || isMaxDuration) {
          // Honk complete — extract a fixed-size analysis window from the middle
          // of the signal. DO NOT pass the full concatenated signal to DSP functions
          // — YIN and the naive DFT are O(N²), so a 1-second honk (~122k samples)
          // produces billions of operations and freezes the browser.
          const fullSignal = concatenateFrames(frames);
          const analysisWindow = extractAnalysisWindow(fullSignal, ANALYSIS_WINDOW_SIZE);
          const mfccFinal = extractMFCC(analysisWindow, sampleRate);
          mfccSequence.push(mfccFinal);
          const analysis = analyzeHonk(analysisWindow, sampleRate, elapsed, peakDbfs);
          if (rafId !== null) cancelAnimationFrame(rafId);
          resolve({ analysis, mfccSequence, rawPeakDbfs: peakDbfs });
          return;
        }
      }

      rafId = requestAnimationFrame(process);
    }

    rafId = requestAnimationFrame(process);
  });
}

// Extract a fixed-size window from the loudest (most representative) portion
// of the signal. Avoids feeding multi-second recordings into O(N²) DSP functions.
function extractAnalysisWindow(signal: Float32Array, windowSize: number): Float32Array {
  if (signal.length <= windowSize) return signal;

  // Find the loudest windowSize-sample region using a sliding RMS scan
  // (step by windowSize/4 for speed, not every sample)
  const step = Math.max(1, Math.floor(windowSize / 4));
  let bestStart = 0;
  let bestRms = 0;

  for (let i = 0; i + windowSize <= signal.length; i += step) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) {
      sum += signal[j] * signal[j];
    }
    const rms = sum / windowSize;
    if (rms > bestRms) {
      bestRms = rms;
      bestStart = i;
    }
  }

  return signal.slice(bestStart, bestStart + windowSize);
}

function concatenateFrames(frames: Float32Array[]): Float32Array {
  const totalLength = frames.reduce((sum, f) => sum + f.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const frame of frames) {
    result.set(frame, offset);
    offset += frame.length;
  }
  return result;
}

function analyzeHonk(
  signal: Float32Array,
  sampleRate: number,
  durationMs: number,
  peakDbfs: number
): HonkAnalysis {
  const f0 = yinPitchDetect(signal, sampleRate);
  const { f1, f2 } = estimateFormants(signal, sampleRate);
  const rmsDbfs = computeRmsDbfs(signal);
  const mfcc = extractMFCC(signal, sampleRate);

  // Classify the honk.
  // HNK-007 (excessive volume) is a warning, not a validity blocker — the PRD
  // explicitly states it "still authenticates". All other non-null codes fail the honk.
  const errorCode = classifyHonk(f0, f1, f2, peakDbfs, rmsDbfs, durationMs);
  const isWarningOnly = errorCode === "HNK-007";

  return {
    f0,
    f1,
    f2,
    peakDbfs,
    rmsDbfs,
    duration: durationMs,
    mfcc,
    isValid: errorCode === null || isWarningOnly,
    errorCode,
  };
}

function classifyHonk(
  f0: number,
  f1: number,
  f2: number,
  peakDbfs: number,
  rmsDbfs: number,
  durationMs: number
): HonkErrorCode | null {
  // HNK-004: Silent submission — no sound at all.
  // rmsDbfs threshold lowered from -50 to -65 dBFS: a real voice through a
  // distant or quiet microphone can read below -50 dBFS in Web Audio normalized
  // values. -65 dBFS is closer to true silence.
  // f0 === 0 check is retained as a secondary gate if YIN finds no periodicity.
  if (rmsDbfs < -65) {
    return "HNK-004";
  }

  // Only classify as silent if BOTH pitch is absent AND volume is very low.
  // Prevents classifying low-pitched voices as silent just because YIN missed them.
  if (f0 === 0 && rmsDbfs < -50) {
    return "HNK-004";
  }

  // HNK-002: Duck mimicry — formant ratio heuristic.
  // Requires all three conditions simultaneously to avoid false positives on
  // low-pitched human voices (which share some spectral overlap with ducks).
  if (f0 > 0 && f0 < 200 && f1 > 0 && f1 / f0 < 2.8 && durationMs < 250) {
    return "HNK-002";
  }

  // HNK-003: Goose-adjacent vocalization — F0 outside human+goose range.
  // Expanded from 150–900 Hz to 80–1100 Hz to cover the full adult vocal range
  // (male: ~85–180 Hz, female: ~165–255 Hz). The original 150 Hz floor excluded
  // most male voices, triggering false HNK-003 responses on every male user.
  // Only block if f0 is actually detected (skip if YIN returned 0).
  if (f0 > 0 && (f0 < 80 || f0 > 1100)) {
    return "HNK-003";
  }

  // HNK-007: Excessive honk — only flag true digital clipping (≥ -1 dBFS).
  // The original threshold was -3 dBFS, which a normal speaking voice (peak
  // amplitude 0.7–0.85) trivially exceeds. -1 dBFS (amplitude ≥ 0.89) indicates
  // genuine near-clip levels, not just a loud-but-normal voice.
  if (peakDbfs > -1 && durationMs > 1200) {
    return "HNK-007"; // Still authenticates — warning only
  }

  // HNK-005: Muffled honk.
  // Removed f2 < 500 Hz check: the naive 512-sample DFT has ~86 Hz/bin resolution,
  // making F2 estimates unreliable. False muffled-honk errors were common on valid
  // voices. Muffled detection now relies on overall spectral energy (rmsDbfs).
  if (rmsDbfs < -55 && peakDbfs < -20) {
    return "HNK-005";
  }

  return null; // Valid honk
}

function makeAnalysisError(code: HonkErrorCode): HonkAnalysis {
  return {
    f0: 0,
    f1: 0,
    f2: 0,
    peakDbfs: -Infinity,
    rmsDbfs: -Infinity,
    duration: 0,
    mfcc: new Array(13).fill(0),
    isValid: false,
    errorCode: code,
  };
}

// ── Enrollment: capture 3 honks and generate a honkprint ──
export async function enrollHonk(
  captures: CaptureResult[]
): Promise<Honkprint> {
  if (captures.length !== 3) {
    throw new Error("Enrollment requires exactly 3 honk captures");
  }

  const analyses = captures.map((c) => c.analysis);
  const meanF0 =
    analyses.reduce((sum, a) => sum + a.f0, 0) / analyses.length;

  const f1Values = analyses.map((a) => a.f1);
  const f2Values = analyses.map((a) => a.f2);
  const peakValues = captures.map((c) => c.rawPeakDbfs);
  const rmsValues = analyses.map((a) => a.rmsDbfs);

  const mfccTemplate = captures.map((c) => c.mfccSequence).flat();
  const digest = await computeHonkprintDigest(mfccTemplate);

  return {
    digest,
    meanF0,
    f1Band: [Math.min(...f1Values) - 50, Math.max(...f1Values) + 50],
    f2Band: [Math.min(...f2Values) - 100, Math.max(...f2Values) + 100],
    enrollmentPeakDbfs: Math.max(...peakValues),
    enrollmentRmsDbfs: rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length,
    mfccTemplate,
    enrolledAt: Date.now(),
  };
}

// ── Authentication: match a captured honk against a stored honkprint ──
export function authenticateHonk(
  capture: CaptureResult,
  honkprint: Honkprint
): { matched: boolean; similarity: number; tier: HonkTier; errorCode: HonkErrorCode | null } {
  const { analysis, mfccSequence } = capture;

  // Check for classification errors first
  if (analysis.errorCode && analysis.errorCode !== "HNK-007") {
    return {
      matched: false,
      similarity: 0,
      tier: "locked",
      errorCode: analysis.errorCode,
    };
  }

  // MFCC similarity via DTW
  const dtw = dtwDistance(mfccSequence, honkprint.mfccTemplate);
  // Convert DTW distance to similarity score (lower distance = higher similarity)
  const similarity = Math.max(0, 1 - dtw / 50);

  // Check formant drift (HNK-008)
  if (similarity >= 0.70 && similarity < 0.87) {
    return {
      matched: false,
      similarity,
      tier: "gosling",
      errorCode: "HNK-008",
    };
  }

  // Match threshold
  if (similarity < 0.70) {
    return {
      matched: false,
      similarity,
      tier: "locked",
      errorCode: "HNK-001",
    };
  }

  // Determine tier based on relative dB to enrollment
  const relativeDb = capture.rawPeakDbfs - honkprint.enrollmentPeakDbfs;
  let tier: HonkTier = "locked";

  if (relativeDb >= TIER_CONFIG.apex.minRelativeDb) {
    tier = "apex";
  } else if (relativeDb >= TIER_CONFIG.compliant.minRelativeDb) {
    tier = "compliant";
  } else if (relativeDb >= TIER_CONFIG.gosling.minRelativeDb) {
    tier = "gosling";
  }

  // HNK-001: Weak honk — relative dB below gosling threshold
  if (tier === "locked") {
    return {
      matched: true,
      similarity,
      tier: "locked",
      errorCode: "HNK-001",
    };
  }

  return {
    matched: true,
    similarity,
    tier,
    errorCode: analysis.errorCode, // May be HNK-007 (excessive, still valid)
  };
}

// ── Honkprint persistence via localStorage ──
const HONKPRINT_KEY_PREFIX = "honkin_print_";

export function saveHonkprint(pubkey: string, honkprint: Honkprint): void {
  localStorage.setItem(
    HONKPRINT_KEY_PREFIX + pubkey,
    JSON.stringify(honkprint)
  );
}

export function loadHonkprint(pubkey: string): Honkprint | null {
  const raw = localStorage.getItem(HONKPRINT_KEY_PREFIX + pubkey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Honkprint;
  } catch {
    return null;
  }
}

export function deleteHonkprint(pubkey: string): void {
  localStorage.removeItem(HONKPRINT_KEY_PREFIX + pubkey);
}
