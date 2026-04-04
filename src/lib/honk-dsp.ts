// ── Honk-in DSP: Pitch detection, MFCC extraction, honkprint generation ──
// All signal processing runs client-side to avoid sending raw audio to the server.

// ── YIN pitch estimator ──
// Detects fundamental frequency (F0) from a time-domain audio frame.
// Based on: de Cheveigné & Kawahara, "YIN, a fundamental frequency estimator"
// Maximum input size for all DSP functions. These are O(N²) algorithms —
// inputs beyond this size cause multi-second browser freezes.
const MAX_DSP_SAMPLES = 2048;

export function yinPitchDetect(
  frame: Float32Array,
  sampleRate: number,
  // 0.25 is more permissive than the typical 0.15 used for pure tones.
  // Human speech with ambient noise needs a looser threshold or YIN returns 0
  // for valid voiced segments, triggering false HNK-004 silent-submission errors.
  threshold: number = 0.25
): number {
  // Hard cap: never process more than MAX_DSP_SAMPLES
  const capped = frame.length > MAX_DSP_SAMPLES ? frame.slice(0, MAX_DSP_SAMPLES) : frame;
  const halfLen = Math.floor(capped.length / 2);
  const d = new Float32Array(halfLen);

  // Step 1+2: Difference function
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0;
    for (let j = 0; j < halfLen; j++) {
      const diff = capped[j] - capped[j + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Step 3: Cumulative mean normalized difference
  const dPrime = new Float32Array(halfLen);
  dPrime[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += d[tau];
    dPrime[tau] = d[tau] / (runningSum / tau);
  }

  // Step 4: Absolute threshold — find first dip below threshold
  // Search from 80 Hz (low male voice) to 1100 Hz (upper vocal range).
  // The original 150–900 Hz window excluded most male speaking voices (~85–150 Hz),
  // causing YIN to return 0 and trigger false HNK-004 silent-submission errors.
  const minTau = Math.floor(sampleRate / 1100);
  const maxTau = Math.min(halfLen - 1, Math.floor(sampleRate / 80));

  let bestTau = -1;
  for (let tau = minTau; tau < maxTau; tau++) {
    if (dPrime[tau] < threshold) {
      // Parabolic interpolation for sub-sample accuracy
      while (tau + 1 < maxTau && dPrime[tau + 1] < dPrime[tau]) {
        tau++;
      }
      bestTau = tau;
      break;
    }
  }

  if (bestTau === -1) return 0; // No pitch detected

  // Parabolic interpolation around bestTau
  if (bestTau > 0 && bestTau < halfLen - 1) {
    const s0 = dPrime[bestTau - 1];
    const s1 = dPrime[bestTau];
    const s2 = dPrime[bestTau + 1];
    const refinement = (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
    if (isFinite(refinement)) {
      return sampleRate / (bestTau + refinement);
    }
  }

  return sampleRate / bestTau;
}

// ── Formant estimation (simplified LPC-based) ──
// Estimates F1 and F2 from spectral peaks in the magnitude spectrum.
export function estimateFormants(
  frame: Float32Array,
  sampleRate: number
): { f1: number; f2: number } {
  // Cap to 512 samples — formant analysis only needs ~11ms of signal.
  // nextPow2 on a full recording would produce a fftSize in the tens of
  // thousands, making the naive DFT loop billions of iterations.
  const input = frame.length > 512 ? frame.slice(0, 512) : frame;
  const N = input.length;
  const fftSize = nextPow2(N);

  // Compute magnitude spectrum via naive DFT (acceptable at N≤512)
  const spectrum = new Float32Array(fftSize / 2);
  for (let k = 0; k < fftSize / 2; k++) {
    let re = 0;
    let im = 0;
    const freq = (k / fftSize) * 2 * Math.PI;
    for (let n = 0; n < N; n++) {
      re += input[n] * Math.cos(freq * n);
      im -= input[n] * Math.sin(freq * n);
    }
    spectrum[k] = Math.sqrt(re * re + im * im);
  }

  // Find peaks in formant regions
  // F1: 200–1000 Hz, F2: 800–3500 Hz
  const f1Bin = findSpectralPeak(spectrum, 200, 1000, sampleRate, fftSize);
  const f2Bin = findSpectralPeak(spectrum, 800, 3500, sampleRate, fftSize);

  return {
    f1: (f1Bin / fftSize) * sampleRate,
    f2: (f2Bin / fftSize) * sampleRate,
  };
}

function findSpectralPeak(
  spectrum: Float32Array,
  minHz: number,
  maxHz: number,
  sampleRate: number,
  fftSize: number
): number {
  const minBin = Math.floor((minHz / sampleRate) * fftSize);
  const maxBin = Math.min(
    spectrum.length - 1,
    Math.ceil((maxHz / sampleRate) * fftSize)
  );

  let peakBin = minBin;
  let peakVal = 0;
  for (let i = minBin; i <= maxBin; i++) {
    if (spectrum[i] > peakVal) {
      peakVal = spectrum[i];
      peakBin = i;
    }
  }
  return peakBin;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// ── MFCC extraction (13 coefficients) ──
// Mel-Frequency Cepstral Coefficients for voiceprint matching.
export function extractMFCC(
  frame: Float32Array,
  sampleRate: number,
  numCoeffs: number = 13,
  numFilters: number = 26
): number[] {
  // Cap to 1024 samples. The naive DFT is O(N²) — larger inputs freeze the browser.
  // 1024 samples (~23ms at 44100 Hz) gives adequate spectral resolution for MFCCs.
  const input = frame.length > 1024 ? frame.slice(0, 1024) : frame;
  const N = input.length;
  const fftSize = nextPow2(N); // Max 1024 → fftSize = 1024

  // Apply Hann window
  const windowed = new Float32Array(fftSize);
  for (let i = 0; i < N; i++) {
    windowed[i] = input[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  }

  // Naive DFT (acceptable at fftSize=1024: 512 × 1024 = ~524K ops ≈ 50ms)
  const magSpectrum = new Float32Array(fftSize / 2 + 1);
  for (let k = 0; k <= fftSize / 2; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < fftSize; n++) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      re += windowed[n] * Math.cos(angle);
      im -= windowed[n] * Math.sin(angle);
    }
    magSpectrum[k] = re * re + im * im; // Power spectrum
  }

  // Mel filterbank
  const melFilters = createMelFilterbank(numFilters, fftSize, sampleRate);
  const filterEnergies = new Float32Array(numFilters);
  for (let m = 0; m < numFilters; m++) {
    let sum = 0;
    for (let k = 0; k < magSpectrum.length; k++) {
      sum += magSpectrum[k] * melFilters[m][k];
    }
    filterEnergies[m] = Math.log(Math.max(sum, 1e-10));
  }

  // DCT to get MFCCs
  const mfcc = new Array(numCoeffs);
  for (let i = 0; i < numCoeffs; i++) {
    let sum = 0;
    for (let j = 0; j < numFilters; j++) {
      sum += filterEnergies[j] * Math.cos((Math.PI * i * (j + 0.5)) / numFilters);
    }
    mfcc[i] = sum;
  }

  return mfcc;
}

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

function createMelFilterbank(
  numFilters: number,
  fftSize: number,
  sampleRate: number
): Float32Array[] {
  const nyquist = sampleRate / 2;
  const melMin = hzToMel(0);
  const melMax = hzToMel(nyquist);
  const melPoints = new Float32Array(numFilters + 2);
  for (let i = 0; i < numFilters + 2; i++) {
    melPoints[i] = melMin + (i * (melMax - melMin)) / (numFilters + 1);
  }

  const binPoints = melPoints.map((mel) =>
    Math.floor(((melToHz(mel) / sampleRate) * fftSize) + 0.5)
  );

  const halfSpec = fftSize / 2 + 1;
  const filters: Float32Array[] = [];
  for (let m = 0; m < numFilters; m++) {
    const filter = new Float32Array(halfSpec);
    const left = binPoints[m];
    const center = binPoints[m + 1];
    const right = binPoints[m + 2];

    for (let k = left; k < center && k < halfSpec; k++) {
      filter[k] = (k - left) / Math.max(center - left, 1);
    }
    for (let k = center; k <= right && k < halfSpec; k++) {
      filter[k] = (right - k) / Math.max(right - center, 1);
    }
    filters.push(filter);
  }

  return filters;
}

// ── dBFS measurement ──
export function computeRmsDbfs(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  return 20 * Math.log10(Math.max(rms, 1e-10));
}

export function computePeakDbfs(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  return 20 * Math.log10(Math.max(peak, 1e-10));
}

// ── Cosine similarity for honkprint matching ──
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Dynamic Time Warping for MFCC sequence matching ──
export function dtwDistance(
  seq1: number[][],
  seq2: number[][]
): number {
  const n = seq1.length;
  const m = seq2.length;
  if (n === 0 || m === 0) return Infinity;

  const cost = Array.from({ length: n + 1 }, () =>
    new Float64Array(m + 1).fill(Infinity)
  );
  cost[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      // Euclidean distance between MFCC vectors
      let dist = 0;
      for (let k = 0; k < seq1[i - 1].length; k++) {
        const d = (seq1[i - 1][k] || 0) - (seq2[j - 1][k] || 0);
        dist += d * d;
      }
      dist = Math.sqrt(dist);

      cost[i][j] =
        dist +
        Math.min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1]);
    }
  }

  return cost[n][m] / Math.max(n, m); // Normalize by path length
}

// ── SHA-3 (Keccak-256) for honkprint digest ──
// Simplified hash using SubtleCrypto — falls back to SHA-256 since
// SubtleCrypto doesn't support SHA-3 natively. For a production system
// you'd use a proper SHA-3 library; this is the Goose Bets approach.
export async function computeHonkprintDigest(
  mfccTemplate: number[][]
): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(mfccTemplate));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
