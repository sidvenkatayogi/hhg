// ── ElevenLabs TTS: server-only seed honk generation ──
// Uses @elevenlabs/elevenlabs-js. Requires ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID.

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { SeedHonkParams } from "./honk-types";

async function readableStreamToUint8Array(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Short honk lines — TTS will interpret; variety comes from id + voice settings. */
export function buildHonkTtsText(params: SeedHonkParams): string {
  const hex = params.id.replace(/-/g, "");
  const n = parseInt(hex.slice(0, 8), 16);
  const lines = [
    "HONK! HONK! Honk honk!",
    "Haaawnk! Hawnk hawnk!",
    "Honk! Honk honk honk!",
    "Hnk! Hnk hnk hnk!",
    "A loud goose honk. HONK!",
  ];
  return lines[n % lines.length];
}

/**
 * Returns raw PCM s16le mono @ 44100 Hz (pcm_44100) from ElevenLabs.
 */
export async function generateSeedHonkPcm(
  params: SeedHonkParams,
  voiceId: string,
  apiKey: string
): Promise<Uint8Array> {
  const client = new ElevenLabsClient({ apiKey });
  const text = buildHonkTtsText(params);
  const n = parseInt(params.id.replace(/-/g, "").slice(0, 8), 16);

  const stream = await client.textToSpeech.convert(voiceId, {
    text,
    modelId: "eleven_multilingual_v2",
    outputFormat: "pcm_44100",
    voiceSettings: {
      stability: 0.2 + (n % 60) / 100,
      similarityBoost: 0.55 + params.aggressionCoefficient * 0.35,
      style: params.aggressionCoefficient * 0.45,
      speed: Math.min(1.05, Math.max(0.78, 0.88 + params.aggressionCoefficient * 0.12)),
    },
  });

  return readableStreamToUint8Array(stream);
}
