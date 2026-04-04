import { NextResponse } from "next/server";
import { getGameState, getCurrentRound } from "@/lib/game-state";

export async function GET() {
  const state = getGameState();
  const round = getCurrentRound();

  if (!round) {
    return NextResponse.json({ error: "No active round" }, { status: 404 });
  }

  const { setupPrompt, revealPrompt, ...roundData } = round;

  return NextResponse.json({
    round: roundData,
    status: state.roundStatus,
    bettingEndsAt: state.bettingEndsAt,
    secondsRemaining: Math.max(0, Math.ceil((state.bettingEndsAt - Date.now()) / 1000)),
  });
}
