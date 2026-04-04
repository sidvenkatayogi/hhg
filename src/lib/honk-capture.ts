// ── Honk-OTP Capture: Microphone access, real-time honk detection ──
// Reused from the original Honk-in system — captures a single honk from
// the microphone for comparison against the Seed Honk reference signal.

import { getAudioContext } from "./audio-context";
import {
  yinPitchDetect,
  estimateFormants,
  extractMFCC,
  computeRmsDbfs,
  computePeakDbfs,
} from "./honk-dsp";
import type {
  HonkAnalysis,
  HonkErrorCode,
  HonkRegistration,
} from "./honk-types";

const FRAME_SIZE = 2048;
const SILENCE_THRESHOLD_DBFS = -50;
const HONK_MIN_DURATION_MS = 150;
const HONK_MAX_DURATION_MS = 3000;
const ENERGY_DROP_FRAMES = 15;
const CAPTURE_TIMEOUT_MS = 6000;
const ANALYSIS_WINDOW_SIZE = 2048;

export interface CaptureResult {
  analysis: HonkAnalysis;
  rawSignal: Float32Array; // Full captured signal for OTP verification
  rawPeakDbfs: number;
}

// Capture a single honk from the microphone and return the raw signal
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
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);

    const result = await waitForHonk(analyser, ctx.sampleRate);
    source.disconnect();
    return result;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function waitForHonk(
  analyser: AnalyserNode,
  sampleRate: number
): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    const buffer = new Float32Array(FRAME_SIZE);
    let honkStarted = false;
    let honkStartTime = 0;
    let peakDbfs = -Infinity;
    let frames: Float32Array[] = [];
    let silenceFrameCount = 0;
    const startTime = Date.now();
    let rafId: number | null = null;

    function process() {
      const now = Date.now();

      if (now - startTime > CAPTURE_TIMEOUT_MS) {
        if (rafId !== null) cancelAnimationFrame(rafId);
        reject(makeAnalysisError("HNK-010")); // Silent Gander
        return;
      }

      analyser.getFloatTimeDomainData(buffer);
      const frame = buffer.slice();
      const frameDbfs = computeRmsDbfs(frame);
      const framePeakDbfs = computePeakDbfs(frame);

      if (framePeakDbfs > peakDbfs) peakDbfs = framePeakDbfs;

      if (!honkStarted && frameDbfs > SILENCE_THRESHOLD_DBFS) {
        honkStarted = true;
        honkStartTime = now;
        frames = [];
        silenceFrameCount = 0;
      }

      if (honkStarted) {
        frames.push(frame.slice());
        const elapsed = now - honkStartTime;

        if (frameDbfs < SILENCE_THRESHOLD_DBFS) {
          silenceFrameCount++;
        } else {
          silenceFrameCount = 0;
        }

        const isSustainedSilence =
          silenceFrameCount >= ENERGY_DROP_FRAMES && elapsed > HONK_MIN_DURATION_MS;
        const isMaxDuration = elapsed > HONK_MAX_DURATION_MS;

        if (isSustainedSilence || isMaxDuration) {
          const fullSignal = concatenateFrames(frames);
          const analysisWindow = extractAnalysisWindow(fullSignal, ANALYSIS_WINDOW_SIZE);
          const analysis = analyzeHonk(analysisWindow, sampleRate, elapsed, peakDbfs);
          if (rafId !== null) cancelAnimationFrame(rafId);
          resolve({ analysis, rawSignal: fullSignal, rawPeakDbfs: peakDbfs });
          return;
        }
      }

      rafId = requestAnimationFrame(process);
    }

    rafId = requestAnimationFrame(process);
  });
}

function extractAnalysisWindow(signal: Float32Array, windowSize: number): Float32Array {
  if (signal.length <= windowSize) return signal;

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

  return {
    f0,
    f1,
    f2,
    peakDbfs,
    rmsDbfs,
    duration: durationMs,
    mfcc,
    isValid: rmsDbfs > -65,
    errorCode: rmsDbfs < -65 ? "HNK-010" : null,
  };
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

// ── Phone Registration Persistence (localStorage) ──

const LEGACY_LOCKOUT_KEY_PREFIX = "honk_lockout_";

const REGISTRATION_KEY_PREFIX = "honk_registration_";

export function saveRegistration(pubkey: string, phoneNumber: string): void {
  const registration: HonkRegistration = {
    phoneNumber,
    registeredAt: Date.now(),
    pubkey,
  };
  localStorage.setItem(
    REGISTRATION_KEY_PREFIX + pubkey,
    JSON.stringify(registration)
  );
}

export function loadRegistration(pubkey: string): HonkRegistration | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REGISTRATION_KEY_PREFIX + pubkey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function deleteRegistration(pubkey: string): void {
  localStorage.removeItem(REGISTRATION_KEY_PREFIX + pubkey);
  localStorage.removeItem(LEGACY_LOCKOUT_KEY_PREFIX + pubkey);
}
