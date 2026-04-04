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
