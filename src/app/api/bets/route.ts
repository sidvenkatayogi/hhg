import { NextResponse } from "next/server";
import { placeBet } from "@/lib/game-state";

export async function POST(request: Request) {
  const body = await request.json();
  const { pubkey, roundId, option, amount } = body;

  if (!pubkey || option === undefined || !amount || !roundId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const success = placeBet(pubkey, option, amount);

  if (!success) {
    return NextResponse.json(
      { error: "Bet failed. Betting may be closed or you already bet this round." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
