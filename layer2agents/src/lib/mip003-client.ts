/**
 * MIP-003 Agentic Service API Client
 * Implements the Masumi Network standard for agent communication
 * https://docs.masumi.network/mips/_mip-003
 */

export interface AvailabilityResponse {
  status: "available" | "unavailable";
  type: string;
  name: string;
  version: string;
  message?: string;
}

export interface InputFieldSchema {
  id: string;
  type: "string" | "number" | "boolean" | "option" | "none";
  name?: string;
  required?: boolean;
  description?: string;
  data?: {
    options?: (string | { value: string; label: string })[];
    placeholder?: string;
    default?: string | number | boolean;
  };
  validations?: {
    type?: string;
    min?: number;
    max?: number;
    value?: unknown;
    message?: string;
  }[];
}

export interface InputSchemaResponse {
  input_data: InputFieldSchema[];
  input_groups?: {
    id: string;
    title: string;
    input_data: InputFieldSchema[];
  }[];
}

export interface StartJobRequest {
  identifier_from_purchaser: string;
  input_data: Record<string, unknown>;
}

export interface StartJobResponse {
  job_id: string;
  status: JobStatus;
  payment_info?: {
    blockchainIdentifier?: string;
    payByTime?: number;
    submitResultTime?: number;
    unlockTime?: number;
    externalDisputeUnlockTime?: number;
    agentIdentifier?: string;
    sellerVKey?: string;
  };
  message: string;
}

export type JobStatus = "pending" | "in_progress" | "completed" | "failed" | "awaiting_payment" | "awaiting_input" | "running";

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  result?: Record<string, unknown> | string;
  created_at: string;
  updated_at: string;
  error?: string;
  input_schema?: InputSchemaResponse;
}

export interface DemoResponse {
  input: Record<string, unknown>;
  output: {
    result: string;
  };
}

export class MIP003Client {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout = 30000) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.timeout = timeout;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MIP-003 Error [${response.status}]: ${errorText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if the agent is available and ready to process requests
   * MIP-003 Required Endpoint
   */
  async checkAvailability(): Promise<AvailabilityResponse> {
    return this.fetch<AvailabilityResponse>("/availability");
  }

  /**
   * Get the input schema for starting a job
   * MIP-003 Required Endpoint
   */
  async getInputSchema(): Promise<InputSchemaResponse> {
    return this.fetch<InputSchemaResponse>("/input_schema");
  }

  /**
   * Start a new job with the agent
   * MIP-003 Required Endpoint
   */
  async startJob(request: StartJobRequest): Promise<StartJobResponse> {
    return this.fetch<StartJobResponse>("/start_job", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Get the status of an existing job
   * MIP-003 Required Endpoint
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return this.fetch<JobStatusResponse>(`/status?job_id=${encodeURIComponent(jobId)}`);
  }

  /**
   * Get demo data for marketing purposes
   * MIP-003 Optional Endpoint
   */
  async getDemo(): Promise<DemoResponse> {
    return this.fetch<DemoResponse>("/demo");
  }

  /**
   * Provide additional input for a job awaiting input
   * MIP-003 Optional Endpoint
   */
  async provideInput(
    jobId: string,
    statusId: string,
    inputData: Record<string, unknown>
  ): Promise<{ input_hash: string; signature: string }> {
    return this.fetch("/provide_input", {
      method: "POST",
      body: JSON.stringify({
        job_id: jobId,
        status_id: statusId,
        input_data: inputData,
      }),
    });
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string }> {
    return this.fetch<{ status: string }>("/health");
  }
}

// Singleton factory for creating clients
const clientCache = new Map<string, MIP003Client>();

export function getMIP003Client(baseUrl: string): MIP003Client {
  if (!clientCache.has(baseUrl)) {
    clientCache.set(baseUrl, new MIP003Client(baseUrl));
  }
  return clientCache.get(baseUrl)!;
}
