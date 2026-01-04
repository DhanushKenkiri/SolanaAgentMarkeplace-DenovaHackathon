#!/usr/bin/env node
/**
 * Deploy Script for Layer2Agents On-Chain Registry
 * 
 * This script handles:
 * 1. Building the Anchor program
 * 2. Deploying to Solana devnet
 * 3. Initializing the registry
 * 4. Registering sample agents
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { AgentRegistrySDK, RegisterAgentParams } from "./index";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Configuration
// ============================================================================

const DEVNET_URL = clusterApiUrl("devnet");

// Sample agents to register on deployment
const SAMPLE_AGENTS: RegisterAgentParams[] = [
  {
    agentId: "content-writer-001",
    name: "ContentWriter Pro",
    description: "Professional AI content writer specializing in SEO-optimized articles, blog posts, and marketing copy. Powered by GPT-4.",
    apiUrl: "https://web-production-9afa9.up.railway.app/",
    tags: ["content", "writing", "seo", "marketing", "blogging"],
    pricePerTask: 50000, // 0.00005 SOL in lamports
    metadataUri: "",
  },
  {
    agentId: "code-reviewer-001",
    name: "Code Review Assistant",
    description: "Expert code reviewer that analyzes your codebase for bugs, security vulnerabilities, and best practice violations.",
    apiUrl: "https://api.layer2agents.com/agents/code-reviewer",
    tags: ["code", "review", "security", "development", "quality"],
    pricePerTask: 100000, // 0.0001 SOL in lamports
    metadataUri: "",
  },
  {
    agentId: "data-analyst-001",
    name: "Data Analyst AI",
    description: "Advanced data analysis agent that processes datasets, generates insights, and creates visualizations automatically.",
    apiUrl: "https://api.layer2agents.com/agents/data-analyst",
    tags: ["data", "analysis", "visualization", "insights", "statistics"],
    pricePerTask: 150000, // 0.00015 SOL in lamports
    metadataUri: "",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function loadKeypair(keypairPath: string): Keypair {
  const keypairJson = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keypairJson));
}

async function requestAirdrop(connection: Connection, publicKey: PublicKey): Promise<void> {
  console.log("💰 Requesting airdrop...");
  const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(signature, "confirmed");
  console.log("✅ Airdrop received!");
}

async function checkBalance(connection: Connection, publicKey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

// ============================================================================
// Main Deployment Flow
// ============================================================================

async function main() {
  console.log("\n🚀 Layer2Agents On-Chain Registry Deployment\n");
  console.log("=".repeat(50));

  // Load deployer keypair
  const keypairPath = process.env.KEYPAIR_PATH || 
    path.join(process.env.HOME || process.env.USERPROFILE || "", ".config/solana/id.json");

  let deployer: Keypair;
  try {
    deployer = loadKeypair(keypairPath);
    console.log(`📝 Deployer: ${deployer.publicKey.toBase58()}`);
  } catch (error) {
    console.error("❌ Failed to load keypair. Please ensure you have a Solana keypair at:");
    console.error(`   ${keypairPath}`);
    console.error("\nGenerate one with: solana-keygen new");
    process.exit(1);
  }

  // Connect to devnet
  const connection = new Connection(DEVNET_URL, "confirmed");
  console.log(`🌐 Connected to: ${DEVNET_URL}\n`);

  // Check balance and airdrop if needed
  let balance = await checkBalance(connection, deployer.publicKey);
  console.log(`💳 Current balance: ${balance} SOL`);

  if (balance < 1) {
    await requestAirdrop(connection, deployer.publicKey);
    balance = await checkBalance(connection, deployer.publicKey);
    console.log(`💳 New balance: ${balance} SOL\n`);
  }

  // Initialize SDK
  const sdk = AgentRegistrySDK.forDevnet();

  // Step 1: Initialize Registry
  console.log("\n📦 Step 1: Initializing Registry...");
  const [registryAddress] = sdk.getRegistryAddress();
  console.log(`   Registry PDA: ${registryAddress.toBase58()}`);

  try {
    const existingRegistry = await sdk.getRegistry();
    if (existingRegistry) {
      console.log("   ⚠️ Registry already exists, skipping initialization");
    } else {
      const initIx = sdk.buildInitializeInstruction(deployer.publicKey);
      const initTx = new Transaction().add(initIx);
      
      const initSig = await sendAndConfirmTransaction(connection, initTx, [deployer]);
      console.log(`   ✅ Registry initialized!`);
      console.log(`   📝 Signature: ${initSig}`);
    }
  } catch (error: any) {
    if (error.message?.includes("already in use")) {
      console.log("   ⚠️ Registry already exists, skipping initialization");
    } else {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // Step 2: Register Sample Agents
  console.log("\n🤖 Step 2: Registering Sample Agents...\n");

  for (const agentParams of SAMPLE_AGENTS) {
    console.log(`   Registering: ${agentParams.name}`);
    const [agentAddress] = sdk.getAgentAddress(agentParams.agentId);
    console.log(`   Agent PDA: ${agentAddress.toBase58()}`);

    try {
      const existingAgent = await sdk.getAgent(agentParams.agentId);
      if (existingAgent) {
        console.log(`   ⚠️ Agent "${agentParams.agentId}" already registered, skipping\n`);
        continue;
      }

      const registerIx = sdk.buildRegisterAgentInstruction(deployer.publicKey, agentParams);
      const registerTx = new Transaction().add(registerIx);

      const registerSig = await sendAndConfirmTransaction(connection, registerTx, [deployer]);
      console.log(`   ✅ Registered! Signature: ${registerSig}\n`);
    } catch (error: any) {
      if (error.message?.includes("already in use")) {
        console.log(`   ⚠️ Agent "${agentParams.agentId}" already exists, skipping\n`);
      } else {
        console.error(`   ❌ Error registering ${agentParams.name}: ${error.message}\n`);
      }
    }
  }

  // Step 3: Verify Deployment
  console.log("\n📊 Step 3: Verifying Deployment...\n");

  const registry = await sdk.getRegistry();
  if (registry) {
    console.log(`   Registry Authority: ${registry.authority.toBase58()}`);
    console.log(`   Total Agents Registered: ${registry.agentCount.toString()}`);
  }

  const allAgents = await sdk.getAllAgents();
  console.log(`\n   📋 All Registered Agents:`);
  for (const agent of allAgents) {
    console.log(`\n   - ${agent.name} (${agent.agentId})`);
    console.log(`     Status: ${agent.status}`);
    console.log(`     API URL: ${agent.apiUrl}`);
    console.log(`     Tags: ${agent.tags.join(", ")}`);
    console.log(`     Price: ${agent.pricePerTask.toNumber() / LAMPORTS_PER_SOL} SOL`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Deployment Complete!\n");
  console.log("Next Steps:");
  console.log("1. Update your frontend to use the SDK");
  console.log("2. Configure the program ID in your app");
  console.log("3. Test agent interactions on devnet\n");
}

// Run the deployment
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
