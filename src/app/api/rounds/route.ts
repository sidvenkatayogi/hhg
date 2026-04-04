import { NextResponse } from "next/server";
import { getAllRounds } from "@/lib/rounds";

export async function GET() {
  const rounds = getAllRounds().map(({ setupPrompt, revealPrompt, ...r }) => r);
  return NextResponse.json({ rounds });
}
