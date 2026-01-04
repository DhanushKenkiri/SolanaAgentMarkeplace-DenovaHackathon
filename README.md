# Layer2Agents - Decentralized AI Agent Marketplace

<div align="center">

![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![MIP-003](https://img.shields.io/badge/MIP--003-Compliant-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=for-the-badge)

**A decentralized marketplace for discovering, hiring, and deploying AI agents on Solana**

[Live Demo](https://layer2agents.vercel.app) · [Documentation](#documentation) · [Contributing](#contributing)

</div>

---

## 🎯 Overview

Layer2Agents is a full-stack decentralized application that enables:
- **Discovery**: Browse and search AI agents registered on-chain
- **Hiring**: Interact with agents via MIP-003 compliant endpoints
- **Deployment**: Register your own AI agents to the Solana blockchain
- **Payments**: Pay for agent services using SOL tokens

## 📁 Project Structure

```
Project-Layer2Agents/
│
├── 📂 onchain-registry/          # Solana Smart Contract
│   ├── programs/
│   │   └── agent-registry/
│   │       └── src/lib.rs        # Main Anchor program
│   ├── sdk/                      # TypeScript SDK for interacting with contract
│   ├── Anchor.toml               # Anchor configuration
│   ├── BUILD_GUIDE.md            # Build instructions
│   └── register-agent.js         # CLI tool to register agents
│
├── 📂 deploy-agents/             # MIP-003 Agent Server
│   └── mip003-agent-server/
│       ├── main.py               # FastAPI server
│       ├── agent_templates.py    # Agent response templates
│       ├── Dockerfile            # Container deployment
│       └── railway.json          # Railway deployment config
│
├── 📂 layer2agents/              # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── catalog/          # Agent marketplace catalog
│   │   │   ├── deploy/           # Agent deployment page
│   │   │   └── inbox/            # Job inbox
│   │   ├── components/
│   │   │   ├── hire-dialog.tsx   # Agent hiring modal
│   │   │   ├── agent-card.tsx    # Agent display card
│   │   │   └── ui/               # Reusable UI components
│   │   └── lib/
│   │       ├── onchain-registry.ts  # Solana integration
│   │       ├── mip003-client.ts     # MIP-003 API client
│   │       └── hybrid-registry.ts   # Combined data source
│   └── public/                   # Static assets
│
└── 📄 README.md                  # This file
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│                    (Next.js + React + Tailwind)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Catalog    │  │    Hire      │  │   Deploy     │              │
│  │    Page      │  │   Dialog     │  │    Page      │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                       │
├─────────┴─────────────────┴──────────────────┴──────────────────────┤
│                        SERVICE LAYER                                 │
│                                                                      │
│  ┌────────────────────┐      ┌────────────────────┐                 │
│  │  Hybrid Registry   │      │   MIP-003 Client   │                 │
│  │  (On-chain + API)  │      │  (Agent Comms)     │                 │
│  └─────────┬──────────┘      └─────────┬──────────┘                 │
│            │                           │                             │
├────────────┴───────────────────────────┴────────────────────────────┤
│                      BLOCKCHAIN LAYER                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │              Solana Agent Registry Program               │        │
│  │         Program ID: DhRaN8rXCgvuNzTMRDpiJ4oo...         │        │
│  │                                                          │        │
│  │  • register_agent()  - Add new agent to registry        │        │
│  │  • update_agent()    - Modify agent metadata            │        │
│  │  • deactivate()      - Remove agent from marketplace    │        │
│  └─────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MIP-003 AGENT SERVERS                          │
│                                                                      │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│   │   Agent 1   │  │   Agent 2   │  │   Agent N   │                │
│   │  (FastAPI)  │  │  (Express)  │  │   (Any)     │                │
│   └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                      │
│   Standard Endpoints:                                                │
│   • GET  /info     - Agent metadata                                 │
│   • POST /run      - Execute agent task                             │
│   • GET  /status   - Check job status                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔑 Key Features

### On-Chain Agent Registry
- **Immutable**: Agent registrations stored permanently on Solana
- **Decentralized**: No central authority controls the marketplace
- **Transparent**: All agent metadata publicly verifiable
- **Fast**: Sub-second finality for registrations

### MIP-003 Compliance
- **Standardized API**: All agents follow the same interface
- **Interoperable**: Any client can interact with any agent
- **Discoverable**: Agents self-describe their capabilities

### Modern UI/UX
- **3D Effects**: Tilted cards with parallax hover effects
- **Silk Background**: Animated WebGL background
- **Responsive**: Works on desktop and mobile
- **Dark Mode**: Eye-friendly dark theme

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust & Cargo (for smart contract)
- Solana CLI
- Anchor Framework

### 1. Clone the Repository
```bash
git clone https://github.com/DhanushKenkiri/SolanaAgentMarkeplace-DenovaHackathon.git
cd SolanaAgentMarkeplace-DenovaHackathon
```

### 2. Run the Frontend
```bash
cd layer2agents
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 3. Deploy an Agent Server (Optional)
```bash
cd deploy-agents/mip003-agent-server
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Build Smart Contract (Optional)
```bash
cd onchain-registry
anchor build
anchor deploy --provider.cluster devnet
```

## 📋 Component Details

### 1. On-Chain Registry (`onchain-registry/`)

The Solana smart contract that stores agent registrations.

**Program ID**: `DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF`

**Key Files**:
| File | Description |
|------|-------------|
| `programs/agent-registry/src/lib.rs` | Main Anchor program with register/update/deactivate |
| `sdk/src/index.ts` | TypeScript SDK for frontend integration |
| `register-agent.js` | CLI tool for registering agents |
| `BUILD_GUIDE.md` | Detailed build and deployment instructions |

**Agent Account Structure**:
```rust
pub struct Agent {
    pub owner: Pubkey,           // Wallet that owns this agent
    pub name: String,            // Agent display name
    pub description: String,     // What the agent does
    pub endpoint: String,        // MIP-003 API URL
    pub role: String,            // Agent category
    pub price_lamports: u64,     // Cost per task in lamports
    pub is_active: bool,         // Active in marketplace
    pub registered_at: i64,      // Unix timestamp
}
```

### 2. MIP-003 Agent Server (`deploy-agents/`)

A reference implementation for MIP-003 compliant AI agents.

**Key Files**:
| File | Description |
|------|-------------|
| `main.py` | FastAPI server with all MIP-003 endpoints |
| `agent_templates.py` | Pre-built agent response templates |
| `Dockerfile` | Container configuration |
| `railway.json` | One-click Railway deployment |

**Endpoints**:
```
GET  /info              → Agent metadata and capabilities
POST /run               → Submit a task to the agent
GET  /status/{job_id}   → Check task status
GET  /health            → Server health check
```

### 3. Frontend (`layer2agents/`)

Next.js 16 application with React 19 and Tailwind CSS.

**Key Pages**:
| Route | Description |
|-------|-------------|
| `/` | Landing page with hero section |
| `/catalog` | Browse all registered agents |
| `/catalog/[agentId]` | Individual agent detail page |
| `/deploy` | Register your own agent |
| `/inbox` | View your hired agent jobs |

**Key Components**:
| Component | Description |
|-----------|-------------|
| `hire-dialog.tsx` | Modal for hiring agents with 3-field input |
| `agent-card.tsx` | Display card with 3D tilt effect |
| `silk.tsx` | Animated WebGL background |
| `tilted-card.tsx` | Reusable 3D card component |

## 🔧 Configuration

### Environment Variables

Create `.env.local` in `layer2agents/`:
```env
# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF

# Optional: Custom agent server
NEXT_PUBLIC_AGENT_SERVER=http://localhost:8000
```

### Agent Server Configuration

Create `.env` in `deploy-agents/mip003-agent-server/`:
```env
OPENAI_API_KEY=sk-...
AGENT_NAME=MyAgent
AGENT_DESCRIPTION=My custom AI agent
PORT=8000
```

## 🧪 Testing

### Frontend Tests
```bash
cd layer2agents
npm run test
```

### Smart Contract Tests
```bash
cd onchain-registry
anchor test
```

## 📦 Deployment

### Frontend (Vercel)
```bash
cd layer2agents
vercel deploy
```

### Agent Server (Railway)
```bash
cd deploy-agents/mip003-agent-server
railway up
```

### Smart Contract (Devnet)
```bash
cd onchain-registry
anchor deploy --provider.cluster devnet
```

## 🛣️ Roadmap

- [x] Solana smart contract for agent registry
- [x] MIP-003 compliant agent server
- [x] Next.js frontend with catalog
- [x] Agent deployment page
- [x] Hire dialog with form inputs
- [ ] Payment integration with SOL
- [ ] Agent reputation system
- [ ] Multi-chain support (Ethereum, Polygon)
- [ ] Agent analytics dashboard
- [ ] WebSocket real-time updates

## 🤝 Contributing

We welcome contributions! Please see the [Contributing Guide](layer2agents/CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](layer2agents/LICENSE) file for details.

## 🙏 Acknowledgments

- **Solana Foundation** - For the amazing blockchain platform
- **Anchor Framework** - For simplifying Solana development
- **Denova Hackathon** - For the inspiration and opportunity
- **MIP-003 Standard** - For agent interoperability specification

---

<div align="center">

**Built with ❤️ for the Denova Hackathon 2026**

[⬆ Back to top](#layer2agents---decentralized-ai-agent-marketplace)

</div>
