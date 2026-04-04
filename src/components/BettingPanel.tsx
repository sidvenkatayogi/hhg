"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { recordBet } from "@/lib/api";

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
}

export default function BettingPanel({
  options,
  betTotals,
  roundId,
  disabled,
  userBet,
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
      // Send SOL to a "pool" address (in a real app this would be the PDA)
      // For the hackathon demo, we send to a dummy address and track in server state
      const poolAddress = new PublicKey("11111111111111111111111111111111");
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: poolAddress,
          lamports: Math.round(amount * LAMPORTS_PER_SOL),
        })
      );

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      // Record bet in server state
      await recordBet(publicKey.toBase58(), roundId, selectedOption, amount);

      // HONK flash
      setHonkFlash(true);
      setTimeout(() => setHonkFlash(false), 1500);
    } catch (err) {
      console.error("Bet failed:", err);
    } finally {
      setPlacing(false);
    }
  }, [publicKey, selectedOption, wager, placing, hasBet, roundId, sendTransaction, connection]);

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

      {/* Option cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = selectedOption === opt.index;
          const isUserBet = userBet === opt.index;
          const isDisabled = disabled || hasBet;

          return (
            <button
              key={opt.index}
              onClick={() => !isDisabled && setSelectedOption(opt.index)}
              disabled={isDisabled}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                isUserBet
                  ? "border-success bg-success/10 glow-green"
                  : isSelected
                  ? "border-primary bg-primary/10 glow-orange"
                  : "border-white/10 bg-surface hover:border-white/30"
              } ${isDisabled && !isUserBet ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="text-sm md:text-base font-bold mb-2">{opt.label}</div>
              <div className="text-xs text-muted">
                {betTotals[opt.index]?.toFixed(2) || "0.00"} SOL
              </div>
              {isUserBet && (
                <div className="absolute top-2 right-2 text-success text-xs font-bold">
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
              className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-foreground focus:border-primary focus:outline-none"
              placeholder="0.1"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">
              SOL
            </span>
          </div>
          <button
            onClick={handlePlaceBet}
            disabled={!publicKey || selectedOption === null || placing}
            className="bg-primary text-white font-bold px-6 py-3 rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow"
          >
            {placing ? "HONKING..." : "PLACE BET 🪿"}
          </button>
        </div>
      )}

      {hasBet && (
        <div className="text-center py-2 text-success font-bold text-lg">
          HONK! Your bet is locked in. 🪿
        </div>
      )}

      {disabled && !hasBet && (
        <div className="text-center py-2 text-danger font-bold text-lg">
          BETTING CLOSED
        </div>
      )}
    </div>
  );
}
