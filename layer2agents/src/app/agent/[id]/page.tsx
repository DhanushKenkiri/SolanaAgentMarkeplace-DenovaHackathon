"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { 
  ArrowLeft, 
  Bookmark, 
  Share2, 
  Star, 
  Clock, 
  CheckCircle, 
  Download,
  ExternalLink,
  Shield,
  Sparkles,
  Compass,
  History,
  Pin,
  ChevronRight,
  Wallet,
  LogOut,
  Copy,
  Check
} from "lucide-react";
import { motion } from "framer-motion";
import { AgentConfig, AGENT_REGISTRY, ROLE_CONFIG } from "@/lib/agents-registry";
import { formatSOL } from "@/lib/solana";
import { HireDialog } from "@/components/hire-dialog";

// Stable hash function to generate consistent values per agent
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey, disconnect } = useWallet();
  const [isHireDialogOpen, setIsHireDialogOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  const agentId = params.id as string;
  const agent = AGENT_REGISTRY.find(a => a.id === agentId);

  // Generate stable mock data
  const mockData = useMemo(() => {
    if (!agent) return null;
    const hash = hashCode(agent.id);
    return {
      executedJobs: (hash % 900) + 100,
      avgExecutionTime: (hash % 10) + 3,
      rating: 4.5 + (hash % 50) / 100,
      reviewCount: (hash % 20) + 1,
      ratingBreakdown: {
        5: 70 + (hash % 30),
        4: (hash % 20),
        3: (hash % 10),
        2: (hash % 5),
        1: 0
      }
    };
  }, [agent]);

  // Redirect to home if not connected
  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  // Copy address to clipboard
  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncatedAddress = publicKey 
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0d0a14] flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Connecting...</h2>
          <p className="text-gray-400">Redirecting to connect your wallet</p>
        </div>
      </div>
    );
  }

  if (!agent || !mockData) {
    return (
      <div className="min-h-screen bg-[#0d0a14] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-white mb-2">Agent Not Found</h2>
          <p className="text-gray-400 mb-6">The agent you're looking for doesn't exist.</p>
          <Link 
            href="/catalog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  const roleConfig = ROLE_CONFIG[agent.role];

  return (
    <div className="min-h-screen bg-[#0d0a14] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 p-4 flex flex-col fixed h-screen bg-[#0d0a14] z-40">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8 px-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">Layer2Agents</span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1 flex-grow overflow-y-auto">
          <Link 
            href="/catalog"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Compass className="w-5 h-5" />
            Explore Agents
          </Link>
          <Link 
            href="/inbox" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <History className="w-5 h-5" />
            Task Inbox
          </Link>

          {/* Pinned Agents */}
          <div className="pt-6">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 w-full">
              <Pin className="w-4 h-4" />
              <span>Pinned Agents</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>

          {/* Recently Used */}
          <div className="pt-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 w-full">
              <History className="w-4 h-4" />
              <span>Recently Used</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        </nav>

        {/* Wallet */}
        <div className="pt-4 border-t border-white/10 mt-4">
          {connected && publicKey && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-sm font-medium text-white truncate">Connected</div>
                  <button 
                    onClick={copyAddress}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    <span>{truncatedAddress}</span>
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => disconnect()}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow ml-64">
        {/* Breadcrumb Header */}
        <div className="sticky top-0 z-30 bg-[#0d0a14]/80 backdrop-blur-xl border-b border-white/10">
          <div className="px-8 py-4 flex items-center gap-3 text-sm">
            <Link href="/catalog" className="text-gray-400 hover:text-white transition-colors">
              Gallery
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            <span className="text-white font-medium">{agent.name}</span>
          </div>
        </div>

        <div className="p-8 max-w-5xl">
          {/* Agent Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-start gap-4 mb-6">
              <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex-grow" />
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Share2 className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex gap-6">
              {/* Agent Icon/Image */}
              <div className={`w-36 h-36 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center flex-shrink-0`}>
                <span className="text-6xl">{agent.icon}</span>
              </div>

              {/* Agent Info */}
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                  {agent.featured && (
                    <span className="p-1 rounded-full bg-emerald-500/20">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${roleConfig.color} flex items-center justify-center`}>
                    <span className="text-xs">{roleConfig.icon}</span>
                  </div>
                  <span className="text-gray-400">{roleConfig.label}</span>
                </div>

                <p className="text-lg font-semibold text-emerald-400 mb-4">
                  {formatSOL(agent.priceSOL)} credits
                </p>

                <div className="flex gap-3">
                  <button className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium text-white transition-colors">
                    Free Demo
                  </button>
                  <button
                    onClick={() => setIsHireDialogOpen(true)}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-medium text-white transition-all"
                  >
                    Hire Agent
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-6"
          >
            <div className="bg-[#1a1625] border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <CheckCircle className="w-4 h-4" />
                Executed Jobs
              </div>
              <div className="text-2xl font-bold text-white">{mockData.executedJobs}</div>
            </div>
            <div className="bg-[#1a1625] border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Average Execution Time
              </div>
              <div className="text-2xl font-bold text-white">{mockData.avgExecutionTime} minutes</div>
            </div>
            <div className="bg-[#1a1625] border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Star className="w-4 h-4" />
                Rating
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{mockData.rating.toFixed(1)}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(mockData.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
                    />
                  ))}
                </div>
                <span className="text-gray-400 text-sm">({mockData.reviewCount})</span>
              </div>
            </div>
          </motion.div>

          {/* Description Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1a1625] border border-white/10 rounded-xl p-6 mb-6"
          >
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Description</div>
            <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              {agent.description}
            </p>
            <p className="text-gray-400 leading-relaxed">
              This agent is powered by advanced AI models and follows the MIP-003 protocol for standardized 
              job execution and verifiable results. All tasks are recorded on-chain for transparency.
            </p>
          </motion.div>

          {/* Tags Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#1a1625] border border-white/10 rounded-xl p-6 mb-6"
          >
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">At a Glance</div>
            <div className="flex flex-wrap gap-2">
              {agent.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Example Outputs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1a1625] border border-white/10 rounded-xl p-6 mb-6"
          >
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">Example Outputs</div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className="bg-[#252030] border border-white/10 rounded-xl p-6 hover:border-indigo-500/30 transition-colors cursor-pointer group"
                >
                  <div className="flex justify-end mb-8">
                    <Download className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <h4 className="font-medium text-white mb-1">Example Output {num}</h4>
                  <p className="text-sm text-gray-500">application/json</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Developer Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#1a1625] border border-white/10 rounded-xl p-6 mb-6"
          >
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">From the Developer</div>
            <div className="flex gap-4">
              <a href="#" className="text-indigo-400 hover:underline">Terms</a>
              <a href="#" className="text-indigo-400 hover:underline">Documentation</a>
              <a href="#" className="text-indigo-400 hover:underline flex items-center gap-1">
                API Endpoint <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>

          {/* Risk Classification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#1a1625] border border-white/10 rounded-xl p-6 mb-6"
          >
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Risk Classification</div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
              <Shield className="w-4 h-4" />
              Minimal Risk
            </span>
          </motion.div>

          {/* Customer Reviews */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-[#1a1625] border border-white/10 rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-6">Customer Reviews</h3>
            
            <div className="flex gap-8">
              {/* Rating breakdown */}
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl font-bold text-white">{mockData.rating.toFixed(1)}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i}
                        className={`w-5 h-5 ${i < Math.floor(mockData.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-400">({mockData.reviewCount})</span>
                </div>

                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <div key={stars} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 w-12">{stars} star</span>
                      <div className="w-40 h-2 bg-[#252030] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${mockData.ratingBreakdown[stars as keyof typeof mockData.ratingBreakdown]}%` }}
                        />
                      </div>
                      <span className="text-gray-500 w-12 text-right">
                        {mockData.ratingBreakdown[stars as keyof typeof mockData.ratingBreakdown]}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample review */}
              <div className="flex-grow border-l border-white/10 pl-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">Anonymous User</span>
                      <span className="text-sm text-gray-500">2 weeks ago</span>
                    </div>
                    <div className="flex mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-300">
                      Excellent results and I love the fact that the outputs are verified on-chain. 
                      Will definitely use again!
                    </p>
                    <button className="text-indigo-400 text-sm mt-2 hover:underline">
                      Read more
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Hire Dialog */}
      <HireDialog
        agent={agent}
        isOpen={isHireDialogOpen}
        onClose={() => setIsHireDialogOpen(false)}
      />
    </div>
  );
}
