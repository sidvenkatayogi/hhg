import { NextResponse } from "next/server";
import { getRoundById } from "@/lib/rounds";
import { getGameState } from "@/lib/game-state";

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

  return NextResponse.json({
    success: true,
    winningOption: state.winningOption ?? round.correctOutcome,
    winningLabel: round.options[round.correctOutcome].label,
  });
}
