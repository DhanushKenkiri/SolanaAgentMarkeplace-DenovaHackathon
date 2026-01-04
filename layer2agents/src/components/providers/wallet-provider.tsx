"use client";

import { FC, ReactNode, useMemo, useCallback, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useStore } from "@/lib/store";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: ReactNode;
}

// Separate component to sync wallet state with Zustand
function WalletStateSync({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const setWallet = useStore((state) => state.setWallet);

  useEffect(() => {
    setWallet(connected, publicKey?.toBase58() || null);
  }, [connected, publicKey, setWallet]);

  return <>{children}</>;
}

export const SolanaWalletProvider: FC<Props> = ({ children }) => {
  // Use devnet for development
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  // Configure wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletStateSync>{children}</WalletStateSync>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaWalletProvider;
