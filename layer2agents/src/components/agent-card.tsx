"use client";

import { AgentConfig, ROLE_CONFIG } from "@/lib/agents-registry";
import { formatSOL } from "@/lib/solana";
import { ArrowRight, CheckCircle } from "lucide-react";

interface AgentCardProps {
  agent: AgentConfig;
  onHire: (agent: AgentConfig) => void;
  onDetails: (agent: AgentConfig) => void;
}

export function AgentCard({ agent, onHire, onDetails }: AgentCardProps) {
  const isAvailable = agent.endpoint !== "";
  const roleConfig = ROLE_CONFIG[agent.role];

  return (
    <div className="glass rounded-2xl overflow-hidden card-hover group">
      {/* Header with gradient */}
      <div className={`h-2 bg-gradient-to-r ${agent.color}`} />

      <div className="p-6">
        {/* Icon and Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="text-5xl">{agent.icon}</div>
          {agent.featured && (
            <span className="badge bg-indigo-500/20 text-indigo-400">
              <CheckCircle className="w-3 h-3 mr-1" />
              Featured
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-xl font-semibold mb-2 group-hover:text-indigo-400 transition">
          {agent.name}
        </h3>

        {/* Role Badge */}
        <span className={`badge ${roleConfig.color} text-white mb-3`}>
          {roleConfig.label}
        </span>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-3">
          {agent.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {agent.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Price and Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <div>
            <div className="text-xs text-gray-500 uppercase">Cost</div>
            <div className="text-lg font-bold text-cyan-400">
              {formatSOL(agent.priceSOL)}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onDetails(agent)}
              className="btn-secondary text-sm py-2 px-4"
            >
              Details
            </button>
            <button
              onClick={() => onHire(agent)}
              disabled={!isAvailable}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-1 disabled:opacity-50"
            >
              {isAvailable ? (
                <>
                  Hire
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                "Coming Soon"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
