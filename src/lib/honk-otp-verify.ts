// ── Honk Verification: Compare captured audio against Seed Honk reference ──
// Composite score = 0.40×frequency + 0.25×amplitude + 0.35×aggression
// Includes anti-impersonation detection for mouth-honks and mallard interference.

import {
  extractMFCC,
  cosineSimilarity,
  computeRmsDbfs,
  computePeakDbfs,
  yinPitchDetect,
  estimateFormants,
} from "./honk-dsp";
import {
  type SeedHonkParams,
  type HonkOtpResult,
  type HonkTier,
  HONK_PASS_THRESHOLD,
  HONK_APEX_THRESHOLD,
  HONK_GOSLING_THRESHOLD,
} from "./honk-types";

const ANALYSIS_WINDOW = 1024; // Samples for MFCC extraction

// ── Main verification entry point ──
export function verifyHonkOtp(
  capturedSignal: Float32Array,
  referenceSignal: Float32Array,
  params: SeedHonkParams,
  sampleRate: number = 44100
): HonkOtpResult {
  // Anti-impersonation checks first
  const antiImpersonation = detectImpersonation(capturedSignal, sampleRate);

  if (antiImpersonation.isHumanMouth) {
    return {
      matched: false,
      matchScore: 0,
      tier: "locked",
      frequencyMatch: 0,
      amplitudeMatch: 0,
      aggressionMatch: 0,
      antiImpersonation,
      errorCode: "HNK-012",
    };
  }

  if (antiImpersonation.isMallard) {
    return {
      matched: false,
      matchScore: 0,
      tier: "locked",
      frequencyMatch: 0,
      amplitudeMatch: 0,
      aggressionMatch: 0,
      antiImpersonation,
      errorCode: "HNK-011",
    };
  }

  // Check for environmental noise (bread-related distractions)
  const spectralFlat = spectralFlatness(capturedSignal, sampleRate);
  const isBreadDistraction = spectralFlat > 0.7;

  // Three-axis comparison
  const frequencyMatch = computeFrequencyMatch(
    capturedSignal,
    referenceSignal,
    sampleRate
  );
  const amplitudeMatch = computeAmplitudeMatch(
    capturedSignal,
    referenceSignal,
    sampleRate
  );
  const aggressionMatch = computeAggressionMatch(
    capturedSignal,
    params,
    sampleRate
  );

  const matchScore =
    0.4 * frequencyMatch + 0.25 * amplitudeMatch + 0.35 * aggressionMatch;

  // Bread distraction: noisy environment + score in probation band below pass
  if (
    isBreadDistraction &&
    matchScore >= HONK_GOSLING_THRESHOLD &&
    matchScore < HONK_PASS_THRESHOLD
  ) {
    return {
      matched: false,
      matchScore,
      tier: "gosling",
      frequencyMatch,
      amplitudeMatch,
      aggressionMatch,
      antiImpersonation,
      errorCode: "HNK-014",
    };
  }

  // Determine tier
  let tier: HonkTier = "locked";
  if (matchScore >= HONK_APEX_THRESHOLD) tier = "apex";
  else if (matchScore >= HONK_PASS_THRESHOLD) tier = "compliant";
  else if (matchScore >= HONK_GOSLING_THRESHOLD) tier = "gosling";

  const matched = matchScore >= HONK_PASS_THRESHOLD;

  return {
    matched,
    matchScore,
    tier,
    frequencyMatch,
    amplitudeMatch,
    aggressionMatch,
    antiImpersonation,
    errorCode: matched
      ? null
      : matchScore >= HONK_GOSLING_THRESHOLD
        ? "HNK-008"
        : "HNK-001",
  };
}

// ── Frequency Match (40% weight) ──
// Cosine similarity of MFCC vectors from captured vs reference signals.
function computeFrequencyMatch(
  captured: Float32Array,
  reference: Float32Array,
  sampleRate: number
): number {
  const capWindow = extractWindow(captured, ANALYSIS_WINDOW);
  const refWindow = extractWindow(reference, ANALYSIS_WINDOW);

  const capMfcc = extractMFCC(capWindow, sampleRate);
  const refMfcc = extractMFCC(refWindow, sampleRate);

  // Apply cepstral mean subtraction for volume invariance
  const cms = (v: number[]) => {
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    return v.map((x) => x - mean);
  };

  return Math.max(0, cosineSimilarity(cms(capMfcc), cms(refMfcc)));
}

