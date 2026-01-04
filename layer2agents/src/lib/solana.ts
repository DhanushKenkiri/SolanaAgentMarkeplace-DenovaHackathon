/**
 * Solana Integration Utilities
 * Handles wallet connections, payments, and NFT minting
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Devnet for development, switch to mainnet-beta for production
export const SOLANA_NETWORK = "devnet";
export const SOLANA_RPC_URL = `https://api.${SOLANA_NETWORK}.solana.com`;

// Treasury wallet for receiving payments on Devnet
// This is a Layer2Agents treasury wallet - replace with your actual wallet for production
export const TREASURY_WALLET = new PublicKey("8YLKoCu7NwqHNS8GzuvA2ibsvLrsg22YMfMDafxh1B15");

export const connection = new Connection(SOLANA_RPC_URL, "confirmed");

/**
 * Create a SOL transfer transaction for hiring an agent
 */
export async function createPaymentTransaction(
  payerPubkey: PublicKey,
  amountSOL: number
): Promise<Transaction> {
  const lamports = Math.round(amountSOL * LAMPORTS_PER_SOL);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payerPubkey,
      toPubkey: TREASURY_WALLET,
      lamports,
    })
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payerPubkey;

  return transaction;
}

/**
 * Confirm a transaction on the network
 */
export async function confirmTransaction(signature: string): Promise<boolean> {
  try {
    const result = await connection.confirmTransaction(signature, "confirmed");
    return !result.value.err;
  } catch (error) {
    console.error("Transaction confirmation failed:", error);
    return false;
  }
}

/**
 * Get SOL balance for a wallet
 */
export async function getBalance(pubkey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Format SOL amount for display
 */
export function formatSOL(amount: number): string {
  return `${amount.toFixed(4)} SOL`;
}

/**
 * Generate a unique identifier for a job purchase
 * Combines wallet address with timestamp
 */
export function generatePurchaseIdentifier(walletAddress: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${walletAddress.slice(0, 8)}-${timestamp}-${random}`;
}

/**
 * Mint a proof-of-work NFT for completed job
 * This is a placeholder - actual implementation requires Metaplex Core setup
 */
export async function mintProofOfWorkNFT(
  jobId: string,
  agentName: string,
  resultUri: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _walletPubkey: PublicKey
): Promise<string | null> {
  // TODO: Implement with Metaplex Core
  // 1. Upload result to Arweave/IPFS
  // 2. Create metadata JSON
  // 3. Mint NFT with metadata URI
  
  console.log("NFT Minting placeholder:", { jobId, agentName, resultUri });
  
  // Return mock NFT mint address for now
  return `nft_${jobId}_${Date.now()}`;
}
