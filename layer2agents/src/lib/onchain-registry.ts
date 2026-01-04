/**
 * On-Chain Agent Registry Client
 * 
 * Fetches agent data from the Solana-based on-chain registry.
 * Falls back to static registry if on-chain data is unavailable.
 */

import {
  Connection,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import { AGENT_REGISTRY, AgentConfig, AgentRole } from "./agents-registry";

// ============================================================================
// Configuration
// ============================================================================

/** Program ID for the Agent Registry on devnet */
export const AGENT_REGISTRY_PROGRAM_ID = new PublicKey(
  "DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF"
);

/** Solana devnet connection */
const DEVNET_CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");

/** Seeds for PDA derivation */
const REGISTRY_SEED = Buffer.from("registry");
const AGENT_SEED = Buffer.from("agent");

// ============================================================================
// Types
// ============================================================================

export enum OnChainAgentStatus {
  Active = 0,
  Paused = 1,
  Deprecated = 2,
}

export interface OnChainAgent {
  owner: PublicKey;
  agentId: string;
  name: string;
  description: string;
  apiUrl: string;
  tags: string[];
  pricePerTask: bigint;
  acceptedPaymentTokens: PublicKey[];
  metadataUri: string;
  status: OnChainAgentStatus;
  createdAt: bigint;
  updatedAt: bigint;
  totalTasksCompleted: bigint;
  totalEarnings: bigint;
  ratingSum: bigint;
  ratingCount: bigint;
  bump: number;
}

// ============================================================================
// PDA Derivation
// ============================================================================

export function getRegistryAddress(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [REGISTRY_SEED],
    AGENT_REGISTRY_PROGRAM_ID
  );
}

export function getAgentAddress(agentId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGENT_SEED, Buffer.from(agentId)],
    AGENT_REGISTRY_PROGRAM_ID
  );
}

// ============================================================================
// Decoding Functions
// ============================================================================

function decodeString(data: Buffer, offset: number): [string, number] {
  const len = data.readUInt32LE(offset);
  const str = data.slice(offset + 4, offset + 4 + len).toString("utf-8");
  return [str, 4 + len];
}

function decodeStringArray(data: Buffer, offset: number): [string[], number] {
  const count = data.readUInt32LE(offset);
  let currentOffset = 4;
  const strings: string[] = [];

  for (let i = 0; i < count; i++) {
    const [str, len] = decodeString(data, offset + currentOffset);
    strings.push(str);
    currentOffset += len;
  }

  return [strings, currentOffset];
}

function decodePubkeyArray(data: Buffer, offset: number): [PublicKey[], number] {
  const count = data.readUInt32LE(offset);
  let currentOffset = 4;
  const pubkeys: PublicKey[] = [];

  for (let i = 0; i < count; i++) {
    pubkeys.push(new PublicKey(data.slice(offset + currentOffset, offset + currentOffset + 32)));
    currentOffset += 32;
  }

  return [pubkeys, currentOffset];
}

function decodeAgentData(data: Buffer): OnChainAgent {
  // Skip 8-byte Anchor discriminator
  let offset = 8;

  const owner = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const [agentId, agentIdLen] = decodeString(data, offset);
  offset += agentIdLen;

  const [name, nameLen] = decodeString(data, offset);
  offset += nameLen;

  const [description, descLen] = decodeString(data, offset);
  offset += descLen;

  const [apiUrl, apiLen] = decodeString(data, offset);
  offset += apiLen;

  const [tags, tagsLen] = decodeStringArray(data, offset);
  offset += tagsLen;

  const pricePerTask = data.readBigUInt64LE(offset);
  offset += 8;

  const [acceptedPaymentTokens, tokensLen] = decodePubkeyArray(data, offset);
  offset += tokensLen;

  const [metadataUri, metaLen] = decodeString(data, offset);
  offset += metaLen;

  const status = data[offset] as OnChainAgentStatus;
  offset += 1;

  const createdAt = data.readBigInt64LE(offset);
  offset += 8;

  const updatedAt = data.readBigInt64LE(offset);
  offset += 8;

  const totalTasksCompleted = data.readBigUInt64LE(offset);
  offset += 8;

  const totalEarnings = data.readBigUInt64LE(offset);
  offset += 8;

  const ratingSum = data.readBigUInt64LE(offset);
  offset += 8;

  const ratingCount = data.readBigUInt64LE(offset);
  offset += 8;

  const bump = data[offset];

  return {
    owner,
    agentId,
    name,
    description,
    apiUrl,
    tags,
    pricePerTask,
    acceptedPaymentTokens,
    metadataUri,
    status,
    createdAt,
    updatedAt,
    totalTasksCompleted,
    totalEarnings,
    ratingSum,
    ratingCount,
    bump,
  };
}

// ============================================================================
// Conversion Functions
// ============================================================================

