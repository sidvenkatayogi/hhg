"use client";

import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function LandingHero() {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) {
      router.push("/arena");
    }
  }, [connected, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative noise-bg">
      {/* Giant goose */}
      <div className="leading-none mb-4 select-none">
        <img src="/harnold_.png" style={{height: '200px', display: 'block', margin: '0 auto', transform: 'translateX(40px)'}} alt="Harnold" />
      </div>

      {/* Title */}
      <h1 className="text-5xl md:text-8xl font-display glow-orange inline-block px-4 py-2" style={{color: 'rgb(56, 34, 16)'}}>
        GOOSE BETS
      </h1>

      {/* CTA */}
      <div className="mt-10">
        <WalletMultiButton
          style={{
            background: "rgb(56, 34, 16)",
            color: "white",
            fontSize: "1.1rem",
            padding: "16px 32px",
            borderRadius: "12px",
            fontFamily: "'PlotterxsTRIAL', sans-serif",
            letterSpacing: "1px",
          }}
        />
      </div>

      <p className="text-muted text-sm mt-6">
        Connect wallet to enter the honk zone
      </p>

      {/* Scrolling ticker */}
      <div className="absolute bottom-0 left-0 right-0 bg-surface/80 border-t border-white/10 py-2 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[1, 2].map((k) => (
            <span key={k} className="text-sm text-muted mx-4 inline-flex items-center gap-2">
              <img src="/harnold_.png" style={{height: '16px', display: 'inline'}} alt="" /> HONK HONK HONK — Total Volume Honked: 420.69 SOL — Active
              Degens: 69 — Geese Wronged: 0 — HONK HONK HONK —{" "}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-10 text-xs text-muted/50 text-center px-4">
        Built on Solana devnet. No real geese were harmed. Some wallets were.
      </p>
    </div>
  );
}
