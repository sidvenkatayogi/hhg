"use client";

import dynamic from "next/dynamic";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { truncateAddress } from "@/lib/solana";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function WalletConnect() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch {
      setBalance(null);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    refreshBalance();
    const interval = setInterval(refreshBalance, 5000);
    return () => clearInterval(interval);
  }, [refreshBalance]);

  return (
    <div className="flex items-center gap-3">
      {publicKey && (
        <div className="hidden sm:flex items-center gap-2 bg-surface px-3 py-2 rounded-lg border border-white/10 text-sm">
          <span className="text-muted">{truncateAddress(publicKey.toBase58())}</span>
          <span className="text-primary font-bold">
            {balance !== null ? `${balance.toFixed(2)} SOL` : "..."}
          </span>
        </div>
      )}
      <WalletMultiButton />
    </div>
  );
}
