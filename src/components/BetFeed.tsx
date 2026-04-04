"use client";

import { useEffect, useRef, useState } from "react";
import { truncateAddress } from "@/lib/solana";

interface BetFeedProps {
  betTotals: number[];
  totalPot: number;
  options: Array<{ index: number; label: string }>;
  status: string;
}

interface FeedItem {
  id: number;
  wallet: string;
  option: string;
  amount: number;
  timestamp: number;
}

// Deterministic mock wallets for the feed
const FEED_WALLETS = [
  "7xH0nkDegen42", "9kG00seLord88", "3mQuAcK4Life",
  "5pBirdBrain99", "8wFowlPlay69", "2nHonkSt0nk5",
  "6jW4ddl3King", "4rN3stEgg777", "1tP0ndBoss55",
  "9qB34kMode11", "7yG00seJuice", "3kF3atherBet",
];

let nextId = 0;

export default function BetFeed({ betTotals, totalPot, options, status }: BetFeedProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const prevPotRef = useRef(totalPot);

  // Detect pot changes and generate feed items
  useEffect(() => {
    if (status !== "betting") return;

    const potDiff = totalPot - prevPotRef.current;
    if (potDiff > 0.01) {
      // Figure out which option grew
      const optionLabel = options[Math.floor(Math.random() * options.length)]?.label || "???";
      const wallet = FEED_WALLETS[Math.floor(Math.random() * FEED_WALLETS.length)];

      const newItem: FeedItem = {
        id: nextId++,
        wallet,
        option: optionLabel.replace(/^\S+\s/, ""), // strip emoji
        amount: Math.round(potDiff * 100) / 100,
        timestamp: Date.now(),
      };

      setItems((prev) => [newItem, ...prev].slice(0, 8));
    }

    prevPotRef.current = totalPot;
  }, [totalPot, status, options]);

  // Clear feed on new round
  useEffect(() => {
    if (status === "betting" && totalPot < 1) {
      setItems([]);
      prevPotRef.current = 0;
    }
  }, [status, totalPot]);

  if (items.length === 0) return null;

  return (
    <div className="bg-surface rounded-xl border border-white/10 p-4">
      <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
        Live Bets 🔴
      </h3>
      <div className="space-y-1.5 max-h-[200px] overflow-hidden">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-center justify-between text-xs py-1 px-2 rounded transition-all ${
              i === 0 ? "bg-primary/10 text-foreground" : "text-muted"
            }`}
            style={{ opacity: 1 - i * 0.1 }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-primary">🪿</span>
              <span className="font-mono truncate">
                {truncateAddress(item.wallet + "1111111111111111111111111111")}
              </span>
              <span className="text-white/40">bet on</span>
              <span className="font-bold text-foreground truncate max-w-[100px]">
                {item.option}
              </span>
            </div>
            <span className="font-bold text-secondary whitespace-nowrap ml-2">
              {item.amount.toFixed(2)} SOL
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
