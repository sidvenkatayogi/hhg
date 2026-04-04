import { NextResponse } from "next/server";
import { getGameState } from "@/lib/game-state";

export async function POST(request: Request) {
  const body = await request.json();
  const { pubkey, option, amount, roundId } = body;

  if (!pubkey || option === undefined || !amount || !roundId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const state = getGameState();
  if (state.roundStatus !== "betting") {
    return NextResponse.json(
      { error: "Betting is closed for this round." },
      { status: 400 }
    );
  }

  // In deterministic mode, real user bets are accepted client-side.
  // The server just validates timing.
  return NextResponse.json({ success: true });
}
