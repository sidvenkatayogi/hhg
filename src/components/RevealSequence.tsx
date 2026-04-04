"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

interface RevealSequenceProps {
  winningOption: number | null;
  options: Array<{ index: number; label: string }>;
  userBet: number | null;
  totalPot: number;
  betTotals: number[];
  userWager: number;
  onClaim: () => void;
}

export default function RevealSequence({
  winningOption,
  options,
  userBet,
  totalPot,
  betTotals,
  userWager,
  onClaim,
}: RevealSequenceProps) {
  const [phase, setPhase] = useState<"revealing" | "result">("revealing");
  const [claimed, setClaimed] = useState(false);

  const isWinner = userBet !== null && winningOption !== null && userBet === winningOption;
  const winnings =
    isWinner && winningOption !== null && betTotals[winningOption] > 0
      ? (userWager / betTotals[winningOption]) * totalPot
      : 0;

  useEffect(() => {
    if (winningOption === null) {
      setPhase("revealing");
      return;
    }

    // Short delay then show result
    const timer = setTimeout(() => {
      setPhase("result");

      if (isWinner) {
        // Goose confetti
        const end = Date.now() + 2000;
        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ["#FF6B00", "#FFD700", "#00FF88"],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ["#FF6B00", "#FFD700", "#00FF88"],
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [winningOption, isWinner]);

  if (winningOption === null || phase === "revealing") {
    return (
      <div className="text-center py-8">
        <div className="text-3xl font-display text-primary animate-pulse">
          REVEALING...
        </div>
        <div className="text-muted mt-2">The goose has decided its fate.</div>
      </div>
    );
  }

  const winningLabel = options.find((o) => o.index === winningOption)?.label || "???";

  return (
    <div className="text-center py-6 space-y-4 animate-shake">
      {/* Winning option */}
      <div className="bg-secondary/20 border-2 border-secondary rounded-xl p-6 glow-gold">
        <div className="text-muted text-sm mb-1">THE GOOSE CHOSE:</div>
        <div className="text-2xl md:text-3xl font-bold text-secondary">
          {winningLabel}
        </div>
      </div>

      {/* User result */}
      {userBet !== null ? (
        isWinner ? (
          <div className="space-y-3">
            <div className="text-2xl font-display text-success">
              THE GOOSE GODS SMILE UPON YOU 🪿
            </div>
            <div className="text-xl text-success font-bold">
              YOU WON {winnings.toFixed(2)} SOL
            </div>
            {!claimed && (
              <button
                onClick={() => {
                  setClaimed(true);
                  onClaim();
                }}
                className="bg-success text-background font-bold px-8 py-3 rounded-xl text-lg hover:bg-success/80 transition-colors glow-green"
              >
                CLAIM WINNINGS 🪿
              </button>
            )}
            {claimed && (
              <div className="text-success font-bold">Winnings claimed!</div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-2xl font-display text-danger">
              REKT BY A GOOSE 🪿
            </div>
            <div className="text-muted">tale as old as time.</div>
          </div>
        )
      ) : (
        <div className="text-muted">You didn&apos;t bet this round. Bold strategy.</div>
      )}

      {/* Next round countdown */}
      <div className="text-muted text-sm mt-4 animate-pulse">
        Next round starting soon...
      </div>
    </div>
  );
}
