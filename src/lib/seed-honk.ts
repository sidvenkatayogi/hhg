// ── Seed Honk: Parameter generation + Web Audio API synthesis ──
// Each auth attempt gets a unique, non-repeating acoustic goose signature.

import type { SeedHonkParams } from "./honk-types";

/** Peak envelope level — louder, chestier honk (Web Audio path). */
const SYNTH_MASTER_PEAK = 0.88;

// ── Parameter generation (used by API route) ──

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generateSeedHonkParams(): SeedHonkParams {
  const id = crypto.randomUUID();
  const now = Date.now();

  return {
    id,
    // Bias low: large Canada goose honk is fundamentally deep (~150–320 Hz).
    fundamentalHz: randomInRange(145, 320),
    harmonics: [
      randomInRange(0.3, 0.8), // 2nd harmonic (strong in goose honks)
      randomInRange(0.2, 0.7), // 3rd harmonic
      randomInRange(0.1, 0.4), // 4th harmonic
      randomInRange(0.05, 0.25), // 5th harmonic (weaker)
    ],
    amplitudeEnvelope: {
      attackMs: randomInRange(10, 50),
      decayMs: randomInRange(30, 80),
      sustainLevel: randomInRange(0.5, 0.9),
      releaseMs: randomInRange(50, 200),
    },
    durationMs: randomInRange(400, 900),
    frequencyModulation: {
      rate: randomInRange(3, 8),
      depth: randomInRange(5, 20),
    },
    aggressionCoefficient: randomInRange(0.3, 0.9),
    createdAt: now,
    expiresAt: now + 60_000,
  };
}

// ── Distortion curve for aggression ──
function makeDistortionCurve(aggression: number): Float32Array {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const amount = aggression * 50;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] =
      ((3 + amount) * x * 20 * (Math.PI / 180)) /
      (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

// ── Client-side synthesis: play the Seed Honk through speakers ──
export function synthesizeSeedHonk(
  ctx: AudioContext,
  params: SeedHonkParams
): Promise<void> {
  return new Promise((resolve) => {
    const now = ctx.currentTime;
    const durSec = params.durationMs / 1000;
    const { attackMs, decayMs, sustainLevel, releaseMs } =
      params.amplitudeEnvelope;
    const attackSec = attackMs / 1000;
    const decaySec = decayMs / 1000;
    const releaseSec = releaseMs / 1000;
    const sustainEnd = durSec - releaseSec;

    // Master gain (ADSR envelope)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(SYNTH_MASTER_PEAK, now + attackSec);
    masterGain.gain.linearRampToValueAtTime(
      SYNTH_MASTER_PEAK * sustainLevel,
      now + attackSec + decaySec
    );
    masterGain.gain.setValueAtTime(
      SYNTH_MASTER_PEAK * sustainLevel,
      now + sustainEnd
    );
    masterGain.gain.linearRampToValueAtTime(0, now + durSec);

    // Aggression distortion
    const waveshaper = ctx.createWaveShaper();
    waveshaper.curve = makeDistortionCurve(params.aggressionCoefficient) as Float32Array<ArrayBuffer>;
    waveshaper.oversample = "4x";

    // Bandpass resonance (goose formant ~800 Hz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 680;
    bandpass.Q.value = 1 + params.aggressionCoefficient * 3;

    // FM vibrato LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = params.frequencyModulation.rate;
    lfoGain.gain.value = params.frequencyModulation.depth;
    lfo.connect(lfoGain);
    lfo.start(now);
    lfo.stop(now + durSec);

    // Fundamental oscillator (sawtooth — closest to goose timbre)
    const fundamental = ctx.createOscillator();
    fundamental.type = "sawtooth";
    fundamental.frequency.value = params.fundamentalHz;
    lfoGain.connect(fundamental.frequency); // FM vibrato
    fundamental.connect(waveshaper);
    fundamental.start(now);
    fundamental.stop(now + durSec);

    // Harmonic overtones
    const harmonicOscs: OscillatorNode[] = [];
    for (let i = 0; i < params.harmonics.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = params.fundamentalHz * (i + 2);
      gain.gain.value = params.harmonics[i] * 0.36;
      osc.connect(gain);
      gain.connect(waveshaper);
      osc.start(now);
      osc.stop(now + durSec);
      harmonicOscs.push(osc);
    }

    // Signal chain: waveshaper → bandpass → masterGain → destination
    waveshaper.connect(bandpass);
    bandpass.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Resolve when done
    fundamental.onended = () => resolve();
  });
}

// ── Render reference signal via OfflineAudioContext ──
// Returns the exact waveform for comparison (deterministic, no speaker/mic path)
export async function renderSeedHonkReference(
  params: SeedHonkParams,
  sampleRate: number = 44100
): Promise<Float32Array> {
  const durSec = params.durationMs / 1000;
  const totalSamples = Math.ceil(durSec * sampleRate);
  const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

  const now = offlineCtx.currentTime;
  const { attackMs, decayMs, sustainLevel, releaseMs } =
    params.amplitudeEnvelope;
  const attackSec = attackMs / 1000;
  const decaySec = decayMs / 1000;
  const releaseSec = releaseMs / 1000;
  const sustainEnd = durSec - releaseSec;

  // Master gain (ADSR)
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(SYNTH_MASTER_PEAK, now + attackSec);
  masterGain.gain.linearRampToValueAtTime(
    SYNTH_MASTER_PEAK * sustainLevel,
    now + attackSec + decaySec
  );
  masterGain.gain.setValueAtTime(
    SYNTH_MASTER_PEAK * sustainLevel,
    now + sustainEnd
  );
  masterGain.gain.linearRampToValueAtTime(0, now + durSec);

  // Aggression distortion
  const waveshaper = offlineCtx.createWaveShaper();
  waveshaper.curve = makeDistortionCurve(params.aggressionCoefficient) as Float32Array<ArrayBuffer>;
  waveshaper.oversample = "4x";

  // Bandpass
  const bandpass = offlineCtx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 680;
  bandpass.Q.value = 1 + params.aggressionCoefficient * 3;

  // FM vibrato LFO
  const lfo = offlineCtx.createOscillator();
  const lfoGain = offlineCtx.createGain();
  lfo.type = "sine";
  lfo.frequency.value = params.frequencyModulation.rate;
  lfoGain.gain.value = params.frequencyModulation.depth;
  lfo.connect(lfoGain);
  lfo.start(now);
  lfo.stop(now + durSec);

  // Fundamental
  const fundamental = offlineCtx.createOscillator();
  fundamental.type = "sawtooth";
  fundamental.frequency.value = params.fundamentalHz;
  lfoGain.connect(fundamental.frequency);
  fundamental.connect(waveshaper);
  fundamental.start(now);
  fundamental.stop(now + durSec);

  // Harmonics
  for (let i = 0; i < params.harmonics.length; i++) {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = params.fundamentalHz * (i + 2);
    gain.gain.value = params.harmonics[i] * 0.36;
    osc.connect(gain);
    gain.connect(waveshaper);
    osc.start(now);
    osc.stop(now + durSec);
  }

  // Chain
  waveshaper.connect(bandpass);
  bandpass.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  const buffer = await offlineCtx.startRendering();
  return buffer.getChannelData(0);
}
