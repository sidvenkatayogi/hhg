"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";
import { recordBet } from "@/lib/api";

// Deterministic "house" wallet derived from a fixed seed — just a devnet SOL sink
const POOL_WALLET = Keypair.fromSeed(
  new Uint8Array(32).fill(0).map((_, i) => (i * 7 + 13) % 256)
).publicKey;

interface BettingOption {
  index: number;
  label: string;
}

interface BettingPanelProps {
  options: BettingOption[];
  betTotals: number[];
  roundId: string;
  disabled: boolean;
  userBet: number | null;
  totalPot: number;
  honkLocked?: boolean;
}

const OPTION_COLORS = [
  { bg: "bg-primary/20", border: "border-primary", bar: "bg-primary", text: "text-primary" },
  { bg: "bg-blue-500/20", border: "border-blue-500", bar: "bg-blue-500", text: "text-blue-500" },
  { bg: "bg-purple-500/20", border: "border-purple-500", bar: "bg-purple-500", text: "text-purple-500" },
  { bg: "bg-pink-500/20", border: "border-pink-500", bar: "bg-pink-500", text: "text-pink-500" },
];

export default function BettingPanel({
  options,
  betTotals,
  roundId,
  disabled,
  userBet,
  totalPot,
  honkLocked = false,
}: BettingPanelProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [wager, setWager] = useState("0.1");
  const [placing, setPlacing] = useState(false);
  const [honkFlash, setHonkFlash] = useState(false);

  const hasBet = userBet !== null;

  const handlePlaceBet = useCallback(async () => {
    if (!publicKey || selectedOption === null || placing || hasBet) return;

    const amount = parseFloat(wager);
    if (isNaN(amount) || amount < 0.01) return;

    setPlacing(true);
    try {
      // On-chain transfer to the pool wallet
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: POOL_WALLET,
          lamports: Math.round(amount * LAMPORTS_PER_SOL),
        })
      );

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      // Record the bet server-side
      await recordBet(publicKey.toBase58(), roundId, selectedOption, amount);

      setHonkFlash(true);
      setTimeout(() => setHonkFlash(false), 1500);
    } catch (err) {
      console.error("Bet failed:", err);
    } finally {
      setPlacing(false);
    }
  }, [publicKey, selectedOption, wager, placing, hasBet, roundId, sendTransaction, connection]);

  // Calculate percentages and implied odds
  const percentages = options.map((_, i) =>
    totalPot > 0 ? (betTotals[i] / totalPot) * 100 : 0
  );
  const impliedOdds = options.map((_, i) =>
    betTotals[i] > 0 ? totalPot / betTotals[i] : 0
  );

  return (
    <div className="space-y-4">
      {/* HONK flash overlay */}
      {honkFlash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-6xl md:text-8xl font-display text-primary animate-ping">
            HONK!
          </div>
        </div>
      )}

      {/* Combined odds bar */}
      {totalPot > 0 && (
        <div className="space-y-2">
          <div className="flex rounded-lg overflow-hidden h-8">
            {options.map((opt, i) => {
              const pct = percentages[i];
              if (pct === 0) return null;
              const color = OPTION_COLORS[i % OPTION_COLORS.length];
              return (
                <div
                  key={opt.index}
                  className={`${color.bar} flex items-center justify-center transition-all duration-700 ease-out relative overflow-hidden`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                >
                  {pct >= 12 && (
                    <span className="text-xs font-bold text-white drop-shadow truncate px-1">
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {options.map((opt, i) => {
              const color = OPTION_COLORS[i % OPTION_COLORS.length];
              return (
                <div key={opt.index} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-2.5 h-2.5 rounded-sm ${color.bar}`} />
                  <span className="text-muted truncate max-w-[120px]">{opt.label.replace(/^\S+\s/, '')}</span>
                  <span className={`font-bold ${color.text}`}>{percentages[i].toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Option cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => {
          const isSelected = selectedOption === opt.index;
          const isUserBet = userBet === opt.index;
          const isDisabled = disabled || hasBet;
          const pct = percentages[i];
          const odds = impliedOdds[i];
          const color = OPTION_COLORS[i % OPTION_COLORS.length];

          return (
            <button
              key={opt.index}
              onClick={() => !isDisabled && setSelectedOption(opt.index)}
              disabled={isDisabled}
              className={`relative p-4 rounded-xl border-2 transition-all text-left overflow-hidden ${
                isUserBet
                  ? "border-success bg-success/10 glow-green"
                  : isSelected
                  ? `${color.border} ${color.bg} glow-orange`
                  : "border-white/10 bg-surface hover:border-white/30"
              } ${isDisabled && !isUserBet ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* Background fill bar */}
              <div
                className={`absolute inset-y-0 left-0 ${color.bar} opacity-10 transition-all duration-700 ease-out`}
                style={{ width: `${pct}%` }}
              />

              <div className="relative z-10">
                <div className="text-sm md:text-base font-bold mb-2 text-white">{opt.label.replace(/^\S+\s/, '')}</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-white/80">
                    {betTotals[opt.index]?.toFixed(2) || "0.00"} SOL
                  </div>
                  <div className="flex items-center gap-2">
                    {totalPot > 0 && (
                      <span className={`text-xs font-bold ${color.text}`}>
                        {pct.toFixed(0)}%
                      </span>
                    )}
                    {odds > 0 && (
                      <span className="text-xs text-secondary font-mono">
                        {odds.toFixed(1)}x
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isUserBet && (
                <div className="absolute top-2 right-2 text-success text-xs font-bold z-10">
                  YOUR BET
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Wager input & place bet */}
      {!hasBet && !disabled && (
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              className="w-full rounded-lg px-4 py-3 text-white focus:outline-none"
              style={{ background: 'rgba(56,34,16,0.45)', border: '1px solid rgba(56,34,16,0.6)' }}
              placeholder="0.1"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">
              SOL
            </span>
          </div>
          <button
            onClick={handlePlaceBet}
            disabled={!publicKey || selectedOption === null || placing}
            className="font-bold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
            style={{background: 'rgb(228, 171, 85)', color: 'rgb(56, 34, 16)'}}
          >
            {placing ? "HONKING..." : "PLACE BET"}
          </button>
        </div>
      )}

      {hasBet && (
        <div className="text-center py-2 text-success font-bold text-lg">
          HONK! Your bet is locked in.
        </div>
      )}

      {disabled && !hasBet && !honkLocked && (
        <div className="text-center py-2 text-danger font-bold text-lg">
          BETTING CLOSED
        </div>
      )}

      {disabled && !hasBet && honkLocked && (
        <div className="text-center py-2 text-primary font-bold text-sm">
          HONK-IN REQUIRED — Authenticate your goose vocalization to place bets.
        </div>
      )}
    </div>
  );
}
