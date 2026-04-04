import fs from "fs";
import path from "path";

function loadRounds(): Round[] {
  const filePath = path.join(process.cwd(), "data", "rounds.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return data.rounds;
}

let cachedRounds: Round[] | null = null;

export interface RoundOption {
  index: number;
  label: string;
}

export interface Round {
  id: string;
  title: string;
  description: string;
  setupVideo: string;
  revealVideo: string;
  options: RoundOption[];
  correctOutcome: number;
  setupPrompt: string;
  revealPrompt: string;
}

export interface RoundsData {
  rounds: Round[];
}

export function getAllRounds(): Round[] {
  if (!cachedRounds) {
    cachedRounds = loadRounds();
  }
  return cachedRounds;
}

export function getRoundById(id: string): Round | undefined {
  return getAllRounds().find((r) => r.id === id);
}

export function getRoundByIndex(index: number): Round | undefined {
  return getAllRounds()[index];
}

export function getRoundCount(): number {
  return getAllRounds().length;
}
