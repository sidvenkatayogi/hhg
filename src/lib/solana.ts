import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";

export const SOLANA_NETWORK = "devnet";
export const SOLANA_ENDPOINT = clusterApiUrl(SOLANA_NETWORK);
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "11111111111111111111111111111111"
);

export function getConnection(): Connection {
  return new Connection(SOLANA_ENDPOINT, "confirmed");
}

export async function requestAirdrop(
  connection: Connection,
  publicKey: PublicKey,
  amount: number = 2
): Promise<string> {
  const sig = await connection.requestAirdrop(
    publicKey,
    amount * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}

export async function getBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
