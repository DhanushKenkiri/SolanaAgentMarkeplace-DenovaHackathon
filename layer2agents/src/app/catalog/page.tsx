"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { 
  Search, 
  Compass, 
  Clock, 
  Pin, 
  History, 
  ChevronLeft, 
  ChevronRight,
  Star,
  Heart,
  Sparkles,
  FileText,
  Code,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  PenTool,
  LogOut,
  Wallet,
  Copy,
  Check
} from "lucide-react";
import TiltedCard from "@/components/ui/tilted-card";
import { HireModal } from "@/components/hire-modal";
import { AgentConfig, AGENT_REGISTRY, ROLE_CONFIG, AgentRole } from "@/lib/agents-registry";
import { formatSOL } from "@/lib/solana";
import { useAgents } from "@/lib/use-agents";
import Link from "next/link";

// Categories for filtering
const CATEGORIES = [
  { id: "featured", label: "Featured Agents", icon: Sparkles },
  { id: "research", label: "Research & Insights", icon: Lightbulb },
  { id: "reasoning", label: "Reasoning & Problem-Solving", icon: TrendingUp },
  { id: "design", label: "Design & Analysis", icon: PenTool },
  { id: "content", label: "Content & Writing", icon: FileText },
  { id: "code", label: "Code & Development", icon: Code },
  { id: "communication", label: "Communication", icon: MessageSquare },
];

// Stable hash function to generate consistent ratings per agent
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Agent card component for the gallery
function AgentGalleryCard({ 
  agent, 
  onSelect 
}: { 
  agent: AgentConfig; 
  onSelect: (agent: AgentConfig) => void;
}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const roleConfig = ROLE_CONFIG[agent.role];
  
  // Use stable hash-based values instead of Math.random() to avoid hydration mismatch
  const { rating, reviewCount } = useMemo(() => {
    const hash = hashCode(agent.id);
    return {
      rating: 4.5 + (hash % 50) / 100, // 4.5 to 4.99
      reviewCount: (hash % 20) + 1 // 1 to 20
    };
  }, [agent.id]);

  return (
    <TiltedCard
      containerHeight="320px"
      containerWidth="100%"
      imageHeight="320px"
      imageWidth="100%"
      scaleOnHover={1.02}
      rotateAmplitude={8}
      showTooltip={false}
      onClick={() => onSelect(agent)}
      className="w-full"
    >
      <div className="w-full h-full bg-[#1a1625] border border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group">
        {/* Background gradient based on agent color */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${agent.color}`} />
        
        {/* Favorite button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors z-10"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-pink-500 text-pink-500' : 'text-gray-400'}`} />
        </button>

        {/* Icon */}
        <div className="text-4xl mb-4">{agent.icon}</div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">
          {agent.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-3 h-3 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} 
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">({reviewCount})</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-grow">
          {agent.description}
        </p>

        {/* Price */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          <span className="text-sm font-semibold text-emerald-400">
            {formatSOL(agent.priceSOL)} credits
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSelect(agent);
            }}
            className="px-4 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Show Details
          </button>
        </div>

        {/* Brand/Company logo placeholder */}
        {agent.featured && (
          <div className="absolute bottom-4 right-4 opacity-30">
            <span className="text-xs font-bold tracking-wider">LAYER2</span>
          </div>
        )}
      </div>
    </TiltedCard>
  );
}

