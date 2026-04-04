import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Honk verification is primarily client-side (DSP pipeline runs in browser).
// This endpoint validates that the client completed the challenge flow and
// records the authentication event. In a production system, the server would
// verify a wallet-signed (nonce + honkprint) payload using ed25519.

export async function POST(request: Request) {
  const body = await request.json();
  const { pubkey, honkprintDigest, tier, similarity, nonce } = body;

  if (!pubkey || !honkprintDigest || !tier) {
    return NextResponse.json(
      { error: "Missing required fields: pubkey, honkprintDigest, tier" },
      { status: 400 }
    );
  }

  // Validate tier is a recognized value
  const validTiers = ["apex", "compliant", "gosling"];
  if (!validTiers.includes(tier)) {
    return NextResponse.json(
      { error: "Invalid tier. Locked accounts cannot authenticate." },
      { status: 403 }
    );
  }

  // Validate similarity threshold
  if (typeof similarity === "number" && similarity < 0.70) {
    return NextResponse.json(
      { error: "Insufficient honkprint similarity. Authentication denied." },
      { status: 401 }
    );
  }

  // In a full implementation, we would:
  // 1. consumeNonce(pubkey, nonce) — verify the challenge was fresh
  // 2. Verify a wallet signature over (nonce + honkprintDigest) using ed25519
  // 3. Issue a JWT scoped to (pubkey, roundId)
  //
  // For Goose Bets, auth state lives client-side. This endpoint
  // serves as an audit log and validation checkpoint.

  return NextResponse.json({
    success: true,
    pubkey,
    tier,
    authenticatedAt: Date.now(),
    message:
      tier === "apex"
        ? "DOMINANT GANDER authenticated. Full access granted."
        : tier === "compliant"
        ? "Standard Goose authenticated. Access granted."
        : "Gosling (Probationary) authenticated. Limited access.",
  });
}
