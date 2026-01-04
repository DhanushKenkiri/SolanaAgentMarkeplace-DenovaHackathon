"use client";

/**
 * React Hooks for On-Chain Agent Registry
 * 
 * Use these hooks to fetch agent data from the Solana blockchain
 * in your React components.
 */

import { useState, useEffect, useCallback } from "react";
import { AgentConfig, AgentRole } from "./agents-registry";
import {
  getAllAgents,
  getAgentById,
  getAvailableAgents,
  getAgentsByRole,
  getFeaturedAgents,
  searchAgentsByTag,
  agentFetcher,
} from "./onchain-registry";

// ============================================================================
// Types
// ============================================================================

export interface UseAgentsResult {
  agents: AgentConfig[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseAgentResult {
  agent: AgentConfig | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all agents from the registry
 * 
 * @param useOnChain - Whether to fetch from on-chain (default: true)
 * @returns Object with agents, loading, error, and refetch function
 * 
 * @example
 * ```tsx
 * function AgentList() {
 *   const { agents, loading, error } = useAgents();
 *   
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   
 *   return (
 *     <div className="grid grid-cols-3 gap-4">
 *       {agents.map(agent => (
 *         <AgentCard key={agent.id} agent={agent} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgents(useOnChain: boolean = true): UseAgentsResult {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAllAgents(useOnChain);
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agents");
    } finally {
      setLoading(false);
    }
  }, [useOnChain]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

/**
 * Fetch a single agent by ID
 * 
 * @param id - The agent ID to fetch
 * @param useOnChain - Whether to fetch from on-chain (default: true)
 * @returns Object with agent, loading, error, and refetch function
 * 
 * @example
 * ```tsx
 * function AgentDetail({ agentId }: { agentId: string }) {
 *   const { agent, loading, error } = useAgent(agentId);
 *   
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!agent) return <NotFound />;
 *   
 *   return <AgentProfile agent={agent} />;
 * }
 * ```
 */
export function useAgent(id: string, useOnChain: boolean = true): UseAgentResult {
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAgentById(id, useOnChain);
      setAgent(data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agent");
    } finally {
      setLoading(false);
    }
  }, [id, useOnChain]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { agent, loading, error, refetch: fetchAgent };
}

/**
 * Fetch only available agents (with working endpoints)
 * 
 * @param useOnChain - Whether to fetch from on-chain (default: true)
 * @returns Object with agents, loading, error, and refetch function
 */
export function useAvailableAgents(useOnChain: boolean = true): UseAgentsResult {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAvailableAgents(useOnChain);
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch available agents");
    } finally {
      setLoading(false);
    }
  }, [useOnChain]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

/**
 * Fetch agents filtered by role/category
 * 
 * @param role - The role to filter by
 * @param useOnChain - Whether to fetch from on-chain (default: true)
 * @returns Object with agents, loading, error, and refetch function
 * 
 * @example
 * ```tsx
 * function SalesAgents() {
 *   const { agents, loading } = useAgentsByRole("sales");
 *   // ...
 * }
 * ```
 */
export function useAgentsByRole(role: AgentRole, useOnChain: boolean = true): UseAgentsResult {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAgentsByRole(role, useOnChain);
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agents by role");
    } finally {
      setLoading(false);
    }
  }, [role, useOnChain]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

/**
 * Fetch featured agents
 * 
 * @param useOnChain - Whether to fetch from on-chain (default: true)
 * @returns Object with agents, loading, error, and refetch function
 */
export function useFeaturedAgents(useOnChain: boolean = true): UseAgentsResult {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getFeaturedAgents(useOnChain);
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch featured agents");
    } finally {
      setLoading(false);
    }
  }, [useOnChain]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

/**
 * Search agents by tag
 * 
 * @param tag - The tag to search for
 * @param useOnChain - Whether to fetch from on-chain (default: true)
 * @returns Object with agents, loading, error, and refetch function
 * 
 * @example
 * ```tsx
 * function SearchResults({ searchTerm }: { searchTerm: string }) {
 *   const { agents, loading } = useAgentSearch(searchTerm);
 *   // ...
 * }
 * ```
 */
export function useAgentSearch(tag: string, useOnChain: boolean = true): UseAgentsResult {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!tag.trim()) {
      setAgents([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await searchAgentsByTag(tag, useOnChain);
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search agents");
    } finally {
      setLoading(false);
    }
  }, [tag, useOnChain]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

/**
 * Cached agent fetcher with automatic refresh
 * 
 * Uses a shared cache to avoid redundant network calls.
 * Good for frequently accessed agent lists.
 * 
 * @param forceRefresh - Force refresh the cache (default: false)
 * @returns Object with agents, loading, error, and refetch function
 */
export function useCachedAgents(forceRefresh: boolean = false): UseAgentsResult {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await agentFetcher(forceRefresh);
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agents");
    } finally {
      setLoading(false);
    }
  }, [forceRefresh]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}
