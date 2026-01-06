"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown, ChevronUp, Loader2, Settings2, Wallet, CheckCircle, AlertCircle, Bot } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AgentConfig } from "@/lib/agents-registry";
import { MIP003Client, InputFieldSchema, StartJobResponse } from "@/lib/mip003-client";
import { useStore } from "@/lib/store";
import { useHiredAgentsStore } from "@/lib/hired-agents-store";
import { formatSOL, generatePurchaseIdentifier, createPaymentTransaction, confirmTransaction } from "@/lib/solana";
import { motion, AnimatePresence } from "framer-motion";

interface HireDialogProps {
  agent: AgentConfig;
  isOpen: boolean;
  onClose: () => void;
  mockMode?: boolean; // Enable mock flow for demo purposes
}

type HireStep = "input" | "confirming" | "processing" | "success" | "error";

export function HireDialog({ agent, isOpen, onClose, mockMode = true }: HireDialogProps) {
  const router = useRouter();
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(true);
  const [schema, setSchema] = useState<InputFieldSchema[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<HireStep>("input");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [jobResponse, setJobResponse] = useState<StartJobResponse | null>(null);
  const [hiredAgentId, setHiredAgentId] = useState<string | null>(null);

  const { addJob, walletAddress } = useStore();
  const { hireAgent, isAgentHired } = useHiredAgentsStore();
  const { publicKey, signTransaction, connected } = useWallet();

  // Check if agent is already hired
  const alreadyHired = isAgentHired(agent.id);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setError(null);
      setTxSignature(null);
      setJobResponse(null);
      setHiredAgentId(null);
      // Always use fixed 3-field schema
      setLoading(true);
      setSchema([
        {
          id: "question",
          name: "Question",
          type: "text",
          optional: false,
          data: { placeholder: "Enter your task or question..." }
        },
        {
          id: "chat_id",
          name: "Chat ID",
          type: "text",
          optional: true,
          data: { placeholder: "Enter Chat ID (optional)" }
        },
        {
          id: "context",
          name: "Context",
          type: "text",
          optional: true,
          data: { placeholder: "Describe how you plan to use these results (optional)" }
        }
      ]);
      setLoading(false);
    }
  }, [isOpen]);

  // Mock hire flow - simulates the full flow without actual blockchain transactions
  const handleMockSubmit = async () => {
    if (!connected || !publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    if (alreadyHired) {
      setError("You have already hired this agent");
      return;
    }

    setError(null);
    setStep("confirming");

    try {
      // Simulate wallet confirmation delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Generate mock transaction signature
      const mockSignature = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      setTxSignature(mockSignature);
      
      setStep("processing");
      
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Add agent to hired agents store (this starts the provisioning flow)
      const hiredId = hireAgent(agent, publicKey.toBase58(), mockSignature);
      setHiredAgentId(hiredId);

      // Create mock job response
      const mockJobResponse: StartJobResponse = {
        job_id: `job_${Date.now()}`,
        status: "pending",
        message: "Your agent is being provisioned. It will be ready in 1-2 minutes.",
      };
      setJobResponse(mockJobResponse);

      setStep("success");
    } catch (err) {
      console.error("Mock hire error:", err);
      setError(err instanceof Error ? err.message : "Failed to process hire request");
      setStep("error");
    }
  };

  const handleSubmit = async () => {
    // Use mock flow if enabled
    if (mockMode) {
      return handleMockSubmit();
    }

    if (!connected || !publicKey || !signTransaction) {
      setError("Please connect your wallet first");
      return;
    }

    setError(null);
    setStep("confirming");

    try {
      // Step 1: Create and sign the payment transaction
      const transaction = await createPaymentTransaction(publicKey, agent.priceSOL);
      
      // Request user to sign the transaction
      const signedTx = await signTransaction(transaction);
      
      // Send the transaction
      const { connection } = await import("@/lib/solana");
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      setTxSignature(signature);
      
      setStep("processing");
      
      // Step 2: Wait for transaction confirmation
      const confirmed = await confirmTransaction(signature);
      
      if (!confirmed) {
        throw new Error("Transaction failed to confirm. Please try again.");
      }

      // Step 3: Call the agent endpoint after payment is confirmed
      const client = new MIP003Client(agent.endpoint);
      const purchaseId = generatePurchaseIdentifier(walletAddress || publicKey.toBase58());

      const response = await client.startJob({
        identifier_from_purchaser: purchaseId,
        input_data: {
          ...formData,
          payment_signature: signature,
        },
      });

      setJobResponse(response);

      // Add job to store
      addJob({
        id: crypto.randomUUID(),
        jobId: response.job_id,
        agentId: agent.id,
        agentName: agent.name,
        status: response.status,
        inputData: formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Also add to hired agents in mock mode
      if (mockMode) {
        const hiredId = hireAgent(agent, publicKey.toBase58(), signature);
        setHiredAgentId(hiredId);
      }

      setStep("success");
    } catch (err) {
      console.error("Hire error:", err);
      setError(err instanceof Error ? err.message : "Failed to process hire request");
      setStep("error");
    }
  };

  const handleClear = () => {
    setFormData({});
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Check if required fields are filled
  const requiredFields = schema.filter(f => !f.optional);
  const isValid = requiredFields.every(f => {
    const value = formData[f.id];
    return value !== undefined && value !== "";
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-xl bg-[#1a1020] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </button>
                  <h2 className="text-lg font-semibold text-white">
                    New {agent.name}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-pink-400 hover:text-pink-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[60vh] overflow-y-auto">
                {/* Transaction/Processing Steps */}
                {(step === "confirming" || step === "processing" || step === "success" || step === "error") && (
                  <div className="px-6 py-12 flex flex-col items-center justify-center">
                    {step === "confirming" && (
                      <>
                        <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 animate-pulse">
                          <Wallet className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Confirm Transaction</h3>
                        <p className="text-gray-400 text-sm text-center mb-2">
                          Please approve the transaction in your wallet
                        </p>
                        <p className="text-indigo-400 font-medium">
                          {formatSOL(agent.priceSOL)}
                        </p>
                        <p className="text-xs text-gray-500 mt-4">
                          {mockMode ? "Demo Mode (No real transaction)" : "Network: Solana Devnet"}
                        </p>
                      </>
                    )}
                    
                    {step === "processing" && (
                      <>
                        <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Processing...</h3>
                        <p className="text-gray-400 text-sm text-center mb-4">
                          {mockMode ? "Payment confirmed! Setting up your agent..." : "Transaction confirmed! Starting agent task..."}
                        </p>
                        {txSignature && !mockMode && (
                          <a 
                            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:underline"
                          >
                            View transaction on Explorer →
                          </a>
                        )}
                      </>
                    )}
                    
                    {step === "success" && jobResponse && (
                      <>
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                          <CheckCircle className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {mockMode ? "Agent Hired!" : "Task Started!"}
                        </h3>
                        {mockMode ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <Bot className="w-5 h-5 text-indigo-400" />
                              <span className="text-white font-medium">{agent.name}</span>
                            </div>
                            <p className="text-gray-400 text-sm text-center mb-4">
                              {jobResponse.message || "Your agent is being provisioned and will be ready in 1-2 minutes."}
                            </p>
                            <div className="flex gap-3 mt-4">
                              <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-white transition-colors"
                              >
                                Close
                              </button>
                              <button
                                onClick={() => {
                                  onClose();
                                  router.push("/my-agents");
                                }}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-medium text-white transition-all flex items-center gap-2"
                              >
                                <Bot className="w-4 h-4" />
                                View My Agents
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-gray-400 text-sm text-center mb-2">
                              Job ID: <code className="text-indigo-400">{jobResponse.job_id}</code>
                            </p>
                            <p className="text-gray-400 text-sm text-center mb-4">
                              {jobResponse.message || "Your task is now being processed by the agent."}
                            </p>
                            {txSignature && (
                              <a 
                                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-400 hover:underline mb-4"
                              >
                                View payment transaction →
                              </a>
                            )}
                            <button
                              onClick={onClose}
                              className="mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-medium text-white transition-all"
                            >
                              View in Inbox
                            </button>
                          </>
                        )}
                      </>
                    )}
                    
                    {step === "error" && (
                      <>
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                          <AlertCircle className="w-10 h-10 text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Transaction Failed</h3>
                        <p className="text-red-400 text-sm text-center mb-6">{error}</p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setStep("input")}
                            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-white transition-colors"
                          >
                            Try Again
                          </button>
                          <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-medium text-white transition-all"
                          >
                            Close
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Input Form - only show on input step */}
                {step === "input" && (
                  <>
                    {/* Information Section */}
                    <div className="border-b border-white/10">
                      <button
                        onClick={() => setInfoExpanded(!infoExpanded)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
                      >
                        <span className="font-medium text-white">Information</span>
                        {infoExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {infoExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-4 text-sm text-gray-400">
                              <p>{agent.description}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {agent.tags.map(tag => (
                                  <span 
                                    key={tag}
                                    className="px-2 py-1 rounded bg-white/5 text-xs text-gray-300"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Input Section */}
                    <div className="border-b border-white/10">
                      <button
                        onClick={() => setInputExpanded(!inputExpanded)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
                      >
                        <span className="font-medium text-white">Input</span>
                        {inputExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {inputExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 space-y-5">
                              {loading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                </div>
                              ) : (
                                schema.map((field) => (
                                  <div key={field.id}>
                                    <label className="block text-sm font-medium text-white mb-2">
                                      {field.name || field.id}
                                      {!field.optional && <span className="text-pink-400 ml-1">*</span>}
                                    </label>
                                    {field.type === "option" ? (
                                      <select
                                        value={(formData[field.id] as string) || ""}
                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                        className="w-full bg-[#252030] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                                      >
                                        <option value="">Select {field.name || field.id}</option>
                                        {field.data?.options?.map((opt) => {
                                          const optValue = typeof opt === "string" ? opt : opt.value;
                                          const optLabel = typeof opt === "string" ? opt : opt.label;
                                          return (
                                            <option key={optValue} value={optValue}>
                                              {optLabel}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    ) : (
                                      <textarea
                                        value={(formData[field.id] as string) || ""}
                                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                        placeholder={field.data?.placeholder || `Enter ${field.name || field.id}...`}
                                        className="w-full bg-[#252030] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                                        rows={field.id.includes("context") || field.id.includes("description") ? 3 : 2}
                                      />
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Wallet connection notice */}
                    {!connected && (
                      <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20">
                        <p className="text-sm text-amber-400 flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          Please connect your wallet to hire this agent
                        </p>
                      </div>
                    )}

                    {/* Error message */}
                    {error && step === "input" && (
                      <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    )}

                    {/* Already hired notice */}
                    {alreadyHired && step === "input" && (
                      <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20">
                        <p className="text-sm text-emerald-400 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          You have already hired this agent
                        </p>
                      </div>
                    )}

                    {/* Terms notice */}
                    <div className="px-6 py-4 text-center text-xs text-gray-500">
                      By clicking on &quot;Hire&quot; you&apos;re accepting the{" "}
                      <a href="#" className="text-indigo-400 hover:underline">Terms of Service</a>
                      , other{" "}
                      <a href="#" className="text-indigo-400 hover:underline">Legal Requirements</a>
                      {" "}by the creator of the Agent
                    </div>
                  </>
                )}
              </div>

              {/* Footer - only show on input step */}
              {step === "input" && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#150d1a]">
                  <button
                    onClick={handleClear}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-white transition-colors"
                  >
                    Clear
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                      {formatSOL(agent.priceSOL)} {mockMode ? "(Demo)" : "(Devnet)"}
                    </span>
                    
                    {alreadyHired ? (
                      <button
                        onClick={() => {
                          onClose();
                          router.push("/my-agents");
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium text-white transition-all"
                      >
                        <Bot className="w-4 h-4" />
                        View My Agents
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={!isValid || !connected}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-white transition-all"
                      >
                        <Wallet className="w-4 h-4" />
                        {mockMode ? "Hire Agent" : "Pay & Hire"}
                      </button>
                    )}
                    
                    <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                      <Settings2 className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