// ── Amplitude Match (25% weight) ──
// Pearson correlation of RMS-envelope curves in 50ms windows.
function computeAmplitudeMatch(
  captured: Float32Array,
  reference: Float32Array,
  sampleRate: number
): number {
  const windowSamples = Math.floor(sampleRate * 0.05); // 50ms
  const capEnvelope = computeRmsEnvelope(captured, windowSamples);
  const refEnvelope = computeRmsEnvelope(reference, windowSamples);

  // Align lengths to the shorter one
  const len = Math.min(capEnvelope.length, refEnvelope.length);
  if (len < 2) return 0;

  const a = capEnvelope.slice(0, len);
  const b = refEnvelope.slice(0, len);

  return Math.max(0, pearsonCorrelation(a, b));
}

// ── Aggression Coefficient Match (35% weight) ──
// Compare spectral centroid, crest factor, and HNR against expected values.
function computeAggressionMatch(
  captured: Float32Array,
  params: SeedHonkParams,
  sampleRate: number
): number {
  const window = extractWindow(captured, ANALYSIS_WINDOW);

  // Actual measured values
  const scActual = spectralCentroid(window, sampleRate);
  const cfActual = crestFactor(window);
  const hnrActual = harmonicToNoiseRatio(window, sampleRate);

  // Expected values derived from aggression coefficient
  // Higher aggression → higher spectral centroid, lower crest factor (more compressed),
  // lower HNR (more noise/distortion)
  const agg = params.aggressionCoefficient;
  const scExpected = 600 + agg * 1200; // 600–1800 Hz
  const cfExpected = 6 - agg * 3; // 6–3 (lower = more aggressive)
  const hnrExpected = 15 - agg * 10; // 15–5 dB

  // Normalize differences to 0–1 match scores
  const scMatch = 1 - Math.min(1, Math.abs(scActual - scExpected) / 1200);
  const cfMatch = 1 - Math.min(1, Math.abs(cfActual - cfExpected) / 6);
  const hnrMatch = 1 - Math.min(1, Math.abs(hnrActual - hnrExpected) / 15);

  return (scMatch + cfMatch + hnrMatch) / 3;
}

// ── Anti-Impersonation Detection ──

function detectImpersonation(
  signal: Float32Array,
  sampleRate: number
): { isHumanMouth: boolean; isMallard: boolean; confidence: number } {
  const window = extractWindow(signal, ANALYSIS_WINDOW);
  const isHumanMouth = detectHumanMouthHonk(window, sampleRate);
  const isMallard = detectMallardQuack(signal, sampleRate);

  return {
    isHumanMouth,
    isMallard,
    confidence: isHumanMouth || isMallard ? 0.85 : 0.95,
  };
}

// Human saying "honk" has speech formants + /h/ fricative onset
function detectHumanMouthHonk(
  signal: Float32Array,
  sampleRate: number
): boolean {
  const { f1, f2 } = estimateFormants(signal, sampleRate);

  // Human vowel space for "o" in "honk": F1 ~500–700, F2 ~900–1400
  const hasVowelFormants = f1 >= 450 && f1 <= 750 && f2 >= 800 && f2 <= 1500;

  // Check for /h/ fricative onset: broadband noise in the first ~50ms
  const onsetSamples = Math.min(
    Math.floor(sampleRate * 0.05),
    signal.length
  );
  const onset = signal.slice(0, onsetSamples);
  const onsetFlat = spectralFlatness(onset, sampleRate);
  const hasFricativeOnset = onsetFlat > 0.5;

  // Both conditions required to flag (avoid false positives)
  return hasVowelFormants && hasFricativeOnset;
}

// Mallard quacks: downward F0 sweep + short duration
function detectMallardQuack(
  signal: Float32Array,
  sampleRate: number
): boolean {
  // Check duration: mallard quacks are 100–250ms
  const durationMs = (signal.length / sampleRate) * 1000;
  if (durationMs > 300) return false; // Too long for a mallard

  // Check for downward F0 sweep
  const thirdLen = Math.floor(signal.length / 3);
  if (thirdLen < 64) return false;

  const firstThird = signal.slice(0, thirdLen);
  const lastThird = signal.slice(signal.length - thirdLen);

  const f0Start = yinPitchDetect(firstThird, sampleRate);
  const f0End = yinPitchDetect(lastThird, sampleRate);

  // Mallard: F0 drops > 60 Hz over the quack
  return f0Start > 0 && f0End > 0 && f0Start - f0End > 60;
}

