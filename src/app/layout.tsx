import type { Metadata } from "next";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "GOOSE BETS — Degenerate Waterfowl Gambling",
  description: "The future of degenerate waterfowl gambling. Bet devnet SOL on what geese will do next.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🪿</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head />
      <body className="min-h-full flex flex-col bg-background text-foreground font-mono">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
