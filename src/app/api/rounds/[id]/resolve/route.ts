import { NextResponse } from "next/server";
import { getRoundById } from "@/lib/rounds";
import { getGameState, resolveRound } from "@/lib/game-state";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const round = getRoundById(id);

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const state = getGameState();
  if (state.roundStatus === "resolved") {
    return NextResponse.json({ error: "Round already resolved" }, { status: 400 });
  }

  const success = resolveRound(round.correctOutcome);
  if (!success) {
    return NextResponse.json({ error: "Failed to resolve round" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    winningOption: round.correctOutcome,
    winningLabel: round.options[round.correctOutcome].label,
  });
}
