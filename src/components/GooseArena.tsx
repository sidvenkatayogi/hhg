"use client";

import { useGameState } from "@/hooks/useGameState";
import { useBetting } from "@/hooks/useBetting";
import { useHonkAuth } from "./HonkAuthProvider";
import VideoPlayer from "./VideoPlayer";
import BettingPanel from "./BettingPanel";
import BetFeed from "./BetFeed";
import CountdownTimer from "./CountdownTimer";
import RevealSequence from "./RevealSequence";
import Leaderboard from "./Leaderboard";
import WalletConnect from "./WalletConnect";
import HonkTierBadge from "./HonkTierBadge";
import HonkAuthPrompt from "./HonkAuthPrompt";
import { useWallet } from "@solana/wallet-adapter-react";

export default function GooseArena() {
  const { state } = useGameState();
  const { getUserBet, getUserWager } = useBetting();
  const { isAuthenticated, tier } = useHonkAuth();
  const { publicKey } = useWallet();

  if (!state || !state.round) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-display text-primary animate-pulse">
          Summoning geese from the blockchain...
        </div>
      </div>
    );
  }

  const { round, status, bettingEndsAt, betTotals, totalPot, winningOption } =
    state;
  const userBet = getUserBet(round.id);
  const userWager = getUserWager(round.id);
  const isBettingOpen = status === "betting";
  const isRevealing = status === "resolved";

  // Honk auth gates betting — gosling tier is read-only
  const canBet = isAuthenticated && tier !== "gosling" && tier !== "locked";
  const needsHonkAuth = publicKey && !isAuthenticated;

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Header */}
      <header className="border-b border-white/10 bg-surface/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-display text-primary">
            GOOSE BETS 🪿
          </h1>
          <div className="flex items-center gap-3">
            <HonkTierBadge />
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Video player */}
        <VideoPlayer
          setupSrc={round.setupVideo}
          revealSrc={round.revealVideo}
          isRevealing={isRevealing}
        />

        {/* Round info */}
        <div className="text-center space-y-1">
          <h2 className="text-xl md:text-2xl font-bold">
            {round.title}
          </h2>
          <p className="text-muted">{round.description}</p>
          {isBettingOpen && (
            <p className="text-primary font-bold mt-2">
              What does the goose do next?
            </p>
          )}
        </div>

        {/* Countdown */}
        <CountdownTimer bettingEndsAt={bettingEndsAt} status={status} />

        {/* Pot display */}
        <div className="text-center">
          <span className="text-muted text-sm">Total Pot: </span>
          <span className="text-secondary font-bold text-lg">
            {totalPot.toFixed(2)} SOL
          </span>
        </div>

        {/* Honk-in auth prompt — shown when wallet connected but not honk-authenticated */}
        {needsHonkAuth && <HonkAuthPrompt />}

        {/* Gosling read-only notice */}
        {isAuthenticated && tier === "gosling" && (
          <div className="text-center py-2 px-4 bg-primary/10 border border-primary/30 rounded-lg">
            <span className="text-primary text-sm font-bold">
              GOSLING TIER — Read-only access. Honk louder to upgrade.
            </span>
          </div>
        )}

        {/* Betting or reveal */}
        {status === "resolved" ? (
          <RevealSequence
            winningOption={winningOption}
            options={round.options}
            userBet={userBet}
            totalPot={totalPot}
            betTotals={betTotals}
            userWager={userWager}
            onClaim={() => {
              console.log("Claiming winnings...");
            }}
          />
        ) : (
          <BettingPanel
            options={round.options}
            betTotals={betTotals}
            roundId={round.id}
            disabled={!isBettingOpen || !canBet}
            userBet={userBet}
            totalPot={totalPot}
            honkLocked={isBettingOpen && !canBet && !!publicKey}
          />
        )}

        {/* Live bet feed */}
        <BetFeed
          betTotals={betTotals}
          totalPot={totalPot}
          options={round.options}
          status={status}
        />

        {/* Leaderboard — now titled "Hall of Honk" */}
        <Leaderboard />

        {/* Footer ticker */}
        <div className="border-t border-white/10 pt-4 mt-8">
          <div className="overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
              {[1, 2].map((k) => (
                <span key={k} className="text-xs text-muted mx-4">
                  🪿 HONK HONK HONK — Total Volume Honked: {totalPot.toFixed(2)}{" "}
                  SOL — Bets Placed: {betTotals.length} — Geese
                  Angered: 42 — Honk-in Secured — HONK HONK HONK —{" "}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
