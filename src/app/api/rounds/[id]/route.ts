import { NextResponse } from "next/server";
import { getRoundById } from "@/lib/rounds";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const round = getRoundById(id);

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const { setupPrompt, revealPrompt, ...roundData } = round;
  return NextResponse.json(roundData);
}
