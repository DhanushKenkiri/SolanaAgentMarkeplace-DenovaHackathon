/**
 * Agent Registry Configuration
 * Central registry for all MIP-003 compliant agents in the marketplace
 */

export type AgentRole = "sales" | "research" | "development" | "writing" | "analysis" | "design";

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  endpoint: string;
  priceSOL: number;
  icon: string;
  tags: string[];
  featured: boolean;
  color: string;
}

export const AGENT_REGISTRY: AgentConfig[] = [
  {
    id: "cold-outreach-agent",
    name: "Cold Outreach Email Agent",
    description: "AI-powered personalized cold outreach email generator for B2B sales and business development. Creates compelling, professional emails tailored to your prospects.",
    role: "sales",
    endpoint: "https://web-production-9afa9.up.railway.app",
    priceSOL: 0.05,
    icon: "📧",
    tags: ["B2B", "Sales", "Email", "Outreach", "Lead Generation"],
    featured: true,
    color: "from-blue-500 to-cyan-500",
  },
  // Placeholder for future agents
  {
    id: "research-agent",
    name: "Deep Research Agent",
    description: "Comprehensive research assistant that analyzes markets, competitors, and trends. Delivers structured reports with actionable insights.",
    role: "research",
    endpoint: "", // Coming soon
    priceSOL: 0.08,
    icon: "🔬",
    tags: ["Research", "Analysis", "Reports", "Market Intel"],
    featured: false,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "seo-agent",
    name: "SEO Optimization Agent",
    description: "Analyzes your content and provides SEO recommendations, keyword strategies, and content optimization suggestions.",
    role: "analysis",
    endpoint: "", // Coming soon
    priceSOL: 0.06,
    icon: "📈",
    tags: ["SEO", "Content", "Keywords", "Optimization"],
    featured: false,
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "code-review-agent",
    name: "Code Review Agent",
    description: "Reviews your code for bugs, security vulnerabilities, and best practices. Supports multiple languages and frameworks.",
    role: "development",
    endpoint: "", // Coming soon
    priceSOL: 0.07,
    icon: "💻",
    tags: ["Code", "Review", "Security", "Best Practices"],
    featured: false,
    color: "from-orange-500 to-red-500",
  },
];

export const ROLE_CONFIG: Record<AgentRole, { label: string; color: string }> = {
  sales: { label: "Sales", color: "bg-blue-500" },
  research: { label: "Research", color: "bg-purple-500" },
  development: { label: "Development", color: "bg-orange-500" },
  writing: { label: "Writing", color: "bg-green-500" },
  analysis: { label: "Analysis", color: "bg-cyan-500" },
  design: { label: "Design", color: "bg-pink-500" },
};

export function getAgentById(id: string): AgentConfig | undefined {
  return AGENT_REGISTRY.find((agent) => agent.id === id);
}

export function getAvailableAgents(): AgentConfig[] {
  return AGENT_REGISTRY.filter((agent) => agent.endpoint !== "");
}

export function getAgentsByRole(role: AgentRole): AgentConfig[] {
  return AGENT_REGISTRY.filter((agent) => agent.role === role);
}

export function getFeaturedAgents(): AgentConfig[] {
  return AGENT_REGISTRY.filter((agent) => agent.featured);
}

/**
 * How to add your own agent to the marketplace:
 * 
 * 1. Deploy your MIP-003 compliant agent using the template at:
 *    /deploy-agents/mip003-agent-server/
 * 
 * 2. Add your agent config to the AGENT_REGISTRY array above:
 *    {
 *      id: "your-unique-agent-id",
 *      name: "Your Agent Name",
 *      description: "What your agent does...",
 *      role: "research" | "sales" | "writing" | etc.,
 *      endpoint: "https://your-agent.up.railway.app",
 *      priceSOL: 0.05,
 *      icon: "🤖",
 *      tags: ["Tag1", "Tag2"],
 *      featured: false,
 *      color: "from-blue-500 to-cyan-500",
 *    }
 * 
 * 3. Test your agent is accessible via the /availability endpoint
 * 
 * 4. Your agent will appear in the marketplace catalog!
 * 
 * See /deploy-agents/README.md for full deployment instructions.
 */
