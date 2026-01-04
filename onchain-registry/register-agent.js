/**
 * Simple agent registration using raw Solana web3.js
 * 
 * Since the Anchor version mismatch is causing issues, this script
 * builds the raw transaction instruction manually.
 */

const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction, clusterApiUrl } = require("@solana/web3.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Program ID (deployed on devnet)
const PROGRAM_ID = new PublicKey("DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF");

// Anchor discriminator is SHA256("global:register_agent")[0..8]
function getDiscriminator(name) {
  const hash = crypto.createHash("sha256").update(`global:${name}`).digest();
  return hash.slice(0, 8);
}

// Serialize a string (4-byte length prefix + UTF8 bytes)
function serializeString(str) {
  const bytes = Buffer.from(str, "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(bytes.length);
  return Buffer.concat([lenBuf, bytes]);
}

// Serialize an array of strings
function serializeStringArray(arr) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(arr.length);
  const itemBuffers = arr.map(serializeString);
  return Buffer.concat([lenBuf, ...itemBuffers]);
}

// Serialize u64
function serializeU64(num) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(num));
  return buf;
}

// Serialize Vec<Pubkey> (empty)
function serializeEmptyPubkeyArray() {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(0);
  return lenBuf;
}

async function main() {
  console.log("\n🤖 Layer2Agents - Register Agent (Raw)\n");

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

  // Derive PDAs
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );

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

  // Build instruction data
  const discriminator = getDiscriminator("register_agent");
  console.log(`📋 Discriminator: ${discriminator.toString("hex")}`);

  const agentData = {
    agentId: agentId,
    name: "Cold Outreach AI Agent",
    description: "AI-powered cold outreach agent for lead generation. Generates personalized emails and LinkedIn messages using GPT-4.",
    apiUrl: "https://web-production-9afa9.up.railway.app/",
    tags: ["outreach", "email", "sales", "leads"],
    pricePerTask: 50000, // 0.00005 SOL
    metadataUri: "",
  };

  const instructionData = Buffer.concat([
    discriminator,
    serializeString(agentData.agentId),
    serializeString(agentData.name),
    serializeString(agentData.description),
    serializeString(agentData.apiUrl),
    serializeStringArray(agentData.tags),
    serializeU64(agentData.pricePerTask),
    serializeEmptyPubkeyArray(), // acceptedPaymentTokens (empty)
    serializeString(agentData.metadataUri),
  ]);

  console.log(`📦 Instruction data size: ${instructionData.length} bytes\n`);

  // Build instruction
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: registryPda, isSigner: false, isWritable: true },
      { pubkey: agentPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  // Build and send transaction
  const transaction = new Transaction().add(instruction);
  
  console.log("📝 Sending transaction...\n");

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet],
      { commitment: "confirmed" }
    );

    console.log("✅ Agent registered successfully!");
    console.log(`📝 Signature: ${signature}`);
    console.log(`\n🔗 View on Solana Explorer:`);
    console.log(`   https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.logs) {
      console.log("\nProgram Logs:");
      error.logs.forEach(log => console.log(`   ${log}`));
    }
  }
}

main().catch(console.error);
