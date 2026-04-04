import { getAllRounds, type Round } from "./rounds";

export type RoundStatus = "betting" | "revealing" | "resolved";

export interface GameState {
  currentRoundIndex: number;
  roundStatus: RoundStatus;
  bettingEndsAt: number;
  roundStartedAt: number;
  betTotals: number[];
  totalPot: number;
  leaderboard: Array<{ pubkey: string; totalWon: number }>;
  winningOption: number | null;
}

// ── Timing constants ──
const BETTING_DURATION_S = 60;
const REVEAL_DURATION_S = 15;
const ROUND_DURATION_S = BETTING_DURATION_S + REVEAL_DURATION_S; // 75s per round

// Fixed epoch — all instances agree on when "round 0" started.
// Set to a recent past time so rounds are already cycling.
// Using midnight UTC Apr 1 2025 as an arbitrary anchor.
const EPOCH_MS = new Date("2025-04-01T00:00:00Z").getTime();

// ── Mock wallets ──
const MOCK_WALLETS = [
  "H0nkM4ster69420xDeGenGoose111111111111",
  "G00seWh1sper3r42069xSolBets11111111111",
  "QuAcKlOrD99xDev1l1shG00se111111111111",
  "W4terF0wlW4ger5xPr0Degen1111111111111",
  "B1rdBra1nBets88xH0nkH0nk111111111111",
  "F34therF1nance777xG00seG0d1111111111",
  "P0ndPr0f1t5xW1ngM4n42069111111111111",
  "H0nkZ0neVIP69xB1gB1rdBets1111111111",
  "G00seJu1ce420xD3g3nDuck11111111111111",
  "N3stEgg99xF0wlPl4yBets111111111111111",
  "W4ddl3W4ll3t55xG00seBoss1111111111111",
  "B34kBr34k3r77xH0nkSt0nks111111111111",
];

// ── Seeded random (deterministic per-round) ──
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ── Generate deterministic mock bets for a round ──
function generateMockBets(
  roundIndex: number,
  optionsCount: number,
  correctOutcome: number,
  elapsedS: number
): { betTotals: number[]; totalPot: number } {
  const rng = seededRandom(roundIndex * 9999 + 42);
  const betTotals = new Array(optionsCount).fill(0);
  let totalPot = 0;

  // Each bot "arrives" at a deterministic time in the betting window
  for (let i = 0; i < MOCK_WALLETS.length; i++) {
    const arriveAt = 3 + rng() * (BETTING_DURATION_S - 5); // arrive between 3s and 55s
    if (elapsedS < arriveAt) continue; // hasn't arrived yet

    // Pick option — 40% correct, 60% random
    const option = rng() < 0.4 ? correctOutcome : Math.floor(rng() * optionsCount);
    // Wager 0.05–2.0 SOL
    const amount = Math.round((0.05 + rng() * 1.95) * 100) / 100;

    betTotals[option] += amount;
    totalPot += amount;
  }

  // Round to 2 decimals
  for (let i = 0; i < betTotals.length; i++) {
    betTotals[i] = Math.round(betTotals[i] * 100) / 100;
  }
  totalPot = Math.round(totalPot * 100) / 100;

  return { betTotals, totalPot };
}

// ── Generate deterministic leaderboard ──
function generateLeaderboard(): Array<{ pubkey: string; totalWon: number }> {
  const rng = seededRandom(1337);
  return MOCK_WALLETS.slice(0, 7)
    .map((pubkey) => ({
      pubkey,
      totalWon: Math.round((1 + rng() * 14) * 100) / 100,
    }))
    .sort((a, b) => b.totalWon - a.totalWon);
}

// ── Core: compute game state from current time ──
export function getGameState(): GameState {
  const now = Date.now();
  const rounds = getAllRounds();
  const roundCount = rounds.length;

  const elapsedSinceEpochS = (now - EPOCH_MS) / 1000;
  const totalRoundsPassed = Math.floor(elapsedSinceEpochS / ROUND_DURATION_S);
  const currentRoundIndex = totalRoundsPassed % roundCount;
  const round = rounds[currentRoundIndex];

  const roundStartMs = EPOCH_MS + totalRoundsPassed * ROUND_DURATION_S * 1000;
  const bettingEndsMs = roundStartMs + BETTING_DURATION_S * 1000;
  const elapsedInRoundS = (now - roundStartMs) / 1000;

  let roundStatus: RoundStatus;
  let winningOption: number | null = null;

  if (elapsedInRoundS < BETTING_DURATION_S) {
    roundStatus = "betting";
  } else if (elapsedInRoundS < ROUND_DURATION_S) {
    roundStatus = "resolved";
    winningOption = round.correctOutcome;
  } else {
    roundStatus = "betting";
  }

  // Mock bets — grow over the betting period, freeze at close
  const betElapsed = Math.min(elapsedInRoundS, BETTING_DURATION_S);
  const { betTotals, totalPot } = generateMockBets(
    totalRoundsPassed,
    round.options.length,
    round.correctOutcome,
    betElapsed
  );

  return {
    currentRoundIndex,
    roundStatus,
    bettingEndsAt: bettingEndsMs,
    roundStartedAt: roundStartMs,
    betTotals,
    totalPot,
    leaderboard: generateLeaderboard(),
    winningOption,
  };
}

export function getCurrentRound(): Round | undefined {
  const state = getGameState();
  const rounds = getAllRounds();
  return rounds[state.currentRoundIndex];
}

export function getLeaderboard(): Array<{ pubkey: string; totalWon: number }> {
  return getGameState().leaderboard;
}

export function getStats() {
  const state = getGameState();
  return {
    totalVolume: state.totalPot,
    totalBets: MOCK_WALLETS.length,
    roundsPlayed: state.currentRoundIndex,
  };
}
