"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { AgentConfig } from "@/lib/agents-registry";
import { MIP003Client, InputFieldSchema, StartJobResponse } from "@/lib/mip003-client";
import { useStore } from "@/lib/store";
import { formatSOL, generatePurchaseIdentifier } from "@/lib/solana";

interface HireModalProps {
  agent: AgentConfig;
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = "form" | "submitting" | "success" | "error";

export function HireModal({ agent, isOpen, onClose }: HireModalProps) {
  const [step, setStep] = useState<ModalStep>("form");
  const [schema, setSchema] = useState<InputFieldSchema[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobResponse, setJobResponse] = useState<StartJobResponse | null>(null);

  const { addJob, walletAddress } = useStore();

  // Fetch input schema when modal opens
  useEffect(() => {
    if (isOpen && agent.endpoint) {
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
    setStep("submitting");
    setError(null);

    try {
      const client = new MIP003Client(agent.endpoint);
      const purchaseId = generatePurchaseIdentifier(walletAddress || "guest");

      const response = await client.startJob({
        identifier_from_purchaser: purchaseId,
        input_data: formData,
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
      setError(err instanceof Error ? err.message : "Failed to start job");
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
                    <button type="submit" className="btn-primary">
                      Submit Task
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {step === "submitting" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
              <p className="text-lg font-medium">Submitting your task...</p>
              <p className="text-gray-400 text-sm mt-2">
                This may take a few seconds
              </p>
            </div>
          )}

          {step === "success" && jobResponse && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <p className="text-lg font-medium mb-2">Task Submitted!</p>
              <p className="text-gray-400 text-sm text-center mb-4">
                Job ID: <code className="text-cyan-400">{jobResponse.job_id}</code>
              </p>
              <p className="text-gray-400 text-sm text-center mb-6">
                {jobResponse.message}
              </p>
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
              <p className="text-lg font-medium mb-2">Submission Failed</p>
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
