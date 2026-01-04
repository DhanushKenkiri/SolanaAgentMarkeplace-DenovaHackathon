/**
 * Global State Management with Zustand
 * Manages jobs, wallet state, and UI state
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JobStatus } from "./mip003-client";

export interface Job {
  id: string;
  jobId: string;
  agentId: string;
  agentName: string;
  status: JobStatus;
  inputData: Record<string, unknown>;
  result?: Record<string, unknown> | string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  transactionSignature?: string;
  nftMint?: string;
}

interface Layer2AgentsState {
  // Jobs
  jobs: Job[];
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  removeJob: (jobId: string) => void;
  getJobsByStatus: (status: JobStatus) => Job[];

  // Wallet
  walletConnected: boolean;
  walletAddress: string | null;
  setWallet: (connected: boolean, address: string | null) => void;

  // UI State
  selectedAgentId: string | null;
  setSelectedAgent: (agentId: string | null) => void;
  isHireModalOpen: boolean;
  setHireModalOpen: (open: boolean) => void;
}

export const useStore = create<Layer2AgentsState>()(
  persist(
    (set, get) => ({
      // Jobs
      jobs: [],
      addJob: (job) =>
        set((state) => ({
          jobs: [job, ...state.jobs],
        })),
      updateJob: (jobId, updates) =>
        set((state) => ({
          jobs: state.jobs.map((job) =>
            job.jobId === jobId ? { ...job, ...updates, updatedAt: new Date().toISOString() } : job
          ),
        })),
      removeJob: (jobId) =>
        set((state) => ({
          jobs: state.jobs.filter((job) => job.jobId !== jobId),
        })),
      getJobsByStatus: (status) => get().jobs.filter((job) => job.status === status),

      // Wallet
      walletConnected: false,
      walletAddress: null,
      setWallet: (connected, address) =>
        set({
          walletConnected: connected,
          walletAddress: address,
        }),

      // UI State
      selectedAgentId: null,
      setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),
      isHireModalOpen: false,
      setHireModalOpen: (open) => set({ isHireModalOpen: open }),
    }),
    {
      name: "layer2agents-storage",
      partialize: (state) => ({
        jobs: state.jobs,
      }),
    }
  )
);
