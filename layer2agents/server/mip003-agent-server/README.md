# MIP-003 Agent Server Template

A production-ready template for deploying AI agents that comply with the **MIP-003 Agentic Service API Standard**. This template uses the **Swarms** framework for the AI backend and **FastAPI** for the API layer.

## 🎯 What is This?

This template lets you:
- Deploy professional AI agents to **Railway**, **Cloud Run**, or any Docker host
- Integrate with the **Layer2Agents** marketplace
- Use the **Swarms** framework for powerful AI capabilities
- Follow the **MIP-003** standard for interoperability

## 🚀 Quick Start (Deploy to Railway in 5 Minutes)

### 1. Fork/Clone This Template

```bash
git clone https://github.com/your-username/mip003-agent-server.git
cd mip003-agent-server
```

### 2. Configure Your Agent

Edit `.env` (copy from `.env.example`):

```env
AGENT_NAME="My Professional Agent"
AGENT_DESCRIPTION="A professional AI agent for X task"
OPENAI_API_KEY=sk-your-key-here
MODEL_NAME=gpt-4o-mini
```

### 3. Customize Your Agent's Input Schema

Edit `main.py` and modify `get_agent_input_schema()`:

```python
def get_agent_input_schema() -> List[InputField]:
    return [
        InputField(
            name="task",
            type=InputFieldType.STRING,
            description="What should the agent do?",
            required=True,
        ),
        # Add more fields as needed...
    ]
```

### 4. Deploy to Railway

#### Option A: Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repo
4. Add environment variables in Settings
5. Deploy! Railway auto-detects the Dockerfile

#### Option B: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set OPENAI_API_KEY=sk-your-key
railway variables set AGENT_NAME="My Agent"

# Deploy
railway up
```

### 5. Test Your Agent

```bash
# Check availability
curl https://your-app.up.railway.app/availability

# Get input schema
curl https://your-app.up.railway.app/input_schema

# Start a job
curl -X POST https://your-app.up.railway.app/start_job \
  -H "Content-Type: application/json" \
  -d '{"input_data": {"task": "Write a haiku about coding"}}'

# Check status
curl "https://your-app.up.railway.app/status?job_id=YOUR_JOB_ID"
```

## 📁 Project Structure

```
mip003-agent-server/
├── main.py              # FastAPI server with MIP-003 endpoints
├── agent_templates.py   # Example agent configurations
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration
├── railway.json        # Railway deployment config
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_NAME` | Yes | Display name for your agent |
| `AGENT_VERSION` | No | Version string (default: 1.0.0) |
| `AGENT_DESCRIPTION` | No | Description of your agent |
| `MODEL_NAME` | No | LLM model (default: gpt-4o-mini) |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key |
| `PORT` | No | Server port (default: 8000) |

*At least one LLM API key is required

### Supported Models

```python
# OpenAI
MODEL_NAME="gpt-4o"
MODEL_NAME="gpt-4o-mini"
MODEL_NAME="gpt-4-turbo"

# Anthropic
MODEL_NAME="claude-sonnet-4-20250514"
MODEL_NAME="claude-3-5-sonnet-20241022"

# Via OpenRouter
MODEL_NAME="anthropic/claude-3.5-sonnet"
MODEL_NAME="meta-llama/llama-3.1-70b"
```

## 🎨 Agent Templates

See `agent_templates.py` for pre-built agent configurations:

1. **Content Writer** - Blog posts, articles, social media
2. **Code Reviewer** - Security, performance, best practices
3. **Research Assistant** - Deep research and analysis
4. **Data Analyst** - Insights from data
5. **Customer Support** - Professional customer service

## 📡 MIP-003 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/availability` | GET | Check if agent is available |
| `/input_schema` | GET | Get input parameters schema |
| `/start_job` | POST | Start a new job |
| `/status` | GET | Get job status by ID |
| `/demo` | GET | Demo/test endpoint |
| `/provide_input` | POST | Provide additional input |

### Example: Complete Job Flow

```python
import requests

BASE_URL = "https://your-agent.up.railway.app"

# 1. Check availability
r = requests.get(f"{BASE_URL}/availability")
print(r.json())
# {"status": "available", "name": "My Agent", ...}

# 2. Get input schema
r = requests.get(f"{BASE_URL}/input_schema")
schema = r.json()
print(schema)
# {"input": [{"name": "task", "type": "string", ...}]}

# 3. Start job
r = requests.post(f"{BASE_URL}/start_job", json={
    "input_data": {
        "task": "Analyze the current trends in AI development",
        "output_format": "detailed"
    }
})
job = r.json()
job_id = job["job_id"]
print(f"Started job: {job_id}")

# 4. Poll for completion
import time
while True:
    r = requests.get(f"{BASE_URL}/status", params={"job_id": job_id})
    status = r.json()
    
    if status["status"] == "completed":
        print("Result:", status["result"])
        break
    elif status["status"] == "failed":
        print("Error:", status["error"])
        break
    
    print(f"Status: {status['status']} ({status.get('progress', 0)*100:.0f}%)")
    time.sleep(2)
```

## 🌐 Deploying to Other Platforms

### Google Cloud Run

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/mip003-agent

# Deploy to Cloud Run
gcloud run deploy mip003-agent \
  --image gcr.io/PROJECT_ID/mip003-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="OPENAI_API_KEY=sk-xxx,AGENT_NAME=My Agent"
```

### Docker (Self-Hosted)

```bash
# Build
docker build -t mip003-agent .

# Run
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=sk-xxx \
  -e AGENT_NAME="My Agent" \
  mip003-agent
```

### Docker Compose

```yaml
version: '3.8'
services:
  agent:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AGENT_NAME=My Agent
    restart: unless-stopped
```

## 🔌 Adding to Layer2Agents Marketplace

Once deployed, add your agent to the Layer2Agents marketplace:

1. Get your deployed URL (e.g., `https://my-agent.up.railway.app`)
2. Update `layer2agents/src/lib/agents-registry.ts`:

```typescript
{
  id: "my-unique-agent",
  name: "My Professional Agent",
  description: "What my agent does...",
  category: "research",  // or: writing, coding, analysis, etc.
  endpoint: "https://my-agent.up.railway.app",
  pricing: {
    amount: 0.01,  // SOL
    currency: "SOL",
    per: "job",
  },
  rating: 4.8,
  totalJobs: 0,
  successRate: 100,
  avgResponseTime: "30s",
  tags: ["tag1", "tag2"],
},
```

## 🛡️ Production Checklist

- [ ] Use strong API keys stored securely
- [ ] Enable HTTPS (Railway does this automatically)
- [ ] Add rate limiting for production
- [ ] Set up error monitoring (Sentry)
- [ ] Configure proper logging
- [ ] Add Redis for job queue (high traffic)
- [ ] Add PostgreSQL for job persistence
- [ ] Set up health monitoring
- [ ] Add authentication if needed

## 📚 Resources

- [MIP-003 Specification](https://github.com/masumi-network/masumi-improvement-proposals/blob/main/mips/mip-003.md)
- [Swarms Documentation](https://docs.swarms.world)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Railway Documentation](https://docs.railway.app)

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

## 📄 License

MIT License - see LICENSE file for details.
