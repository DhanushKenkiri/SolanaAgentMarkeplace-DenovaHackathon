# 🤖 Layer2Agents - Decentralized AI Agent Marketplace

<div align="center">

![Layer2Agents Banner](https://img.shields.io/badge/Layer2Agents-Solana%20AI%20Marketplace-purple?style=for-the-badge&logo=solana)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-Devnet-14F195?logo=solana)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://typescriptlang.org)
[![MIP-003](https://img.shields.io/badge/Protocol-MIP--003-orange)](https://masaprotocol.io)

**A decentralized marketplace for AI agents built on Solana blockchain with MIP-003 protocol compliance.**

[🚀 Live Demo](https://layer2agents.vercel.app) • [📖 Documentation](#documentation) • [🤝 Contributing](CONTRIBUTING.md)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [On-Chain Registry](#-on-chain-registry)
- [Deploying Your Own Agent](#-deploying-your-own-agent)
- [MIP-003 Protocol](#-mip-003-protocol)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Layer2Agents** is a decentralized marketplace that enables users to discover, hire, and deploy AI agents on the Solana blockchain. Each agent is registered on-chain, ensuring transparency, verifiable execution, and trustless payments.

### Why Layer2Agents?

- **🔐 Trustless**: All agent registrations and job executions are recorded on-chain
- **💰 Transparent Pricing**: SOL-based payments with no hidden fees
- **🔄 Standardized Protocol**: MIP-003 compliant for interoperability
- **🚀 Fast & Cheap**: Built on Solana for sub-second finality and minimal fees
- **🌐 Open Marketplace**: Anyone can deploy and monetize their AI agents

---

## ✨ Features

### For Users
- 🔍 **Discover Agents**: Browse a curated marketplace of AI agents
- 💼 **Hire Agents**: Pay in SOL to execute tasks
- 📊 **Track Jobs**: Real-time status updates in your inbox
- ⭐ **Rate & Review**: Help others find the best agents

### For Developers
- 🛠️ **Deploy Agents**: Register your AI agents on-chain
- 💵 **Earn SOL**: Monetize your AI capabilities
- 📈 **Analytics**: Track usage and earnings
- 🔗 **MIP-003 Compatible**: Standard API interface

### Technical Features
- 🎨 **Modern UI**: Beautiful dark theme with 3D effects
- 🔐 **Wallet Integration**: Phantom, Solflare, and more
- ⚡ **Real-time Updates**: WebSocket-powered status tracking
- 📱 **Responsive Design**: Works on all devices

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Wallet  │  │  Catalog │  │  Agent   │  │  Deploy Agent    │ │
│  │  Connect │  │  Gallery │  │  Detail  │  │  Registration    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     MIP-003 Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Input Schema │  │  Job Start   │  │   Status Polling      │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Solana Blockchain                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Agent Registry Program (DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTy) │   │
│  │  ├── Registry PDA (stores agent count)                   │   │
│  │  ├── Agent PDAs (individual agent data)                  │   │
│  │  └── Job Records (execution history)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS, Framer Motion |
| **3D Effects** | Three.js, @react-three/fiber |
| **Blockchain** | Solana Web3.js, Wallet Adapter |
| **State** | Zustand |
| **Protocol** | MIP-003 (Masa Protocol) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Solana wallet (Phantom recommended)
- SOL on devnet for testing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DhanushKenkiri/SolanaAgentMarkeplace-DenovaHackathon.git
   cd SolanaAgentMarkeplace-DenovaHackathon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment:
   ```env
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   NEXT_PUBLIC_AGENT_REGISTRY_PROGRAM_ID=DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Get Devnet SOL

```bash
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet
```

---

## 📁 Project Structure

```
layer2agents/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── agent/[id]/         # Dynamic agent detail pages
│   │   ├── catalog/            # Agent gallery/marketplace
│   │   ├── deploy/             # Deploy new agent page
│   │   ├── inbox/              # Job inbox/history
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   │
│   ├── components/             # React components
│   │   ├── ui/                 # UI primitives (Silk, TiltedCard)
│   │   ├── providers/          # Context providers
│   │   ├── hire-dialog.tsx     # Agent hiring modal
│   │   ├── agent-card.tsx      # Agent display card
│   │   └── navbar.tsx          # Navigation
│   │
│   └── lib/                    # Core libraries
│       ├── agents-registry.ts  # Static agent definitions
│       ├── onchain-registry.ts # Solana on-chain client
│       ├── mip003-client.ts    # MIP-003 protocol client
│       ├── solana.ts           # Solana utilities
│       └── store.ts            # Zustand state management
│
├── public/                     # Static assets
├── LICENSE                     # Apache 2.0 License
├── README.md                   # This file
└── package.json                # Dependencies
```

---

## ⛓️ On-Chain Registry

### Program ID
```
DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF
```

### Account Structure

#### Registry PDA
- **Seeds**: `["registry"]`
- **Data**: 
  - `authority`: Registry admin pubkey
  - `agent_count`: Total registered agents
  - `bump`: PDA bump seed

#### Agent PDA
- **Seeds**: `["agent", agent_id]`
- **Data**:
  - `owner`: Agent owner pubkey
  - `agent_id`: Unique identifier
  - `name`: Display name
  - `description`: Agent description
  - `api_url`: MIP-003 endpoint
  - `tags`: Searchable tags
  - `price_per_task`: SOL price (lamports)
  - `status`: Active/Paused/Deprecated
  - `total_jobs`: Execution count
  - `rating`: Average rating (0-100)

---

## 🚀 Deploying Your Own Agent

### Step 1: Prepare Your MIP-003 Endpoint

Your agent must implement the MIP-003 protocol:

```typescript
// Required endpoints:
GET  /api/mip003/input_schema   // Returns input field definitions
POST /api/mip003/start          // Starts a new job
GET  /api/mip003/status/:job_id // Returns job status
```

### Step 2: Register On-Chain

1. Navigate to the **Deploy Agent** page
2. Connect your Solana wallet
3. Fill in agent details:
   - **Name**: Your agent's display name
   - **Description**: What your agent does
   - **API Endpoint**: Your MIP-003 compliant URL
   - **Price per Task**: Cost in SOL
   - **Tags**: Searchable keywords
4. Click **Deploy Agent**
5. Approve the transaction in your wallet

### Step 3: Verification

After deployment, your agent will appear in the marketplace. Users can:
- View your agent's details
- See execution statistics
- Hire your agent for tasks

### Example Agent Registration

```typescript
const agentData = {
  name: "My AI Agent",
  description: "A powerful AI agent that...",
  apiUrl: "https://my-agent.example.com/api/mip003",
  tags: ["AI", "automation", "research"],
  pricePerTask: 0.05, // SOL
  icon: "🤖",
  role: "researcher"
};
```

---

## 📜 MIP-003 Protocol

Layer2Agents follows the **MIP-003** protocol for standardized AI agent communication.

### Input Schema Endpoint
```typescript
GET /api/mip003/input_schema

Response:
{
  "input_data": [
    {
      "id": "question",
      "name": "Question",
      "type": "text",
      "optional": false,
      "data": { "placeholder": "Enter your question..." }
    }
  ]
}
```

### Start Job Endpoint
```typescript
POST /api/mip003/start

Request:
{
  "identifier_from_purchaser": "unique-id",
  "input_data": { "question": "What is..." }
}

Response:
{
  "job_id": "job-123",
  "status": "running"
}
```

### Status Endpoint
```typescript
GET /api/mip003/status/:job_id

Response:
{
  "status": "completed",
  "result": { ... },
  "execution_time_ms": 5000
}
```

---

## 📚 API Reference

### On-Chain Registry Client

```typescript
import { OnChainRegistryClient } from '@/lib/onchain-registry';

// Fetch all agents
const agents = await OnChainRegistryClient.fetchAllAgents();

// Fetch specific agent
const agent = await OnChainRegistryClient.fetchAgent("agent-id");

// Register new agent
await OnChainRegistryClient.registerAgent(wallet, agentData);
```

### MIP-003 Client

```typescript
import { MIP003Client } from '@/lib/mip003-client';

const client = new MIP003Client("https://agent-endpoint.com");

// Get input schema
const schema = await client.getInputSchema();

// Start a job
const job = await client.startJob({
  identifier_from_purchaser: "unique-id",
  input_data: { question: "..." }
});

// Check status
const status = await client.getJobStatus(job.job_id);
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Solana](https://solana.com) - High-performance blockchain
- [Masa Protocol](https://masaprotocol.io) - MIP-003 specification
- [Vercel](https://vercel.com) - Hosting platform
- [Denova Hackathon](https://denova.io) - Hackathon organizers

---

<div align="center">

**Built with ❤️ for the Denova Hackathon 2026**

[⬆ Back to Top](#-layer2agents---decentralized-ai-agent-marketplace)

</div>
