"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  CheckCircle2, 
  Download,
  Bookmark,
  Share2,
  Shield,
  ExternalLink,
  Wallet,
  Copy,
  Check,
  LogOut,
  Compass,
  Pin,
  History,
  ChevronRight,
  Sparkles,
  FileText,
  Play
} from "lucide-react";
import { AgentConfig, AGENT_REGISTRY, ROLE_CONFIG } from "@/lib/agents-registry";
import { formatSOL } from "@/lib/solana";
import { HireModal } from "@/components/hire-modal";

// Stable hash function for consistent values
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
  const router = useRouter();
  const params = useParams();
  const agentId = params.agentId as string;
  const { connected, publicKey, disconnect } = useWallet();
  
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Find the agent
  const agent = AGENT_REGISTRY.find(a => a.id === agentId);

  // Generate stable mock data based on agent ID
  const agentStats = useMemo(() => {
    if (!agent) return null;
    const hash = hashCode(agent.id);
    return {
      rating: 4.5 + (hash % 50) / 100,
      reviewCount: (hash % 20) + 1,
      executedJobs: ((hash % 900) + 100),
      avgExecutionTime: ((hash % 10) + 2),
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

  // Loading/not found states
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

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#0d0a14] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-white mb-2">Agent Not Found</h2>
          <p className="text-gray-400 mb-6">The agent you're looking for doesn't exist.</p>
          <Link 
            href="/catalog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-medium transition-colors"
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
          <span className="font-bold text-lg">Layer2Agents</span>
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
            <Clock className="w-5 h-5" />
            Task Inbox
          </Link>

          {/* Pinned Agents Section */}
          <div className="pt-6">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 w-full">
              <Pin className="w-4 h-4" />
              <span>Pinned Agents</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>

          {/* Recently Used Section */}
          <div className="pt-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 w-full">
              <History className="w-4 h-4" />
              <span>Recently Used</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        </nav>

        {/* Wallet Area */}
        <div className="pt-4 border-t border-white/10 mt-4">
          {connected && publicKey ? (
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
          ) : null}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/catalog" className="hover:text-white transition-colors">Gallery</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{agent.name}</span>
          </div>

          {/* Main Card */}
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 mb-6">
            {/* Back & Actions */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                </button>
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Agent Info */}
            <div className="flex gap-6">
              {/* Agent Image/Icon */}
              <div className={`w-40 h-40 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center flex-shrink-0`}>
                <span className="text-6xl">{agent.icon}</span>
              </div>

              {/* Agent Details */}
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                  {agent.featured && (
                    <div className="p-1 rounded-full bg-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  )}
                </div>

                {/* Creator */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                  <span className="text-gray-400">Layer2Agents Team</span>
                </div>

                {/* Price & Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-emerald-400">
                    {formatSOL(agent.priceSOL)} credits
                  </span>
                  <div className="flex gap-3">
                    <button className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Free Demo
                    </button>
                    <button 
                      onClick={() => setIsHireModalOpen(true)}
                      className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-medium transition-all"
                    >
                      Hire Agent
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Executed Jobs</div>
                  <div className="text-xl font-bold text-white">{agentStats?.executedJobs}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Average Execution Time</div>
                  <div className="text-xl font-bold text-white">{agentStats?.avgExecutionTime} minutes</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Rating</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{agentStats?.rating.toFixed(1)}</span>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < Math.floor(agentStats?.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-gray-500">({agentStats?.reviewCount})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">DESCRIPTION</div>
            <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              {agent.description}
            </p>
            <p className="text-gray-400 leading-relaxed">
              This AI agent is powered by advanced language models and is designed to deliver high-quality results
              for your specific use case. All tasks are executed securely and results are delivered with 
              blockchain-verified proof of completion.
            </p>
          </div>

          {/* Tags / At a Glance */}
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">AT A GLANCE</div>
            <div className="flex flex-wrap gap-2">
              {agent.tags.map((tag) => (
                <span 
                  key={tag}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 uppercase tracking-wider"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Example Outputs */}
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">EXAMPLE OUTPUTS</div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className="aspect-[4/3] bg-[#0d0a14] border border-white/10 rounded-xl flex flex-col items-center justify-center p-4 hover:border-white/20 transition-colors cursor-pointer group"
                >
                  <button className="absolute top-3 right-3 p-2 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="w-4 h-4" />
                  </button>
                  <FileText className="w-8 h-8 text-gray-600 mb-3" />
                  <div className="text-sm text-white font-medium">Example Output {i}</div>
                  <div className="text-xs text-gray-500">application/pdf</div>
                </div>
              ))}
            </div>
          </div>

          {/* From the Developer */}
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">FROM THE DEVELOPER</div>
            <div className="flex gap-4">
              <a href="#" className="text-white hover:text-indigo-400 transition-colors underline underline-offset-4">
                Terms
              </a>
              <a href="#" className="text-white hover:text-indigo-400 transition-colors underline underline-offset-4">
                Documentation
              </a>
              <a href={agent.apiEndpoint} target="_blank" rel="noopener noreferrer" className="text-white hover:text-indigo-400 transition-colors underline underline-offset-4 flex items-center gap-1">
                API Endpoint
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Risk Classification */}
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">AI RISK CLASSIFICATION</div>
            <span className="inline-block px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">
              Minimal Risk
            </span>
          </div>

          {/* Customer Reviews */}
          <div className="bg-[#1a1625] border border-white/10 rounded-2xl p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-6">Customer Reviews</h3>
            
            <div className="flex gap-12">
              {/* Rating Summary */}
              <div className="flex-shrink-0">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-white">{agentStats?.rating.toFixed(1)}</span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-5 h-5 ${i < Math.floor(agentStats?.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-gray-500">({agentStats?.reviewCount})</span>
                </div>

                {/* Rating Bars */}
                <div className="space-y-2 w-64">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const percentage = stars === 5 ? 80 : stars === 4 ? 15 : stars === 3 ? 5 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 w-12">{stars} star</span>
                        <div className="flex-grow h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-yellow-400 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 w-12 text-right">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sample Review */}
              <div className="flex-grow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">Anonymous User</span>
                      <span className="text-sm text-gray-500">2 weeks ago</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-300">
                      Excellent results! The agent delivered exactly what I needed in just a few minutes.
                      Highly recommend for anyone looking to automate their workflow.
                    </p>
                    <button className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 transition-colors">
                      Read more
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="py-12 border-t border-white/10 mt-12">
            <div className="grid grid-cols-4 gap-8 mb-8">
              <div>
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Navigate</h4>
                <div className="space-y-2">
                  <Link href="/catalog" className="block text-gray-400 hover:text-white transition-colors">Agents Gallery</Link>
                  <Link href="#" className="block text-gray-400 hover:text-white transition-colors">Contribute</Link>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Connect</h4>
                <div className="space-y-2">
                  <a href="#" className="block text-gray-400 hover:text-white transition-colors">X/Twitter</a>
                  <a href="#" className="block text-gray-400 hover:text-white transition-colors">Discord</a>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Get in Touch</h4>
                <div className="space-y-2">
                  <a href="#" className="block text-gray-400 hover:text-white transition-colors">Contact</a>
                  <a href="#" className="block text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                    List Your Agent <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Agentic Services</h4>
                <div className="space-y-2">
                  <a href="#" className="block text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                    Solana Registry <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Built on Solana • Powered by MIP-003 Protocol</span>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* Hire Modal */}
      <HireModal
        agent={agent}
        isOpen={isHireModalOpen}
        onClose={() => setIsHireModalOpen(false)}
      />
    </div>
  );
}