// ── DSP Helpers ──

function extractWindow(
  signal: Float32Array,
  windowSize: number
): Float32Array {
  if (signal.length <= windowSize) return signal;

  // Find loudest region
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

function computeRmsEnvelope(
  signal: Float32Array,
  windowSamples: number
): number[] {
  const envelope: number[] = [];
  for (let i = 0; i + windowSamples <= signal.length; i += windowSamples) {
    let sum = 0;
    for (let j = i; j < i + windowSamples; j++) {
      sum += signal[j] * signal[j];
    }
    envelope.push(Math.sqrt(sum / windowSamples));
  }
  // Normalize to 0–1
  const max = Math.max(...envelope, 1e-10);
  return envelope.map((v) => v / max);
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 2) return 0;

  let sumA = 0,
    sumB = 0,
    sumAB = 0,
    sumA2 = 0,
    sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }

  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt(
    (n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB)
  );
  return den === 0 ? 0 : num / den;
}

function spectralCentroid(
  signal: Float32Array,
  sampleRate: number
): number {
  const N = signal.length;
  const halfN = Math.floor(N / 2);

  let weightedSum = 0;
  let magnitudeSum = 0;

  for (let k = 0; k < halfN; k++) {
    let re = 0,
      im = 0;
    const freq = (k / N) * 2 * Math.PI;
    for (let n = 0; n < N; n++) {
      re += signal[n] * Math.cos(freq * n);
      im -= signal[n] * Math.sin(freq * n);
    }
    const mag = Math.sqrt(re * re + im * im);
    const freqHz = (k / N) * sampleRate;
    weightedSum += freqHz * mag;
    magnitudeSum += mag;
  }

  return magnitudeSum === 0 ? 0 : weightedSum / magnitudeSum;
}

function crestFactor(signal: Float32Array): number {
  let peak = 0;
  let sumSq = 0;
  for (let i = 0; i < signal.length; i++) {
    const abs = Math.abs(signal[i]);
    if (abs > peak) peak = abs;
    sumSq += signal[i] * signal[i];
  }
  const rms = Math.sqrt(sumSq / signal.length);
  return rms === 0 ? 0 : peak / rms;
}

function harmonicToNoiseRatio(
  signal: Float32Array,
  sampleRate: number
): number {
  // Simplified HNR: ratio of autocorrelation peak at pitch lag to total energy
  const N = Math.min(signal.length, 1024);
  const frame = signal.slice(0, N);

  const f0 = yinPitchDetect(frame, sampleRate);
  if (f0 === 0) return 0; // No pitch → no harmonic content

  const lag = Math.round(sampleRate / f0);
  if (lag >= N) return 0;

  // Autocorrelation at pitch lag
  let harmonicEnergy = 0;
  let totalEnergy = 0;
  for (let i = 0; i < N - lag; i++) {
    harmonicEnergy += frame[i] * frame[i + lag];
    totalEnergy += frame[i] * frame[i];
  }

  if (totalEnergy === 0) return 0;
  const ratio = harmonicEnergy / totalEnergy;
  // Convert to dB-like scale (0–30 range)
  return ratio > 0 ? 10 * Math.log10(ratio / (1 - Math.min(ratio, 0.999))) : 0;
}

function spectralFlatness(
  signal: Float32Array,
  sampleRate: number
): number {
  const N = Math.min(signal.length, 512);
  const frame = signal.slice(0, N);
  const halfN = Math.floor(N / 2);

  const mags: number[] = [];
  for (let k = 1; k < halfN; k++) {
    let re = 0,
      im = 0;
    const freq = (k / N) * 2 * Math.PI;
    for (let n = 0; n < N; n++) {
      re += frame[n] * Math.cos(freq * n);
      im -= frame[n] * Math.sin(freq * n);
    }
    mags.push(Math.sqrt(re * re + im * im) + 1e-10);
  }

  // Geometric mean / arithmetic mean
  const logSum = mags.reduce((s, v) => s + Math.log(v), 0);
  const geoMean = Math.exp(logSum / mags.length);
  const ariMean = mags.reduce((s, v) => s + v, 0) / mags.length;

  return ariMean === 0 ? 0 : geoMean / ariMean;
}
