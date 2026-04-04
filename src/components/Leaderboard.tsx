"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/api";
import { truncateAddress } from "@/lib/solana";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchLeaderboard();
        setEntries(data);
      } catch {
        // ignore
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const medals = ["🏆", "🥈", "🥉"];

  if (entries.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-display text-secondary mb-3">HALL OF HONK 🏆</h3>
        <p className="text-muted text-sm">
          No winners yet. The geese are resting. (They&apos;re plotting.)
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-white/10 p-6">
      <h3 className="text-lg font-display text-secondary mb-4">HALL OF HONK 🏆</h3>
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div
            key={entry.pubkey}
            className={`flex items-center justify-between py-2 px-3 rounded-lg ${
              i === 0 ? "bg-secondary/10 border border-secondary/30" : ""
            }`}
            style={i !== 0 ? { background: 'rgba(56, 34, 16, 0.35)' } : {}}
          >
            <div className="flex items-center gap-2">
              <span className="w-6 text-center text-white">
                {i < 3 ? medals[i] : `${i + 1}.`}
              </span>
              <span className="text-sm font-mono text-white">
                {truncateAddress(entry.pubkey)}
              </span>
            </div>
            <span className="font-bold text-sm text-secondary">
              {entry.totalWon.toFixed(2)} SOL
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
