import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/game-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const leaderboard = getLeaderboard();
  return NextResponse.json({ leaderboard });
}
