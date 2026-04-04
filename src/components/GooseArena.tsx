"use client";

import { useGameState } from "@/hooks/useGameState";
import { useBetting } from "@/hooks/useBetting";
import VideoPlayer from "./VideoPlayer";
import BettingPanel from "./BettingPanel";
import BetFeed from "./BetFeed";
import CountdownTimer from "./CountdownTimer";
import RevealSequence from "./RevealSequence";
import Leaderboard from "./Leaderboard";
import WalletConnect from "./WalletConnect";

export default function GooseArena() {
  const { state } = useGameState();
  const { getUserBet, getUserWager } = useBetting();

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

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Header */}
      <header className="border-b sticky top-0 z-40 backdrop-blur-sm" style={{background: 'rgb(56, 34, 16)', borderColor: 'rgb(56, 34, 16)'}}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-display" style={{color: 'rgb(253, 251, 245)'}}>
            GOOSE BETS <img src="/harnold_.png" style={{height: '36px', display: 'inline', verticalAlign: 'middle'}} alt="" />
          </h1>
          <WalletConnect />
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
            disabled={!isBettingOpen}
            userBet={userBet}
            totalPot={totalPot}
          />
        )}

        {/* Live bet feed */}
        <BetFeed
          betTotals={betTotals}
          totalPot={totalPot}
          options={round.options}
          status={status}
        />

        {/* Leaderboard */}
        <Leaderboard />

        {/* Footer ticker */}
        <div className="border-t border-white/10 pt-4 mt-8">
          <div className="overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
              {[1, 2].map((k) => (
                <span key={k} className="text-xs text-muted mx-4 inline-flex items-center gap-2">
                  <img src="/harnold_.png" style={{height: '14px', display: 'inline'}} alt="" /> HONK HONK HONK — Total Volume Honked: {totalPot.toFixed(2)}{" "}
                  SOL — Bets Placed: {betTotals.length} — Geese
                  Angered: 42 — HONK HONK HONK —{" "}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
