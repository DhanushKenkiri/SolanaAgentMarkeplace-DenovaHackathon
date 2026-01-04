/**
 * Hybrid Agent Registry
 * 
 * This registry supports both on-chain (Solana) and off-chain (API/Database) modes.
 * Use off-chain mode while the Solana program is being deployed.
 */

import { AGENT_REGISTRY, AgentConfig, AgentRole } from "./agents-registry";

// ============================================================================
// Configuration
// ============================================================================

export type RegistryMode = "onchain" | "offchain" | "static";

// Set this based on your deployment status
export const REGISTRY_MODE: RegistryMode = "onchain"; // ✅ On-chain deployed: DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF

// Off-chain API endpoint (if using a backend)
export const OFFCHAIN_API_URL = process.env.NEXT_PUBLIC_REGISTRY_API_URL || "";

// ============================================================================
// Off-Chain Registry (API-based)
// ============================================================================

interface OffChainAgent {
  id: string;
  name: string;
  description: string;
  apiUrl: string;
  tags: string[];
  pricePerTask: number;
  currency: string;
  owner: string;
  status: "active" | "paused" | "deprecated";
  rating: number;
  totalTasks: number;
  createdAt: string;
  updatedAt: string;
}

async function fetchFromAPI<T>(endpoint: string): Promise<T | null> {
  if (!OFFCHAIN_API_URL) return null;
  
  try {
    const response = await fetch(`${OFFCHAIN_API_URL}${endpoint}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch from API: ${endpoint}`, error);
    return null;
  }
}

function offChainToConfig(agent: OffChainAgent): AgentConfig {
  const role = inferRoleFromTags(agent.tags);
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    role,
    endpoint: agent.apiUrl,
    priceSOL: agent.pricePerTask,
    icon: getRoleIcon(role),
    tags: agent.tags,
    featured: agent.totalTasks > 10 || agent.rating > 4.5,
    color: getRoleColor(role),
  };
}

// ============================================================================
// Role Helpers
// ============================================================================

function inferRoleFromTags(tags: string[]): AgentRole {
  const tagLower = tags.map(t => t.toLowerCase());
  
  if (tagLower.some(t => ["sales", "outreach", "b2b", "lead"].includes(t))) return "sales";
  if (tagLower.some(t => ["research", "analysis", "market"].includes(t))) return "research";
  if (tagLower.some(t => ["code", "development", "programming"].includes(t))) return "development";
  if (tagLower.some(t => ["writing", "content", "seo"].includes(t))) return "writing";
  if (tagLower.some(t => ["data", "analytics", "statistics"].includes(t))) return "analysis";
  if (tagLower.some(t => ["design", "ui", "ux"].includes(t))) return "design";
  
  return "analysis";
}

function getRoleColor(role: AgentRole): string {
  const colors: Record<AgentRole, string> = {
    sales: "from-blue-500 to-cyan-500",
    research: "from-purple-500 to-pink-500",
    development: "from-orange-500 to-red-500",
    writing: "from-green-500 to-emerald-500",
    analysis: "from-cyan-500 to-blue-500",
    design: "from-pink-500 to-rose-500",
  };
  return colors[role];
}

function getRoleIcon(role: AgentRole): string {
  const icons: Record<AgentRole, string> = {
    sales: "📧",
    research: "🔬",
    development: "💻",
    writing: "✍️",
    analysis: "📈",
    design: "🎨",
  };
  return icons[role];
}

// ============================================================================
// Unified API
// ============================================================================

/**
 * Get all agents from the configured registry source
 */
export async function getAllAgentsHybrid(): Promise<AgentConfig[]> {
  switch (REGISTRY_MODE) {
    case "onchain":
      // Import dynamically to avoid loading Solana deps when not needed
      const { getAllAgents } = await import("./onchain-registry");
      return getAllAgents(true);
    
    case "offchain":
      const agents = await fetchFromAPI<OffChainAgent[]>("/agents");
      if (agents) {
        return agents.map(offChainToConfig);
      }
      // Fall through to static
    
    case "static":
    default:
      return AGENT_REGISTRY;
  }
}

/**
 * Get a single agent by ID
 */
export async function getAgentByIdHybrid(id: string): Promise<AgentConfig | undefined> {
  switch (REGISTRY_MODE) {
    case "onchain":
      const { getAgentById } = await import("./onchain-registry");
      return getAgentById(id, true);
    
    case "offchain":
      const agent = await fetchFromAPI<OffChainAgent>(`/agents/${id}`);
      if (agent) {
        return offChainToConfig(agent);
      }
      // Fall through to static
    
    case "static":
    default:
      return AGENT_REGISTRY.find(a => a.id === id);
  }
}

/**
 * Get available agents (with working endpoints)
 */
export async function getAvailableAgentsHybrid(): Promise<AgentConfig[]> {
  const all = await getAllAgentsHybrid();
  return all.filter(agent => agent.endpoint !== "");
}

/**
 * Get agents by role
 */
export async function getAgentsByRoleHybrid(role: AgentRole): Promise<AgentConfig[]> {
  const all = await getAllAgentsHybrid();
  return all.filter(agent => agent.role === role);
}

/**
 * Search agents by tag
 */
export async function searchAgentsHybrid(query: string): Promise<AgentConfig[]> {
  const all = await getAllAgentsHybrid();
  const q = query.toLowerCase();
  return all.filter(agent => 
    agent.name.toLowerCase().includes(q) ||
    agent.description.toLowerCase().includes(q) ||
    agent.tags.some(t => t.toLowerCase().includes(q))
  );
}

// ============================================================================
// Status Check
// ============================================================================

/**
 * Check the status of the registry
 */
export async function getRegistryStatus(): Promise<{
  mode: RegistryMode;
  available: boolean;
  agentCount: number;
  message: string;
}> {
  try {
    const agents = await getAllAgentsHybrid();
    return {
      mode: REGISTRY_MODE,
      available: true,
      agentCount: agents.length,
      message: `Registry operational (${REGISTRY_MODE} mode)`,
    };
  } catch (error) {
    return {
      mode: REGISTRY_MODE,
      available: false,
      agentCount: 0,
      message: `Registry error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
