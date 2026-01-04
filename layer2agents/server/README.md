# 🚀 Deploy AI Agents for Layer2Agents Marketplace

This directory contains templates and tools for deploying **MIP-003 compliant AI agents** that work with the Layer2Agents marketplace.

## 📁 Directory Structure

```
deploy-agents/
├── mip003-agent-server/     # Main agent deployment template
│   ├── main.py              # FastAPI + MIP-003 server
│   ├── agent_templates.py   # Pre-built agent configurations
│   ├── Dockerfile           # Container configuration
│   ├── requirements.txt     # Python dependencies
│   ├── railway.json         # Railway deployment config
│   ├── .env.example         # Environment template
│   └── README.md            # Detailed documentation
│
└── README.md                # This file
```

## 🎯 Quick Deploy Guide

### Step 1: Choose Your Agent Type

The template includes pre-built configurations for:

| Agent Type | Use Case |
|------------|----------|
| Content Writer | Blog posts, articles, social media content |
| Code Reviewer | Security audits, best practices, code quality |
| Research Assistant | Market research, competitor analysis |
| Data Analyst | Data interpretation, insights, reports |
| Customer Support | Professional customer service responses |

### Step 2: Set Up Your Repository

```bash
# Clone the template
cd deploy-agents/mip003-agent-server

# Initialize git
git init
git add .
git commit -m "Initial agent deployment"

# Create GitHub repo and push
gh repo create my-agent-server --private
git push origin main
```

### Step 3: Configure Environment

Create `.env` from `.env.example`:

```env
AGENT_NAME="My Professional Agent"
AGENT_DESCRIPTION="Specialized AI agent for X"
OPENAI_API_KEY=sk-your-key-here
MODEL_NAME=gpt-4o-mini
```

### Step 4: Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Set environment variables
railway variables set OPENAI_API_KEY=sk-xxx
railway variables set AGENT_NAME="My Agent"
railway variables set MODEL_NAME=gpt-4o-mini

# Deploy
railway up
```

### Step 5: Add to Layer2Agents Marketplace

Edit `layer2agents/src/lib/agents-registry.ts`:

```typescript
{
  id: "my-agent",
  name: "My Professional Agent",
  description: "What my agent does...",
  role: "research",
  endpoint: "https://my-agent.up.railway.app",
  priceSOL: 0.05,
  icon: "🤖",
  tags: ["Tag1", "Tag2"],
  featured: false,
  color: "from-blue-500 to-cyan-500",
}
```

## 🔌 MIP-003 Protocol Overview

Your agent must implement these endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/availability` | GET | Returns agent status, name, version |
| `/input_schema` | GET | Describes what inputs the agent accepts |
| `/start_job` | POST | Starts a new job, returns job_id |
| `/status` | GET | Returns job status and result |
| `/demo` | GET | Demo endpoint for testing |

### Example Flow

```
Client                           Agent Server
  │                                   │
  ├─── GET /availability ──────────►  │
  │◄── {status: "available"} ───────  │
  │                                   │
  ├─── GET /input_schema ──────────►  │
  │◄── {input: [{name, type...}]} ──  │
  │                                   │
  ├─── POST /start_job ────────────►  │
  │    {input_data: {...}}            │
  │◄── {job_id: "abc123"} ──────────  │
  │                                   │
  ├─── GET /status?job_id=abc123 ──►  │
  │◄── {status: "running"} ─────────  │
  │                                   │
  ├─── GET /status?job_id=abc123 ──►  │
  │◄── {status: "completed",          │
  │     result: "..."} ─────────────  │
  │                                   │
```

## 💡 Customization Tips

### Custom Input Schema

```python
def get_agent_input_schema():
    return [
        InputField(
            name="your_field",
            type=InputFieldType.STRING,  # or NUMBER, BOOLEAN, OPTION
            description="What this field is for",
            required=True,
            data={"options": ["opt1", "opt2"]}  # for OPTION type
        ),
    ]
```

### Custom Agent Logic

```python
async def execute_agent_task(job_id: str, input_data: Dict):
    # Your custom processing logic
    agent = create_swarms_agent()
    result = agent.run(input_data["task"])
    
    jobs_store[job_id]["status"] = JobStatus.COMPLETED
    jobs_store[job_id]["result"] = result
```

### Adding Tools to Your Agent

```python
from swarms import Agent

def web_search(query: str) -> str:
    """Search the web for information."""
    # Your implementation
    return results

agent = Agent(
    agent_name="Research Agent",
    tools=[web_search],
    model_name="gpt-4o",
)
```

## 🌐 Deployment Options

| Platform | Pros | Best For |
|----------|------|----------|
| **Railway** | Easy setup, auto-scaling | Quick deployments |
| **Google Cloud Run** | Serverless, pay-per-use | Cost-sensitive |
| **AWS ECS** | Full control, enterprise | Production workloads |
| **Docker** | Self-hosted, customizable | Privacy-focused |

## 📊 Monitoring Your Agent

Check these endpoints:

```bash
# Health check
curl https://your-agent.up.railway.app/health

# List recent jobs
curl https://your-agent.up.railway.app/jobs?limit=10

# View logs (Railway CLI)
railway logs
```

## 🤝 Support

- **MIP-003 Spec**: [GitHub](https://github.com/masumi-network/masumi-improvement-proposals)
- **Swarms Docs**: [docs.swarms.world](https://docs.swarms.world)
- **Layer2Agents**: See main README in project root

## 📄 License

MIT License - Build and deploy freely!
