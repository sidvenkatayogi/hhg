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
      <div className="text-[120px] md:text-[200px] leading-none mb-4 select-none">
        🪿
      </div>

      {/* Title */}
      <h1 className="text-5xl md:text-8xl font-display text-primary glow-orange inline-block px-4 py-2">
        GOOSE BETS
      </h1>

      {/* Subtitle */}
      <p className="text-muted text-lg md:text-xl mt-4 italic">
        &quot;The future of degenerate waterfowl gambling&quot;
      </p>

      {/* CTA */}
      <div className="mt-10">
        <WalletMultiButton
          style={{
            background: "#FF6B00",
            fontSize: "1.1rem",
            padding: "16px 32px",
            borderRadius: "12px",
            fontFamily: "'Luckiest Guy', cursive",
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
            <span key={k} className="text-sm text-muted mx-4">
              🪿 HONK HONK HONK — Total Volume Honked: 420.69 SOL — Active
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
