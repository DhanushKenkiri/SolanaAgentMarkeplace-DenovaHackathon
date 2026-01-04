"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle, AlertCircle, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AgentConfig } from "@/lib/agents-registry";
import { MIP003Client, InputFieldSchema, StartJobResponse } from "@/lib/mip003-client";
import { useStore } from "@/lib/store";
import { formatSOL, generatePurchaseIdentifier, createPaymentTransaction, confirmTransaction } from "@/lib/solana";

interface HireModalProps {
  agent: AgentConfig;
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = "form" | "confirming" | "processing" | "success" | "error";

export function HireModal({ agent, isOpen, onClose }: HireModalProps) {
  const [step, setStep] = useState<ModalStep>("form");
  const [schema, setSchema] = useState<InputFieldSchema[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobResponse, setJobResponse] = useState<StartJobResponse | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const { addJob, walletAddress } = useStore();
  const { publicKey, signTransaction, connected } = useWallet();

  // Fetch input schema when modal opens
  useEffect(() => {
    if (isOpen && agent.endpoint) {
      setStep("form");
      setError(null);
      setTxSignature(null);
      setJobResponse(null);
      fetchSchema();
    }
  }, [isOpen, agent.endpoint]);

  const fetchSchema = async () => {
    setLoading(true);
    setError(null);
    try {
      const client = new MIP003Client(agent.endpoint);
      const response = await client.getInputSchema();
      setSchema(response.input_data || []);

      // Initialize form data with defaults
      const defaults: Record<string, unknown> = {};
      response.input_data?.forEach((field) => {
        if (field.data?.default !== undefined) {
          defaults[field.id] = field.data.default;
        }
      });
      setFormData(defaults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      setStep("success");
    } catch (err) {
      console.error("Hire error:", err);
      setError(err instanceof Error ? err.message : "Failed to process hire request");
      setStep("error");
    }
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: InputFieldSchema) => {
    const value = formData[field.id] ?? "";

    switch (field.type) {
      case "option":
        return (
          <select
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="select"
          >
            <option value="">Select {field.name || field.id}</option>
            {field.data?.options?.map((opt) => {
              // Handle both string[] and {value, label}[] formats
              const optValue = typeof opt === "string" ? opt : opt.value;
              const optLabel = typeof opt === "string" ? opt : opt.label;
              return (
                <option key={optValue} value={optValue}>
                  {optLabel}
                </option>
              );
            })}
          </select>
        );
      case "boolean":
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="w-5 h-5 rounded bg-secondary border-border text-indigo-500"
            />
            <span className="text-gray-300">{field.name || field.id}</span>
          </label>
        );
      case "number":
        return (
          <input
            type="number"
            value={value as number}
            onChange={(e) => handleFieldChange(field.id, Number(e.target.value))}
            placeholder={field.data?.placeholder || `Enter ${field.name || field.id}`}
            className="input"
          />
        );
      default:
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.data?.placeholder || `Enter ${field.name || field.id}`}
            className="input min-h-[80px] resize-y"
            rows={field.id.includes("notes") || field.id.includes("description") ? 3 : 1}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden glass rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{agent.icon}</span>
            <div>
              <h2 className="text-xl font-semibold">Hire {agent.name}</h2>
              <p className="text-sm text-gray-400">
                Cost: <span className="text-cyan-400">{formatSOL(agent.priceSOL)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === "form" && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-400">{error}</p>
                  <button onClick={fetchSchema} className="btn-secondary mt-4">
                    Retry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Wallet connection notice */}
                  {!connected && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                      <p className="text-sm text-amber-400 flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Please connect your wallet to hire this agent
                      </p>
                    </div>
                  )}
                  
                  {schema.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        {field.name || field.id.replace(/_/g, " ")}
                        {(field.required || field.validations?.some((v) => v.type === "required")) && (
                          <span className="text-red-400 ml-1">*</span>
                        )}
                      </label>
                      {field.description && (
                        <p className="text-xs text-gray-500 mb-2">{field.description}</p>
                      )}
                      {renderField(field)}
                    </div>
                  ))}

                  <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" disabled={!connected} className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Wallet className="w-4 h-4" />
                      Pay &amp; Hire
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {step === "confirming" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 animate-pulse">
                <Wallet className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-lg font-medium mb-2">Confirm Transaction</p>
              <p className="text-gray-400 text-sm text-center mb-2">
                Please approve the transaction in your wallet
              </p>
              <p className="text-indigo-400 font-medium">
                {formatSOL(agent.priceSOL)}
              </p>
              <p className="text-xs text-gray-500 mt-4">
                Network: Solana Devnet
              </p>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
              <p className="text-lg font-medium mb-2">Processing...</p>
              <p className="text-gray-400 text-sm text-center mb-4">
                Transaction confirmed! Starting agent task...
              </p>
              {txSignature && (
                <a 
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:underline"
                >
                  View transaction on Explorer →
                </a>
              )}
            </div>
          )}

          {step === "success" && jobResponse && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <p className="text-lg font-medium mb-2">Task Started!</p>
              <p className="text-gray-400 text-sm text-center mb-4">
                Job ID: <code className="text-cyan-400">{jobResponse.job_id}</code>
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
              <button onClick={onClose} className="btn-primary">
                View in Inbox
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-lg font-medium mb-2">Transaction Failed</p>
              <p className="text-red-400 text-sm text-center mb-6">{error}</p>
              <div className="flex gap-3">
                <button onClick={() => setStep("form")} className="btn-secondary">
                  Try Again
                </button>
                <button onClick={onClose} className="btn-primary">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
