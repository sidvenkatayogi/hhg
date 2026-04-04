import { getAllRounds, type Round } from "./rounds";

export type RoundStatus = "betting" | "countdown" | "revealing" | "resolved";

export interface UserBetInfo {
  pubkey: string;
  option: number;
  amount: number; // in SOL
  roundId: string;
}

export interface GameState {
  currentRoundIndex: number;
  roundStatus: RoundStatus;
  bettingEndsAt: number; // Unix timestamp ms
  roundStartedAt: number;
  bets: Record<string, UserBetInfo>; // pubkey -> bet info for current round
  betTotals: number[]; // total SOL per option
  totalPot: number;
  leaderboard: Record<string, number>; // pubkey -> total winnings in SOL
  winningOption: number | null;
}

const BETTING_DURATION_MS = 60_000; // 60 seconds
const REVEAL_DURATION_MS = 15_000; // 15 seconds before next round

let gameState: GameState | null = null;

function createInitialState(): GameState {
  const rounds = getAllRounds();
  const now = Date.now();
  return {
    currentRoundIndex: 0,
    roundStatus: "betting",
    bettingEndsAt: now + BETTING_DURATION_MS,
    roundStartedAt: now,
    bets: {},
    betTotals: new Array(rounds[0]?.options.length ?? 4).fill(0),
    totalPot: 0,
    leaderboard: {},
    winningOption: null,
  };
}

export function getGameState(): GameState {
  if (!gameState) {
    gameState = createInitialState();
  }

  // Auto-advance logic
  const now = Date.now();

  if (gameState.roundStatus === "betting" && now >= gameState.bettingEndsAt) {
    gameState.roundStatus = "revealing";
  }

  return gameState;
}

export function getCurrentRound(): Round | undefined {
  const state = getGameState();
  const rounds = getAllRounds();
  return rounds[state.currentRoundIndex];
}

export function placeBet(pubkey: string, option: number, amount: number): boolean {
  const state = getGameState();

  if (state.roundStatus !== "betting") return false;
  if (Date.now() >= state.bettingEndsAt) return false;
  if (state.bets[pubkey]) return false; // already bet this round

  const round = getCurrentRound();
  if (!round || option < 0 || option >= round.options.length) return false;

  state.bets[pubkey] = {
    pubkey,
    option,
    amount,
    roundId: round.id,
  };
  state.betTotals[option] += amount;
  state.totalPot += amount;

  return true;
}

export function resolveRound(winningOption: number): boolean {
  const state = getGameState();
  if (state.roundStatus === "resolved") return false;

  const round = getCurrentRound();
  if (!round || winningOption < 0 || winningOption >= round.options.length) return false;

  state.roundStatus = "resolved";
  state.winningOption = winningOption;

  // Calculate winnings
  const winningTotal = state.betTotals[winningOption];
  if (winningTotal > 0) {
    for (const bet of Object.values(state.bets)) {
      if (bet.option === winningOption) {
        const share = (bet.amount / winningTotal) * state.totalPot;
        state.leaderboard[bet.pubkey] = (state.leaderboard[bet.pubkey] || 0) + share;
      }
    }
  }

  // Schedule auto-advance
  setTimeout(() => {
    advanceRound();
  }, REVEAL_DURATION_MS);

  return true;
}

export function advanceRound(): void {
  const state = getGameState();
  const rounds = getAllRounds();
  const nextIndex = (state.currentRoundIndex + 1) % rounds.length;
  const nextRound = rounds[nextIndex];
  const now = Date.now();

  state.currentRoundIndex = nextIndex;
  state.roundStatus = "betting";
  state.bettingEndsAt = now + BETTING_DURATION_MS;
  state.roundStartedAt = now;
  state.bets = {};
  state.betTotals = new Array(nextRound?.options.length ?? 4).fill(0);
  state.totalPot = 0;
  state.winningOption = null;
}

export function getLeaderboard(): Array<{ pubkey: string; totalWon: number }> {
  const state = getGameState();
  return Object.entries(state.leaderboard)
    .map(([pubkey, totalWon]) => ({ pubkey, totalWon }))
    .sort((a, b) => b.totalWon - a.totalWon)
    .slice(0, 10);
}

export function getStats() {
  const state = getGameState();
  const totalBets = Object.keys(state.bets).length;
  return {
    totalVolume: state.totalPot,
    totalBets,
    roundsPlayed: state.currentRoundIndex,
  };
}
