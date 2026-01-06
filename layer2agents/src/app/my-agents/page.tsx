"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { 
  Bot, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Play,
  ExternalLink,
  Trash2,
  RefreshCw,
  Sparkles,
  Wallet,
  ArrowRight,
  Zap,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHiredAgentsStore, HiredAgent, formatRelativeTime, getStatusInfo } from "@/lib/hired-agents-store";
import { HireDialog } from "@/components/hire-dialog";
import { AGENT_REGISTRY } from "@/lib/agents-registry";

function HiredAgentCard({ agent, onUse, onRemove }: { 
  agent: HiredAgent; 
  onUse: () => void;
  onRemove: () => void;
}) {
  const statusInfo = getStatusInfo(agent.status);
  const isActive = agent.status === "active";
  const isProvisioning = agent.status === "provisioning" || agent.status === "payment_confirmed";
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Agent Icon */}
        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${agent.agentColor} flex items-center justify-center flex-shrink-0`}>
          <span className="text-3xl">{agent.agentIcon}</span>
        </div>
        
        {/* Agent Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold text-white truncate">{agent.agentName}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}>
              {statusInfo.label}
            </span>
          </div>
          
          <p className="text-sm text-gray-400 mb-3 line-clamp-1">{agent.agentDescription}</p>
          
          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Hired {formatRelativeTime(agent.hiredAt)}</span>
            </div>
            {isActive && (
              <>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{agent.tasksCompleted} tasks</span>
                </div>
                {agent.lastActivity && (
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span>Active {formatRelativeTime(agent.lastActivity)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isProvisioning && (
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-sm text-indigo-400">Setting up...</span>
            </div>
          )}
          
          {isActive && (
            <button
              onClick={onUse}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-white font-medium transition-all"
            >
              <Play className="w-4 h-4" />
              Use Agent
            </button>
          )}
          
          {agent.transactionSignature && (
            <a
              href={`https://explorer.solana.com/tx/${agent.transactionSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              title="View transaction"
            >
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          )}
          
          <button
            onClick={onRemove}
            className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg transition-colors group/btn"
            title="Remove agent"
          >
            <Trash2 className="w-4 h-4 text-gray-400 group-hover/btn:text-red-400" />
          </button>
        </div>
      </div>
      
      {/* Provisioning Progress Bar */}
      {isProvisioning && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>{statusInfo.description}</span>
            <span className="text-indigo-400">~1-2 minutes</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: "0%" }}
              animate={{ width: agent.status === "provisioning" ? "60%" : "20%" }}
              transition={{ duration: 2, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function MyAgentsPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { hiredAgents, removeHiredAgent, clearAll } = useHiredAgentsStore();
  
  const [selectedAgentForUse, setSelectedAgentForUse] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "provisioning">("all");
  
  // Auto-refresh to update provisioning status
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Redirect if not connected
  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);
  
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view your agents</p>
        </div>
      </div>
    );
  }
  
  // Filter agents by current wallet
  const myAgents = hiredAgents.filter(
    (a) => a.walletAddress === publicKey?.toBase58()
  );
  
  const filteredAgents = myAgents.filter((agent) => {
    if (filter === "active") return agent.status === "active";
    if (filter === "provisioning") return agent.status === "provisioning" || agent.status === "payment_confirmed";
    return true;
  });
  
  const activeCount = myAgents.filter((a) => a.status === "active").length;
  const provisioningCount = myAgents.filter(
    (a) => a.status === "provisioning" || a.status === "payment_confirmed"
  ).length;
  
  // Find the agent config for the use dialog
  const agentToUse = selectedAgentForUse 
    ? AGENT_REGISTRY.find((a) => a.id === myAgents.find((h) => h.id === selectedAgentForUse)?.agentId)
    : null;
  
  return (
    <div className="min-h-screen pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              My <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Agents</span>
            </h1>
            <p className="text-gray-400">
              Manage your hired AI agents
            </p>
          </div>
          
          <Link
            href="/catalog"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-white font-medium transition-all"
          >
            <Bot className="w-4 h-4" />
            Hire More Agents
          </Link>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1a1625] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Bot className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{myAgents.length}</div>
                <div className="text-xs text-gray-400">Total Agents</div>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1625] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{activeCount}</div>
                <div className="text-xs text-gray-400">Active</div>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1625] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Loader2 className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{provisioningCount}</div>
                <div className="text-xs text-gray-400">Provisioning</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filter Tabs */}
        {myAgents.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              {[
                { value: "all", label: "All Agents" },
                { value: "active", label: `Active (${activeCount})` },
                { value: "provisioning", label: `Setting Up (${provisioningCount})` },
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
            
            {myAgents.length > 0 && (
              <button
                onClick={() => clearAll()}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Clear All (Dev)
              </button>
            )}
          </div>
        )}
        
        {/* Agents List */}
        {filteredAgents.length > 0 ? (
          <motion.div layout className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredAgents.map((agent) => (
                <HiredAgentCard
                  key={agent.id}
                  agent={agent}
                  onUse={() => setSelectedAgentForUse(agent.id)}
                  onRemove={() => removeHiredAgent(agent.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <Bot className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === "all" ? "No Agents Yet" : `No ${filter === "active" ? "Active" : "Provisioning"} Agents`}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {filter === "all" 
                ? "Hire your first AI agent to start automating tasks and getting work done."
                : `You don't have any agents ${filter === "active" ? "that are active" : "being set up"} right now.`
              }
            </p>
            {filter === "all" && (
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-white font-medium transition-all"
              >
                Browse Agent Catalog
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
        
        {/* Provisioning Info Banner */}
        {provisioningCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="font-medium text-white">Agents are being provisioned</h4>
                <p className="text-sm text-gray-400">
                  Your agents will be ready in 1-2 minutes. This page will update automatically.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Use Agent Dialog */}
      {agentToUse && (
        <HireDialog
          agent={agentToUse}
          isOpen={!!selectedAgentForUse}
          onClose={() => setSelectedAgentForUse(null)}
        />
      )}
    </div>
  );
}
