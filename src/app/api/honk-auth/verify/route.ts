import { NextResponse } from "next/server";
import { HONK_PASS_THRESHOLD } from "@/lib/honk-types";

export const dynamic = "force-dynamic";

// Honk-OTP verification endpoint.
// The client performs DSP comparison locally and submits the result for
// server-side audit logging and validation.

export async function POST(request: Request) {
  const body = await request.json();
  const {
    pubkey,
    seedHonkId,
    matchScore,
    frequencyMatch,
    amplitudeMatch,
    aggressionMatch,
    tier,
    antiImpersonation,
  } = body;

  if (!pubkey || !seedHonkId || typeof matchScore !== "number" || !tier) {
    return NextResponse.json(
      { error: "Missing required fields: pubkey, seedHonkId, matchScore, tier" },
      { status: 400 }
    );
  }

  // Validate tier
  const validTiers = ["apex", "compliant", "gosling"];
  if (!validTiers.includes(tier)) {
    return NextResponse.json(
      { error: "Invalid tier. Locked accounts cannot authenticate." },
      { status: 403 }
    );
  }

  // Validate match threshold
  if (matchScore < HONK_PASS_THRESHOLD) {
    return NextResponse.json(
      {
        error:
          "Insufficient Honk-OTP match score. Waterfowl Handshake Protocol denied.",
      },
      { status: 401 }
    );
  }

  // Check anti-impersonation flags
  if (antiImpersonation?.isHumanMouth || antiImpersonation?.isMallard) {
    return NextResponse.json(
      {
        error: antiImpersonation.isHumanMouth
          ? "Human impersonation detected. You are not a goose."
          : "Mallard interference detected. Canada Goose protocol only.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    pubkey,
    tier,
    seedHonkId,
    matchScore,
    frequencyMatch,
    amplitudeMatch,
    aggressionMatch,
    authenticatedAt: Date.now(),
    message:
      tier === "apex"
        ? "DOMINANT GANDER authenticated. Full access granted. V-formation initiated."
        : tier === "compliant"
        ? "Standard Goose authenticated. Access granted."
        : "Gosling (Probationary) authenticated. Limited access.",
  });
}
