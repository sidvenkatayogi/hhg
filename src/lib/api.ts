export interface ApiGameState {
  round: {
    id: string;
    title: string;
    description: string;
    setupVideo: string;
    revealVideo: string;
    options: Array<{ index: number; label: string }>;
  } | null;
  status: "betting" | "countdown" | "revealing" | "resolved";
  bettingEndsAt: number;
  secondsRemaining: number;
  betTotals: number[];
  totalPot: number;
  winningOption: number | null;
}

export interface LeaderboardEntry {
  pubkey: string;
  totalWon: number;
}

export async function fetchGameState(): Promise<ApiGameState> {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error("Failed to fetch game state");
  return res.json();
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch("/api/leaderboard");
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  const data = await res.json();
  return data.leaderboard;
}

export async function fetchStats(): Promise<{
  totalVolume: number;
  totalBets: number;
  roundsPlayed: number;
}> {
  const res = await fetch("/api/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function resolveRound(roundId: string): Promise<void> {
  const res = await fetch(`/api/rounds/${roundId}/resolve`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to resolve round");
}

export async function recordBet(
  pubkey: string,
  roundId: string,
  option: number,
  amount: number
): Promise<void> {
  const res = await fetch("/api/bets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pubkey, roundId, option, amount }),
  });
  if (!res.ok) throw new Error("Failed to record bet");
}

// ── Honk-in Auth API ──

export async function fetchHonkChallenge(
  pubkey: string
): Promise<{ nonce: string; expiresAt: number }> {
  const res = await fetch(`/api/honk-auth/challenge?pubkey=${encodeURIComponent(pubkey)}`);
  if (!res.ok) throw new Error("Failed to fetch honk challenge");
  return res.json();
}

export async function verifyHonkAuth(data: {
  pubkey: string;
  honkprintDigest: string;
  tier: string;
  similarity: number;
  nonce?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/honk-auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Honk authentication failed");
  }
  return res.json();
}
