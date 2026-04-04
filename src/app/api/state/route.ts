import { NextResponse } from "next/server";
import { getGameState, getCurrentRound } from "@/lib/game-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getGameState();
  const round = getCurrentRound();

  if (!round) {
    return NextResponse.json({
      round: null,
      status: "betting",
      bettingEndsAt: 0,
      secondsRemaining: 0,
      betTotals: [],
      totalPot: 0,
      winningOption: null,
    });
  }

  const { setupPrompt, revealPrompt, correctOutcome, ...roundData } = round;

  return NextResponse.json({
    round: roundData,
    status: state.roundStatus,
    bettingEndsAt: state.bettingEndsAt,
    secondsRemaining: Math.max(0, Math.ceil((state.bettingEndsAt - Date.now()) / 1000)),
    betTotals: state.betTotals,
    totalPot: state.totalPot,
    winningOption: state.winningOption,
  });
}
