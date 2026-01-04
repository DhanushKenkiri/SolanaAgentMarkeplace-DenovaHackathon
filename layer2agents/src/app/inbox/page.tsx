"use client";

import { useEffect, useState, useCallback } from "react";
import { Inbox, RefreshCw, Trash2 } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { useStore } from "@/lib/store";
import { MIP003Client } from "@/lib/mip003-client";
import { getAgentById } from "@/lib/agents-registry";
import Link from "next/link";

export default function InboxPage() {
  const { jobs, updateJob, removeJob } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const refreshJob = useCallback(async (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId);
    if (!job) return;

    const agent = getAgentById(job.agentId);
    if (!agent?.endpoint) return;

    try {
      const client = new MIP003Client(agent.endpoint);
      const status = await client.getJobStatus(jobId);
      
      updateJob(jobId, {
        status: status.status,
        result: status.result,
        error: status.error,
      });
    } catch (error) {
      console.error("Failed to refresh job:", error);
    }
  }, [jobs, updateJob]);

  // Auto-refresh active jobs
  useEffect(() => {
    const activeJobs = jobs.filter(
      (j) => j.status === "pending" || j.status === "in_progress" || j.status === "running"
    );

    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      activeJobs.forEach((job) => refreshJob(job.jobId));
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [jobs, refreshJob]);

  const refreshAllJobs = async () => {
    setIsRefreshing(true);
    
    const activeJobs = jobs.filter(
      (j) => j.status === "pending" || j.status === "in_progress" || j.status === "running"
    );

    await Promise.all(activeJobs.map((job) => refreshJob(job.jobId)));
    
    setIsRefreshing(false);
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter === "active") {
      return ["pending", "in_progress", "running", "awaiting_payment", "awaiting_input"].includes(
        job.status
      );
    }
    if (filter === "completed") {
      return ["completed", "failed"].includes(job.status);
    }
    return true;
  });

  const activeCount = jobs.filter((j) =>
    ["pending", "in_progress", "running"].includes(j.status)
  ).length;

  const completedCount = jobs.filter((j) => j.status === "completed").length;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Task <span className="gradient-text">Inbox</span>
            </h1>
            <p className="text-gray-400">
              Track and manage your hired agent tasks
            </p>
          </div>

          <button
            onClick={refreshAllJobs}
            disabled={isRefreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-indigo-400">{jobs.length}</div>
            <div className="text-xs text-gray-400">Total Tasks</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{activeCount}</div>
            <div className="text-xs text-gray-400">In Progress</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{completedCount}</div>
            <div className="text-xs text-gray-400">Completed</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === tab.value
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        {filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div key={job.id} className="relative group">
                <JobCard job={job} onRefresh={refreshJob} />
                
                {/* Delete button - only show for completed/failed jobs */}
                {(job.status === "completed" || job.status === "failed") && (
                  <button
                    onClick={() => removeJob(job.jobId)}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/20 text-red-400 
                             opacity-0 group-hover:opacity-100 transition hover:bg-red-500/30"
                    title="Remove from inbox"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass rounded-2xl">
            <Inbox className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tasks yet</h3>
            <p className="text-gray-400 mb-6">
              {filter === "all"
                ? "Hire an agent to get started!"
                : `No ${filter} tasks to show`}
            </p>
            <Link href="/catalog" className="btn-primary inline-flex">
              Browse Agents
            </Link>
          </div>
        )}

        {/* Auto-refresh indicator */}
        {activeCount > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Auto-refreshing active tasks every 5 seconds
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
