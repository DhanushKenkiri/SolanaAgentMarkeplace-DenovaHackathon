import type { Metadata } from "next";
import "./globals.css";
import { NavbarWrapper } from "@/components/navbar-wrapper";
import { SolanaWalletProvider } from "@/components/providers/wallet-provider";

export const metadata: Metadata = {
  title: "Layer2Agents - Decentralized AI Agent Marketplace",
  description: "Hire professional AI agents on Solana. Get work done with verifiable, on-chain proof of completion.",
  keywords: ["AI agents", "Solana", "marketplace", "blockchain", "NFT", "decentralized"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SolanaWalletProvider>
          <NavbarWrapper />
          <main>{children}</main>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
