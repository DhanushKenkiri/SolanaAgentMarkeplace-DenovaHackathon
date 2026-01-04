"use client";

import { Job } from "@/lib/store";
import { getAgentById } from "@/lib/agents-registry";
import { Clock, CheckCircle, AlertCircle, Loader2, ExternalLink, LucideIcon } from "lucide-react";

interface JobCardProps {
  job: Job;
  onRefresh: (jobId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: LucideIcon; class: string }> = {
  pending: { label: "Pending", icon: Clock, class: "status-pending" },
  in_progress: { label: "In Progress", icon: Loader2, class: "status-running" },
  running: { label: "Running", icon: Loader2, class: "status-running" },
  completed: { label: "Completed", icon: CheckCircle, class: "status-completed" },
  failed: { label: "Failed", icon: AlertCircle, class: "status-failed" },
  awaiting_payment: { label: "Awaiting Payment", icon: Clock, class: "status-pending" },
  awaiting_input: { label: "Awaiting Input", icon: Clock, class: "status-pending" },
};

export function JobCard({ job, onRefresh }: JobCardProps) {
  const agent = getAgentById(job.agentId);
  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Status Bar */}
      <div className={`h-1 ${statusConfig.class}`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{agent?.icon || "🤖"}</span>
            <div>
              <h3 className="font-semibold">{job.agentName}</h3>
              <p className="text-xs text-gray-500">
                Job ID: {job.jobId.slice(0, 8)}...
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              job.status === "completed"
                ? "bg-green-500/20 text-green-400"
                : job.status === "failed"
                ? "bg-red-500/20 text-red-400"
                : "bg-indigo-500/20 text-indigo-400"
            }`}
          >
            <StatusIcon
              className={`w-3 h-3 ${
                job.status === "running" || job.status === "in_progress"
                  ? "animate-spin"
                  : ""
              }`}
            />
            {statusConfig.label}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span>Created: {formatDate(job.createdAt)}</span>
          <span>Updated: {formatDate(job.updatedAt)}</span>
        </div>

        {/* Result Preview */}
        {job.status === "completed" && job.result && (
          <div className="bg-black/30 rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-400 mb-2">Result:</p>
            <div className="text-sm text-gray-300 max-h-40 overflow-y-auto">
              {typeof job.result === "string" ? (
                <pre className="whitespace-pre-wrap font-mono text-xs">
                  {job.result}
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-xs">
                  {JSON.stringify(job.result, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {job.status === "failed" && job.error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-xs text-red-400 mb-1">Error:</p>
            <p className="text-sm text-red-300">{job.error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            {job.transactionSignature && (
              <a
                href={`https://explorer.solana.com/tx/${job.transactionSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View TX
              </a>
            )}
            {job.nftMint && (
              <a
                href={`https://explorer.solana.com/address/${job.nftMint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View NFT
              </a>
            )}
          </div>

          {(job.status === "pending" ||
            job.status === "in_progress" ||
            job.status === "running") && (
            <button
              onClick={() => onRefresh(job.jobId)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Refresh Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
