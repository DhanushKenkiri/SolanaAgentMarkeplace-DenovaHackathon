"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Compass,
  History,
  Pin,
  ChevronRight,
  Wallet,
  LogOut,
  Copy,
  Check,
  Upload,
  Globe,
  DollarSign,
  Tag,
  FileText,
  Rocket,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import { ROLE_CONFIG, AgentRole } from "@/lib/agents-registry";

// Available emoji icons for agents
const AGENT_ICONS = [
  "🤖", "🧠", "💡", "🔍", "📊", "📝", "✉️", "🎯", "⚡", "🌐",
  "🔬", "📈", "💼", "🎨", "🔧", "📱", "🛡️", "🚀", "💎", "🌟"
];

interface DeployFormData {
  name: string;
  description: string;
  endpoint: string;
  price: string;
  tags: string;
  icon: string;
  role: AgentRole;
}

export default function DeployAgentPage() {
  const router = useRouter();
  const { connected, publicKey, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [formData, setFormData] = useState<DeployFormData>({
    name: "",
    description: "",
    endpoint: "",
    price: "0.05",
    tags: "",
    icon: "🤖",
    role: "research",
  });

  // Validation state
  const [validation, setValidation] = useState({
    name: true,
    description: true,
    endpoint: true,
    price: true,
  });

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear validation error on change
    if (!validation[name as keyof typeof validation]) {
      setValidation((prev) => ({ ...prev, [name]: true }));
    }
  };

  const validateForm = (): boolean => {
    const newValidation = {
      name: formData.name.trim().length >= 3,
      description: formData.description.trim().length >= 20,
      endpoint: /^https?:\/\/.+/.test(formData.endpoint),
      price: parseFloat(formData.price) > 0,
    };
    
    setValidation(newValidation);
    return Object.values(newValidation).every(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // Simulate on-chain registration
      // In production, this would call the Solana program
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // For demo purposes, we'll just show success
      // In production, you would:
      // 1. Create the transaction to register the agent on-chain
      // 2. Have the user sign the transaction
      // 3. Wait for confirmation
      
      setSubmitStatus("success");
      
      // Redirect to catalog after 2 seconds
      setTimeout(() => {
        router.push("/catalog");
      }, 2000);
      
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to deploy agent");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 text-white font-medium">
            <Upload className="w-5 h-5" />
            Deploy Agent
          </div>
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
        {/* Header */}
        <div className="sticky top-0 z-30 bg-[#0d0a14]/80 backdrop-blur-xl border-b border-white/10">
          <div className="px-8 py-4 flex items-center gap-3">
            <Link
              href="/catalog"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <h1 className="text-xl font-semibold text-white">Deploy Your Agent</h1>
          </div>
        </div>

        <div className="p-8 max-w-3xl mx-auto">
          {/* Info Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-8 flex gap-3"
          >
            <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-indigo-300 mb-1">Deploy your AI agent to the marketplace</h3>
              <p className="text-sm text-indigo-200/70">
                Register your MIP-003 compliant agent on-chain. Users will be able to discover, 
                hire, and pay for your agent's services in SOL.
              </p>
            </div>
          </motion.div>

          {/* Success Message */}
          {submitStatus === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 mb-8 text-center"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-emerald-300 mb-2">Agent Deployed Successfully!</h3>
              <p className="text-emerald-200/70">
                Your agent is now live on the marketplace. Redirecting...
              </p>
            </motion.div>
          )}

          {/* Error Message */}
          {submitStatus === "error" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 flex gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-300">Deployment Failed</h3>
                <p className="text-sm text-red-200/70">{errorMessage}</p>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Agent Name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1a1625] border border-white/10 rounded-xl p-6"
            >
              <label className="block text-sm font-medium text-white mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Agent Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Research Assistant Pro"
                className={`w-full bg-[#252030] border ${
                  validation.name ? "border-white/10" : "border-red-500/50"
                } rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors`}
              />
              {!validation.name && (
                <p className="text-sm text-red-400 mt-2">Name must be at least 3 characters</p>
              )}
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[#1a1625] border border-white/10 rounded-xl p-6"
            >
              <label className="block text-sm font-medium text-white mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe what your agent does, its capabilities, and ideal use cases..."
                rows={4}
                className={`w-full bg-[#252030] border ${
                  validation.description ? "border-white/10" : "border-red-500/50"
                } rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none`}
              />
              {!validation.description && (
                <p className="text-sm text-red-400 mt-2">Description must be at least 20 characters</p>
              )}
            </motion.div>

            {/* API Endpoint */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a1625] border border-white/10 rounded-xl p-6"
            >
              <label className="block text-sm font-medium text-white mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                MIP-003 API Endpoint *
              </label>
              <input
                type="url"
                name="endpoint"
                value={formData.endpoint}
                onChange={handleInputChange}
                placeholder="https://your-agent-api.com/api/mip003"
                className={`w-full bg-[#252030] border ${
                  validation.endpoint ? "border-white/10" : "border-red-500/50"
                } rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors`}
              />
              {!validation.endpoint && (
                <p className="text-sm text-red-400 mt-2">Please enter a valid HTTPS URL</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Your endpoint must implement the MIP-003 protocol (/input_schema, /start, /status)
              </p>
            </motion.div>

            {/* Price and Role Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Price */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-[#1a1625] border border-white/10 rounded-xl p-6"
              >
                <label className="block text-sm font-medium text-white mb-2">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Price per Task (SOL) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.001"
                  min="0.001"
                  placeholder="0.05"
                  className={`w-full bg-[#252030] border ${
                    validation.price ? "border-white/10" : "border-red-500/50"
                  } rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors`}
                />
                {!validation.price && (
                  <p className="text-sm text-red-400 mt-2">Price must be greater than 0</p>
                )}
              </motion.div>

              {/* Role */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#1a1625] border border-white/10 rounded-xl p-6"
              >
                <label className="block text-sm font-medium text-white mb-2">
                  Agent Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full bg-[#252030] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label}
                    </option>
                  ))}
                </select>
              </motion.div>
            </div>

            {/* Tags */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-[#1a1625] border border-white/10 rounded-xl p-6"
            >
              <label className="block text-sm font-medium text-white mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="research, analysis, automation, AI"
                className="w-full bg-[#252030] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <p className="text-sm text-gray-500 mt-2">
                Tags help users discover your agent
              </p>
            </motion.div>

            {/* Icon Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#1a1625] border border-white/10 rounded-xl p-6"
            >
              <label className="block text-sm font-medium text-white mb-4">
                Agent Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {AGENT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                    className={`w-12 h-12 text-2xl rounded-xl flex items-center justify-center transition-all ${
                      formData.icon === icon
                        ? "bg-indigo-500/30 border-2 border-indigo-500"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-[#1a1625] border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-sm font-medium text-white mb-4">Preview</h3>
              <div className="bg-[#252030] rounded-xl p-4 flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-3xl flex-shrink-0">
                  {formData.icon}
                </div>
                <div className="flex-grow">
                  <h4 className="text-lg font-semibold text-white mb-1">
                    {formData.name || "Agent Name"}
                  </h4>
                  <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                    {formData.description || "Agent description will appear here..."}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-medium">
                      {formData.price || "0.00"} SOL
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400 text-sm">
                      {ROLE_CONFIG[formData.role]?.label}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <button
                type="submit"
                disabled={isSubmitting || submitStatus === "success"}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-white text-lg transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deploying Agent...
                  </>
                ) : submitStatus === "success" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Deployed!
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Deploy Agent to Solana
                  </>
                )}
              </button>
              <p className="text-center text-sm text-gray-500 mt-3">
                This will create an on-chain transaction. Gas fees apply.
              </p>
            </motion.div>
          </form>
        </div>
      </main>
    </div>
  );
}
