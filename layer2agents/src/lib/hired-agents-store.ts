/**
 * Store for managing hired agents with mock flow
 * Simulates the full hire -> provisioning -> active flow
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AgentConfig } from "./agents-registry";

export type HiredAgentStatus = 
  | "pending_payment" 
  | "payment_confirmed" 
  | "provisioning" 
  | "active" 
  | "failed";

export interface HiredAgent {
  id: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  agentColor: string;
  agentDescription: string;
  status: HiredAgentStatus;
  hiredAt: string;
  activatedAt?: string;
  transactionSignature?: string;
  monthlyPrice: number;
  tasksCompleted: number;
  lastActivity?: string;
  walletAddress: string;
}

interface HiredAgentsState {
  // Hired agents list
  hiredAgents: HiredAgent[];
  
  // Add a new hired agent (starts provisioning flow)
  hireAgent: (agent: AgentConfig, walletAddress: string, txSignature?: string) => string;
  
  // Update agent status (for mock flow)
  updateAgentStatus: (id: string, status: HiredAgentStatus) => void;
  
  // Remove/cancel a hired agent
  removeHiredAgent: (id: string) => void;
  
  // Get agents by status
  getAgentsByStatus: (status: HiredAgentStatus) => HiredAgent[];
  
  // Check if an agent is already hired
  isAgentHired: (agentId: string) => boolean;
  
  // Get hired agent by agentId
  getHiredAgent: (agentId: string) => HiredAgent | undefined;
  
  // Increment tasks completed
  incrementTasksCompleted: (id: string) => void;
  
  // Clear all (for testing)
  clearAll: () => void;
}

// Store provisioning timeouts to simulate activation
const provisioningTimeouts: Map<string, NodeJS.Timeout> = new Map();

export const useHiredAgentsStore = create<HiredAgentsState>()(
  persist(
    (set, get) => ({
      hiredAgents: [],
      
      hireAgent: (agent, walletAddress, txSignature) => {
        const id = crypto.randomUUID();
        const newHiredAgent: HiredAgent = {
          id,
          agentId: agent.id,
          agentName: agent.name,
          agentIcon: agent.icon,
          agentColor: agent.color,
          agentDescription: agent.description,
          status: "payment_confirmed",
          hiredAt: new Date().toISOString(),
          transactionSignature: txSignature,
          monthlyPrice: agent.priceSOL,
          tasksCompleted: 0,
          walletAddress,
        };
        
        set((state) => ({
          hiredAgents: [newHiredAgent, ...state.hiredAgents],
        }));
        
        // Simulate provisioning flow - move to provisioning after 1 second
        setTimeout(() => {
          set((state) => ({
            hiredAgents: state.hiredAgents.map((a) =>
              a.id === id ? { ...a, status: "provisioning" as HiredAgentStatus } : a
            ),
          }));
          
          // Then activate after 2-4 minutes (randomized for realism)
          // For demo purposes, using 30 seconds to 1 minute
          const activationDelay = 30000 + Math.random() * 30000; // 30-60 seconds
          
          const timeout = setTimeout(() => {
            set((state) => ({
              hiredAgents: state.hiredAgents.map((a) =>
                a.id === id 
                  ? { 
                      ...a, 
                      status: "active" as HiredAgentStatus,
                      activatedAt: new Date().toISOString(),
                    } 
                  : a
              ),
            }));
            provisioningTimeouts.delete(id);
          }, activationDelay);
          
          provisioningTimeouts.set(id, timeout);
        }, 1000);
        
        return id;
      },
      
      updateAgentStatus: (id, status) => {
        set((state) => ({
          hiredAgents: state.hiredAgents.map((a) =>
            a.id === id 
              ? { 
                  ...a, 
                  status,
                  ...(status === "active" ? { activatedAt: new Date().toISOString() } : {}),
                } 
              : a
          ),
        }));
      },
      
      removeHiredAgent: (id) => {
        // Clear any pending timeout
        const timeout = provisioningTimeouts.get(id);
        if (timeout) {
          clearTimeout(timeout);
          provisioningTimeouts.delete(id);
        }
        
        set((state) => ({
          hiredAgents: state.hiredAgents.filter((a) => a.id !== id),
        }));
      },
      
      getAgentsByStatus: (status) => {
        return get().hiredAgents.filter((a) => a.status === status);
      },
      
      isAgentHired: (agentId) => {
        return get().hiredAgents.some(
          (a) => a.agentId === agentId && (a.status === "active" || a.status === "provisioning" || a.status === "payment_confirmed")
        );
      },
      
      getHiredAgent: (agentId) => {
        return get().hiredAgents.find((a) => a.agentId === agentId);
      },
      
      incrementTasksCompleted: (id) => {
        set((state) => ({
          hiredAgents: state.hiredAgents.map((a) =>
            a.id === id 
              ? { 
                  ...a, 
                  tasksCompleted: a.tasksCompleted + 1,
                  lastActivity: new Date().toISOString(),
                } 
              : a
          ),
        }));
      },
      
      clearAll: () => {
        // Clear all timeouts
        provisioningTimeouts.forEach((timeout) => clearTimeout(timeout));
        provisioningTimeouts.clear();
        
        set({ hiredAgents: [] });
      },
    }),
    {
      name: "layer2agents-hired-agents",
    }
  )
);

// Helper to format relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Helper to get status display info
export function getStatusInfo(status: HiredAgentStatus): { 
  label: string; 
  color: string; 
  bgColor: string;
  description: string;
} {
  switch (status) {
    case "pending_payment":
      return {
        label: "Pending Payment",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/20",
        description: "Waiting for payment confirmation",
      };
    case "payment_confirmed":
      return {
        label: "Payment Confirmed",
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        description: "Payment received, starting provisioning...",
      };
    case "provisioning":
      return {
        label: "Provisioning",
        color: "text-indigo-400",
        bgColor: "bg-indigo-500/20",
        description: "Setting up your agent instance...",
      };
    case "active":
      return {
        label: "Active",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/20",
        description: "Agent is ready to work",
      };
    case "failed":
      return {
        label: "Failed",
        color: "text-red-400",
        bgColor: "bg-red-500/20",
        description: "Something went wrong",
      };
  }
}
