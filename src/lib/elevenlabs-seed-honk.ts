// ── ElevenLabs TTS: server-only seed honk generation ──
// Uses @elevenlabs/elevenlabs-js. Requires ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID.
//
// Audio root: POST to ElevenLabs text-to-speech with the string from buildHonkTtsText().
// That text is the full "prompt" (natural-language direction + onomatopoeia). Without
// API keys, the client falls back to Web Audio synthesis in seed-honk.ts instead.

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

/**
 * TTS "prompt": bracketed performance directions + deep honk onomatopoeia.
 * ElevenLabs interprets the style tags loosely; variety from challenge id + voice settings.
 */
export function buildHonkTtsText(params: SeedHonkParams): string {
  const hex = params.id.replace(/-/g, "");
  const n = parseInt(hex.slice(0, 8), 16);
  const deep = params.fundamentalHz < 240 ? "extra deep chest resonance" : "deep throaty";

  const lines = [
    `[Very loud, ${deep}, aggressive wild goose. Belting from the chest, not human speech.] HRRRRONK! ... [short breath] HONK! HONK!`,
    `[Massive Canada goose territorial call, maximum volume, gravel and air.] BWAAAHNK! Haaawnk! Hawnk!`,
    `[Low-pitched resonant honk, angry gander, open beak bellow.] HRRNK! HRRNK! Honk honk honk!`,
    `[Thunderous waterfowl blast, subwoofer rumble in the tone.] URRRRONK! ... honk!`,
    `[Deep guttural honk, slower, threatening.] Hoooonk. HOOONK!`,
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
      // Lower stability + higher style → rougher, more animal-like delivery
      stability: Math.max(0.12, 0.22 - (n % 40) / 200),
      similarityBoost: 0.5 + params.aggressionCoefficient * 0.28,
      style: 0.55 + params.aggressionCoefficient * 0.4,
      speed: Math.min(0.92, Math.max(0.68, 0.78 - (n % 30) / 200)),
    },
  });

  return readableStreamToUint8Array(stream);
}