function inferRoleFromTags(tags: string[]): AgentRole {
  const tagLower = tags.map(t => t.toLowerCase());
  
  if (tagLower.some(t => ["sales", "outreach", "b2b", "lead"].includes(t))) {
    return "sales";
  }
  if (tagLower.some(t => ["research", "analysis", "market", "intel"].includes(t))) {
    return "research";
  }
  if (tagLower.some(t => ["code", "development", "programming", "engineering"].includes(t))) {
    return "development";
  }
  if (tagLower.some(t => ["writing", "content", "seo", "copywriting"].includes(t))) {
    return "writing";
  }
  if (tagLower.some(t => ["data", "analytics", "statistics", "insights"].includes(t))) {
    return "analysis";
  }
  if (tagLower.some(t => ["design", "ui", "ux", "creative"].includes(t))) {
    return "design";
  }
  
  return "analysis"; // Default
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

function onChainAgentToConfig(agent: OnChainAgent): AgentConfig {
  const role = inferRoleFromTags(agent.tags);
  
  return {
    id: agent.agentId,
    address: agent.owner.toBase58(), // Use owner public key as the agent address
    name: agent.name,
    description: agent.description,
    role,
    endpoint: agent.apiUrl,
    priceSOL: Number(agent.pricePerTask) / 1e9, // Convert lamports to SOL
    icon: getRoleIcon(role),
    tags: agent.tags,
    featured: agent.totalTasksCompleted > BigInt(10) || agent.ratingCount > BigInt(5),
    color: getRoleColor(role),
  };
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Fetch all agents from the on-chain registry
 */
export async function fetchOnChainAgents(
  connection: Connection = DEVNET_CONNECTION
): Promise<AgentConfig[]> {
  try {
    const accounts = await connection.getProgramAccounts(AGENT_REGISTRY_PROGRAM_ID, {
      commitment: "confirmed",
    });

    const agents: AgentConfig[] = [];

    for (const { account } of accounts) {
      try {
        // Only decode accounts that are large enough to be Agent accounts
        if (account.data.length > 200) {
          const agentData = decodeAgentData(account.data);
          
          // Only include active agents with valid API URLs
          if (agentData.status === OnChainAgentStatus.Active && agentData.apiUrl) {
            agents.push(onChainAgentToConfig(agentData));
          }
        }
      } catch {
        // Skip accounts that don't decode properly (e.g., Registry account)
        continue;
      }
    }

    return agents;
  } catch (error) {
    console.error("Failed to fetch on-chain agents:", error);
    return [];
  }
}

/**
 * Fetch a specific agent by ID from on-chain
 */
export async function fetchOnChainAgent(
  agentId: string,
  connection: Connection = DEVNET_CONNECTION
): Promise<AgentConfig | null> {
  try {
    const [agentAddress] = getAgentAddress(agentId);
    const accountInfo = await connection.getAccountInfo(agentAddress);

    if (!accountInfo) {
      return null;
    }

    const agentData = decodeAgentData(accountInfo.data);
    return onChainAgentToConfig(agentData);
  } catch (error) {
    console.error(`Failed to fetch agent ${agentId}:`, error);
    return null;
  }
}

/**
 * Get all available agents, combining on-chain and static registry
 * On-chain agents take precedence over static ones with the same ID
 */
export async function getAllAgents(
  useOnChain: boolean = true
): Promise<AgentConfig[]> {
  let onChainAgents: AgentConfig[] = [];

  if (useOnChain) {
    try {
      onChainAgents = await fetchOnChainAgents();
    } catch (error) {
      console.warn("Failed to fetch on-chain agents, using static registry:", error);
    }
  }

  // Merge: on-chain agents take precedence
  const onChainIds = new Set(onChainAgents.map(a => a.id));
  const staticAgents = AGENT_REGISTRY.filter(a => !onChainIds.has(a.id));

  return [...onChainAgents, ...staticAgents];
}

/**
 * Get an agent by ID, checking on-chain first, then static registry
 */
export async function getAgentById(
  id: string,
  useOnChain: boolean = true
): Promise<AgentConfig | undefined> {
  if (useOnChain) {
    const onChainAgent = await fetchOnChainAgent(id);
    if (onChainAgent) {
      return onChainAgent;
    }
  }

  // Fallback to static registry
  return AGENT_REGISTRY.find(agent => agent.id === id);
}

/**
 * Get only agents that have working API endpoints
 */
export async function getAvailableAgents(
  useOnChain: boolean = true
): Promise<AgentConfig[]> {
  const allAgents = await getAllAgents(useOnChain);
  return allAgents.filter(agent => agent.endpoint !== "");
}

/**
 * Get agents by role/category
 */
export async function getAgentsByRole(
  role: AgentRole,
  useOnChain: boolean = true
): Promise<AgentConfig[]> {
  const allAgents = await getAllAgents(useOnChain);
  return allAgents.filter(agent => agent.role === role);
}

/**
 * Get featured agents
 */
export async function getFeaturedAgents(
  useOnChain: boolean = true
): Promise<AgentConfig[]> {
  const allAgents = await getAllAgents(useOnChain);
  return allAgents.filter(agent => agent.featured);
}

/**
 * Search agents by tag
 */
export async function searchAgentsByTag(
  tag: string,
  useOnChain: boolean = true
): Promise<AgentConfig[]> {
  const allAgents = await getAllAgents(useOnChain);
  const tagLower = tag.toLowerCase();
  return allAgents.filter(agent =>
    agent.tags.some(t => t.toLowerCase().includes(tagLower))
  );
}

// ============================================================================
// React Hook (for use in components)
// ============================================================================

/**
 * Custom hook to fetch agents with loading state
 * Import this in your React components:
 * 
 * ```tsx
 * import { useOnChainAgents } from "@/lib/onchain-registry";
 * 
 * function AgentList() {
 *   const { agents, loading, error } = useOnChainAgents();
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   
 *   return agents.map(agent => <AgentCard key={agent.id} agent={agent} />);
 * }
 * ```
 */
export function createAgentFetcher() {
  let cachedAgents: AgentConfig[] | null = null;
  let cacheTimestamp: number = 0;
  const CACHE_DURATION = 60000; // 1 minute cache

  return async function fetchAgents(forceRefresh: boolean = false): Promise<AgentConfig[]> {
    const now = Date.now();
    
    if (!forceRefresh && cachedAgents && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedAgents;
    }

    const agents = await getAllAgents(true);
    cachedAgents = agents;
    cacheTimestamp = now;
    
    return agents;
  };
}

// Export a default fetcher instance
export const agentFetcher = createAgentFetcher();
