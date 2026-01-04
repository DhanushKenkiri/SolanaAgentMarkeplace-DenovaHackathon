"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Loader2, Settings2 } from "lucide-react";
import { AgentConfig } from "@/lib/agents-registry";
import { MIP003Client, InputFieldSchema, StartJobResponse } from "@/lib/mip003-client";
import { useStore } from "@/lib/store";
import { formatSOL, generatePurchaseIdentifier } from "@/lib/solana";
import { motion, AnimatePresence } from "framer-motion";

interface HireDialogProps {
  agent: AgentConfig;
  isOpen: boolean;
  onClose: () => void;
}

export function HireDialog({ agent, isOpen, onClose }: HireDialogProps) {
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(true);
  const [schema, setSchema] = useState<InputFieldSchema[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addJob, walletAddress } = useStore();

  // Fetch input schema when modal opens
  useEffect(() => {
    if (isOpen) {
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

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const client = new MIP003Client(agent.endpoint);
      const purchaseId = generatePurchaseIdentifier(walletAddress || "guest");

      const response = await client.startJob({
        identifier_from_purchaser: purchaseId,
        input_data: formData,
      });

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

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start job");
    } finally {
      setSubmitting(false);
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

                {/* Error message */}
                {error && (
                  <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Terms notice */}
                <div className="px-6 py-4 text-center text-xs text-gray-500">
                  By clicking on "Hire" you're accepting the{" "}
                  <a href="#" className="text-indigo-400 hover:underline">Terms of Service</a>
                  , other{" "}
                  <a href="#" className="text-indigo-400 hover:underline">Legal Requirements</a>
                  {" "}by the creator of the Agent
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#150d1a]">
                <button
                  onClick={handleClear}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-white transition-colors"
                >
                  Clear
                </button>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">
                    {formatSOL(agent.priceSOL)} credits per run
                  </span>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid || submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-white transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Hire (~7 min) ⌘↵
                      </>
                    )}
                  </button>
                  
                  <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                    <Settings2 className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
