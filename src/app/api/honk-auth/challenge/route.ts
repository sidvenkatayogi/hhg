import { NextResponse } from "next/server";
import { generateSeedHonkPcm } from "@/lib/elevenlabs-seed-honk";
import { generateSeedHonkParams } from "@/lib/seed-honk";
import type { HonkChallengeResponse, SeedHonkParams } from "@/lib/honk-types";

export const dynamic = "force-dynamic";

// In-memory store for seed honk challenges, keyed by pubkey.
const challengeStore = new Map<
  string,
  { params: SeedHonkParams; expiresAt: number }
>();

function cleanupExpired() {
  const now = Date.now();
  for (const [key, value] of challengeStore) {
    if (value.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pubkey = searchParams.get("pubkey");

  if (!pubkey) {
    return NextResponse.json(
      { error: "Missing pubkey parameter" },
      { status: 400 }
    );
  }

  cleanupExpired();

  const params = generateSeedHonkParams();

  challengeStore.set(pubkey, {
    params,
    expiresAt: params.expiresAt,
  });

  const body: HonkChallengeResponse = {
    seedHonk: params,
    expiresAt: params.expiresAt,
  };

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (apiKey && voiceId) {
    try {
      const pcm = await generateSeedHonkPcm(params, voiceId, apiKey);
      body.seedAudioPcmBase64 = Buffer.from(pcm).toString("base64");
      body.seedAudioSampleRate = 44100;
    } catch (e) {
      console.error("[honk-auth/challenge] ElevenLabs TTS failed:", e);
    }
  }

  return NextResponse.json(body);
}

// Validate that a seed honk challenge was issued and is still fresh
export function consumeChallenge(
  pubkey: string,
  seedHonkId: string
): SeedHonkParams | null {
  const stored = challengeStore.get(pubkey);
  if (!stored) return null;
  if (stored.params.id !== seedHonkId) return null;
  if (stored.expiresAt < Date.now()) {
    challengeStore.delete(pubkey);
    return null;
  }
  challengeStore.delete(pubkey); // One-time use
  return stored.params;
}