// Horizontal scroll section
function AgentSection({ 
  title, 
  agents, 
  onSelectAgent 
}: { 
  title: string; 
  agents: AgentConfig[]; 
  onSelectAgent: (agent: AgentConfig) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, [agents]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (agents.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {agents.map((agent) => (
          <div key={agent.id} className="flex-shrink-0 w-[280px]">
            <AgentGalleryCard agent={agent} onSelect={onSelectAgent} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const router = useRouter();
  const { connected, publicKey, disconnect } = useWallet();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("featured");
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [pinnedAgents, setPinnedAgents] = useState<string[]>([]);
  const [recentAgents, setRecentAgents] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

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

  // Truncate address for display
  const truncatedAddress = publicKey 
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  // Filter agents based on search
  const filteredAgents = AGENT_REGISTRY.filter((agent) => {
    if (!searchQuery) return true;
    return (
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Get featured agents
  const featuredAgents = filteredAgents.filter(a => a.featured);
  
  // Group agents by category/role
  const researchAgents = filteredAgents.filter(a => 
    a.role === 'research' || a.tags.some(t => t.toLowerCase().includes('research') || t.toLowerCase().includes('analysis'))
  );
  
  const reasoningAgents = filteredAgents.filter(a => 
    a.tags.some(t => t.toLowerCase().includes('reason') || t.toLowerCase().includes('problem') || t.toLowerCase().includes('logic'))
  );
  
  const contentAgents = filteredAgents.filter(a => 
    a.role === 'writing' || a.tags.some(t => t.toLowerCase().includes('content') || t.toLowerCase().includes('writing') || t.toLowerCase().includes('email'))
  );

  const handleSelectAgent = (agent: AgentConfig) => {
    // Navigate to agent detail page using address
    router.push(`/agent/${agent.address}`);
    // Add to recent agents using address
    setRecentAgents(prev => {
      const filtered = prev.filter(addr => addr !== agent.address);
      return [agent.address, ...filtered].slice(0, 5);
    });
  };

  const handleHireAgent = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setIsHireModalOpen(true);
  };

  const togglePinAgent = (agentAddress: string) => {
    setPinnedAgents(prev => 
      prev.includes(agentAddress) 
        ? prev.filter(addr => addr !== agentAddress)
        : [...prev, agentAddress]
    );
  };

  // Show loading state while checking connection
  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0d0a14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Connecting...</h2>
          <p className="text-gray-400">Redirecting to connect your wallet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a14] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 p-4 flex flex-col fixed h-screen bg-[#0d0a14] z-40">
        {/* Logo area */}
        <Link href="/" className="flex items-center gap-2 mb-8 px-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">Layer2Agents</span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1 flex-grow sidebar-scroll overflow-y-auto">
          <div 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 text-white font-medium cursor-default"
          >
            <Compass className="w-5 h-5" />
            Explore Agents
          </div>
          <Link 
            href="/deploy" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
            Deploy Agent
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
            {pinnedAgents.length > 0 && (
              <div className="ml-4 mt-1 space-y-1">
                {pinnedAgents.map(addr => {
                  const agent = AGENT_REGISTRY.find(a => a.address === addr);
                  if (!agent) return null;
                  return (
                    <button
                      key={addr}
                      onClick={() => handleSelectAgent(agent)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white w-full rounded-lg hover:bg-white/5"
                    >
                      <span>{agent.icon}</span>
                      <span className="truncate">{agent.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recently Used Section */}
          <div className="pt-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 w-full">
              <History className="w-4 h-4" />
              <span>Recently Used Agents</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
            {recentAgents.length > 0 && (
              <div className="ml-4 mt-1 space-y-1">
                {recentAgents.map(addr => {
                  const agent = AGENT_REGISTRY.find(a => a.address === addr);
                  if (!agent) return null;
                  return (
                    <button
                      key={addr}
                      onClick={() => handleSelectAgent(agent)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white w-full rounded-lg hover:bg-white/5"
                    >
                      <span>{agent.icon}</span>
                      <span className="truncate">{agent.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* User/Wallet area */}
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
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
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
          ) : (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gray-700" />
              <div className="flex-grow">
                <div className="text-sm font-medium text-gray-400">Not Connected</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Agents Gallery</h1>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-8">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search agents"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#1a1625] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            {/* Category pills */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Sections */}
          <AgentSection 
            title="Featured Agents" 
            agents={featuredAgents} 
            onSelectAgent={handleSelectAgent}
          />
          
          <AgentSection 
            title="Research & Insights" 
            agents={researchAgents} 
            onSelectAgent={handleSelectAgent}
          />
          
          <AgentSection 
            title="Content & Writing" 
            agents={contentAgents} 
            onSelectAgent={handleSelectAgent}
          />

          {/* All Agents Grid (when searching) */}
          {searchQuery && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-white mb-4">
                Search Results ({filteredAgents.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAgents.map((agent) => (
                  <AgentGalleryCard 
                    key={agent.id} 
                    agent={agent} 
                    onSelect={handleSelectAgent} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredAgents.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2 text-white">No agents found</h3>
              <p className="text-gray-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Hire Modal */}
      {selectedAgent && (
        <HireModal
          agent={selectedAgent}
          isOpen={isHireModalOpen}
          onClose={() => {
            setIsHireModalOpen(false);
            setSelectedAgent(null);
          }}
        />
      )}
    </div>
  );
}
