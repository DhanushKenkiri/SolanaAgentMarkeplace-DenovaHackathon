#!/usr/bin/env npx ts-node
/**
 * CLI to register an agent using Anchor directly with IDL generation
 * 
 * This approach lets Anchor generate the correct instruction discriminators.
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Program ID (deployed on devnet)
const PROGRAM_ID = new PublicKey("DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF");

// IDL - This must match what was deployed
const IDL = {
  "version": "0.1.0",
  "name": "agent_registry",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        { "name": "registry", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "registerAgent",
      "accounts": [
        { "name": "registry", "isMut": true, "isSigner": false },
        { "name": "agent", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "agentId", "type": "string" },
        { "name": "name", "type": "string" },
        { "name": "description", "type": "string" },
        { "name": "apiUrl", "type": "string" },
        { "name": "tags", "type": { "vec": "string" } },
        { "name": "pricePerTask", "type": "u64" },
        { "name": "acceptedPaymentTokens", "type": { "vec": "publicKey" } },
        { "name": "metadataUri", "type": "string" }
      ]
    },
    {
      "name": "updateAgent",
      "accounts": [
        { "name": "agent", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "name", "type": { "option": "string" } },
        { "name": "description", "type": { "option": "string" } },
        { "name": "apiUrl", "type": { "option": "string" } },
        { "name": "tags", "type": { "option": { "vec": "string" } } },
        { "name": "pricePerTask", "type": { "option": "u64" } },
        { "name": "acceptedPaymentTokens", "type": { "option": { "vec": "publicKey" } } },
        { "name": "metadataUri", "type": { "option": "string" } }
      ]
    },
    {
      "name": "setAgentStatus",
      "accounts": [
        { "name": "agent", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "status", "type": { "defined": "AgentStatus" } }
      ]
    },
    {
      "name": "deregisterAgent",
      "accounts": [
        { "name": "registry", "isMut": true, "isSigner": false },
        { "name": "agent", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true }
      ],
      "args": []
    },
    {
      "name": "recordTaskCompletion",
      "accounts": [
        { "name": "agent", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true }
      ],
      "args": [
        { "name": "earnings", "type": "u64" },
        { "name": "rating", "type": { "option": "u8" } }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Registry",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "agentCount", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "Agent",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "agentId", "type": "string" },
          { "name": "name", "type": "string" },
          { "name": "description", "type": "string" },
          { "name": "apiUrl", "type": "string" },
          { "name": "tags", "type": { "vec": "string" } },
          { "name": "pricePerTask", "type": "u64" },
          { "name": "acceptedPaymentTokens", "type": { "vec": "publicKey" } },
          { "name": "metadataUri", "type": "string" },
          { "name": "status", "type": { "defined": "AgentStatus" } },
          { "name": "createdAt", "type": "i64" },
          { "name": "updatedAt", "type": "i64" },
          { "name": "totalTasksCompleted", "type": "u64" },
          { "name": "totalEarnings", "type": "u64" },
          { "name": "ratingSum", "type": "u64" },
          { "name": "ratingCount", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "AgentStatus",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "Active" },
          { "name": "Paused" },
          { "name": "Deprecated" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "AgentIdTooLong", "msg": "Agent ID exceeds maximum length (64 chars)" },
    { "code": 6001, "name": "NameTooLong", "msg": "Name exceeds maximum length (128 chars)" },
    { "code": 6002, "name": "DescriptionTooLong", "msg": "Description exceeds maximum length (512 chars)" },
    { "code": 6003, "name": "ApiUrlTooLong", "msg": "API URL exceeds maximum length (256 chars)" },
    { "code": 6004, "name": "TooManyTags", "msg": "Too many tags (max 10)" },
    { "code": 6005, "name": "MetadataUriTooLong", "msg": "Metadata URI exceeds maximum length (256 chars)" },
    { "code": 6006, "name": "Unauthorized", "msg": "Unauthorized" },
    { "code": 6007, "name": "InvalidRating", "msg": "Invalid rating (must be 0-5)" }
  ]
};

async function main() {
  console.log("\n🤖 Layer2Agents - Register Agent CLI\n");

  // Load keypair
  const keypairPath = path.join(
    process.env.HOME || process.env.USERPROFILE || "",
    ".config/solana/id.json"
  );
  const keypairJson = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairJson));

  console.log(`📝 Wallet: ${wallet.publicKey.toBase58()}`);

  // Connect to devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL\n`);

  // Create Anchor provider
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );

  // Create program interface with explicit typing
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);

  // Derive PDAs
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );

  // Agent to register
  const agentId = "cold-outreach-001";
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), Buffer.from(agentId)],
    PROGRAM_ID
  );

  console.log(`📦 Registry PDA: ${registryPda.toBase58()}`);
  console.log(`🤖 Agent PDA: ${agentPda.toBase58()}\n`);

  // Check if agent already exists
  const existingAgent = await connection.getAccountInfo(agentPda);
  if (existingAgent) {
    console.log("⚠️  Agent already registered!");
    console.log(`   Account size: ${existingAgent.data.length} bytes`);
    return;
  }

  // Register the cold-outreach agent
  console.log("📝 Registering Cold Outreach Agent...\n");

  try {
    const tx = await (program.methods as any)
      .registerAgent(
        agentId,
        "Cold Outreach AI Agent",
        "AI-powered cold outreach agent for automated lead generation. Generates personalized emails, LinkedIn messages, and follow-ups using GPT-4.",
        "https://web-production-9afa9.up.railway.app/",
        ["outreach", "email", "linkedin", "sales", "leads", "automation"],
        new anchor.BN(50000), // 0.00005 SOL
        [],
        ""
      )
      .accounts({
        registry: registryPda,
        agent: agentPda,
        owner: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Agent registered successfully!");
    console.log(`📝 Transaction: ${tx}`);
    console.log(`\n🔗 View on explorer:`);
    console.log(`   https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (error: any) {
    console.error("❌ Error registering agent:");
    console.error(error.message);
    
    if (error.logs) {
      console.log("\nProgram Logs:");
      error.logs.forEach((log: string) => console.log(`   ${log}`));
    }
  }
}

main().catch(console.error);
