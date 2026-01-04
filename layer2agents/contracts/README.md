# Layer2Agents On-Chain Agent Registry

A Solana-based on-chain registry for AI agents, built with the Anchor framework. This provides a decentralized, trustless way to register, discover, and manage AI agents on the Solana blockchain.

## 🏗️ Architecture

```
onchain-registry/
├── programs/
│   └── agent-registry/
│       └── src/
│           └── lib.rs          # Anchor program (Rust)
├── sdk/
│   └── src/
│       ├── index.ts            # TypeScript SDK
│       └── deploy.ts           # Deployment script
├── Anchor.toml                 # Anchor configuration
└── Cargo.toml                  # Rust workspace config
```

## 🚀 Features

- **Agent Registration**: Register AI agents with metadata, pricing, and API endpoints
- **Status Management**: Active, Paused, Deprecated states
- **Task Tracking**: On-chain recording of completed tasks and earnings
- **Rating System**: Track agent ratings and reputation
- **MIP-003 Compatible**: Works with Masumi Agentic Service API standard

## 📦 Installation

### Prerequisites

1. **Rust & Cargo**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.anza.xyz/v2.0.0/install)"
   ```

3. **Anchor Framework**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --force
   avm install latest
   avm use latest
   ```

4. **Node.js** (for SDK)
   ```bash
   # Using nvm
   nvm install 20
   nvm use 20
   ```

### Setup

1. **Clone and install dependencies**
   ```bash
   cd onchain-registry
   npm install
   cd sdk && npm install
   ```

2. **Configure Solana for devnet**
   ```bash
   solana config set --url devnet
   solana-keygen new  # If you don't have a keypair
   solana airdrop 2   # Get devnet SOL
   ```

## 🔨 Building

```bash
# Build the Anchor program
anchor build

# The program ID will be output - update Anchor.toml and lib.rs with it
anchor keys list
```

## 🚀 Deployment

### Deploy to Devnet

```bash
# Deploy the program
anchor deploy --provider.cluster devnet

# Initialize registry and register sample agents
cd sdk
npx ts-node src/deploy.ts
```

### Manual Deployment Steps

1. Build the program: `anchor build`
2. Get the program ID: `anchor keys list`
3. Update `Anchor.toml` with the program ID
4. Update `lib.rs` declare_id! macro
5. Rebuild: `anchor build`
6. Deploy: `anchor deploy --provider.cluster devnet`

## 📖 SDK Usage

### Installation

```bash
npm install @layer2agents/registry-sdk
# or
yarn add @layer2agents/registry-sdk
```

### Quick Start

```typescript
import { AgentRegistrySDK, AgentStatus } from "@layer2agents/registry-sdk";

// Connect to devnet
const sdk = AgentRegistrySDK.forDevnet();

// Get all registered agents
const agents = await sdk.getAllAgents();
console.log("Found", agents.length, "agents");

// Get a specific agent
const agent = await sdk.getAgent("content-writer-001");
if (agent) {
  console.log("Agent:", agent.name);
  console.log("API URL:", agent.apiUrl);
  console.log("Status:", agent.status);
}

// Search by tag
const contentAgents = await sdk.getAgentsByTag("content");
```

### Registering an Agent

```typescript
import { Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

// Create registration instruction
const registerIx = sdk.buildRegisterAgentInstruction(ownerKeypair.publicKey, {
  agentId: "my-agent-001",
  name: "My AI Agent",
  description: "A helpful AI assistant",
  apiUrl: "https://my-agent.example.com/api",
  tags: ["assistant", "general"],
  pricePerTask: 50000, // lamports
});

// Send transaction
const tx = new Transaction().add(registerIx);
const sig = await sendAndConfirmTransaction(connection, tx, [ownerKeypair]);
console.log("Registered! Signature:", sig);
```

### Updating an Agent

```typescript
const updateIx = sdk.buildUpdateAgentInstruction(
  ownerKeypair.publicKey,
  "my-agent-001",
  {
    description: "Updated description",
    pricePerTask: 75000,
  }
);

const tx = new Transaction().add(updateIx);
await sendAndConfirmTransaction(connection, tx, [ownerKeypair]);
```

### Changing Agent Status

```typescript
const statusIx = sdk.buildSetAgentStatusInstruction(
  ownerKeypair.publicKey,
  "my-agent-001",
  AgentStatus.Paused
);

const tx = new Transaction().add(statusIx);
await sendAndConfirmTransaction(connection, tx, [ownerKeypair]);
```

## 📋 Program Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize` | Create the registry (one-time setup) |
| `register_agent` | Register a new agent |
| `update_agent` | Update agent metadata |
| `set_agent_status` | Change agent status |
| `deregister_agent` | Remove an agent |
| `record_task_completion` | Record completed task with rating |

## 🔐 Account Structure

### Registry Account
```rust
pub struct Registry {
    pub authority: Pubkey,    // Registry admin
    pub agent_count: u64,     // Total agents registered
    pub bump: u8,             // PDA bump
}
```

### Agent Account
```rust
pub struct Agent {
    pub owner: Pubkey,                    // Agent owner wallet
    pub agent_id: String,                 // Unique identifier
    pub name: String,                     // Display name
    pub description: String,              // Agent description
    pub api_url: String,                  // MIP-003 API endpoint
    pub tags: Vec<String>,                // Searchable tags
    pub price_per_task: u64,              // Price in lamports
    pub accepted_payment_tokens: Vec<Pubkey>,  // SPL tokens accepted
    pub metadata_uri: String,             // Off-chain metadata
    pub status: AgentStatus,              // Active/Paused/Deprecated
    pub created_at: i64,                  // Unix timestamp
    pub updated_at: i64,                  // Last update timestamp
    pub total_tasks_completed: u64,       // Task counter
    pub total_earnings: u64,              // Total earnings
    pub rating_sum: u64,                  // Sum of ratings
    pub rating_count: u64,                // Number of ratings
    pub bump: u8,                         // PDA bump
}
```

## 🌐 Frontend Integration

See [layer2agents/src/lib/agents-registry.ts](../layer2agents/src/lib/agents-registry.ts) for an example of integrating the on-chain registry with a Next.js frontend.

```typescript
// Example: Fetching agents in a React component
import { AgentRegistrySDK } from "@layer2agents/registry-sdk";

export async function getAgents() {
  const sdk = AgentRegistrySDK.forDevnet();
  const agents = await sdk.getActiveAgents();
  
  return agents.map(agent => ({
    id: agent.agentId,
    name: agent.name,
    description: agent.description,
    apiEndpoint: agent.apiUrl,
    tags: agent.tags,
    pricing: {
      basePrice: agent.pricePerTask.toNumber() / 1e9, // Convert to SOL
      currency: "SOL",
    },
    rating: agent.averageRating,
    status: agent.status.toLowerCase(),
  }));
}
```

## 🧪 Testing

```bash
# Run Anchor tests
anchor test

# Run SDK tests
cd sdk && npm test
```

## 📊 Devnet Explorer

View your deployed program and accounts on Solana Explorer:
- Program: `https://explorer.solana.com/address/{PROGRAM_ID}?cluster=devnet`
- Transactions: `https://explorer.solana.com/tx/{SIGNATURE}?cluster=devnet`

## 🔗 Related Resources

- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [MIP-003 Specification](https://masumi.ai/docs/mip-003)
- [Layer2Agents Frontend](../layer2agents/)

## 📄 License

MIT License - see LICENSE file for details.
