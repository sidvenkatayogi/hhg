import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory nonce store — sufficient for Vercel serverless per-instance lifetime.
// In production you'd use a KV store, but for Goose Bets this is fine.
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

// Cleanup expired nonces periodically
function cleanupNonces() {
  const now = Date.now();
  for (const [key, value] of nonceStore) {
    if (value.expiresAt < now) {
      nonceStore.delete(key);
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

  cleanupNonces();

  // Generate a cryptographically random nonce
  const nonceBytes = new Uint8Array(32);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expiresAt = Date.now() + 60_000; // 60 second expiry

  nonceStore.set(pubkey, { nonce, expiresAt });

  return NextResponse.json({ nonce, expiresAt });
}

// Export for use by the verify route (same serverless instance)
export function consumeNonce(pubkey: string, nonce: string): boolean {
  const stored = nonceStore.get(pubkey);
  if (!stored) return false;
  if (stored.nonce !== nonce) return false;
  if (stored.expiresAt < Date.now()) {
    nonceStore.delete(pubkey);
    return false;
  }
  nonceStore.delete(pubkey); // One-time use
  return true;
}
