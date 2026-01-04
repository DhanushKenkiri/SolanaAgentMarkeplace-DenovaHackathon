/**
 * Layer2Agents On-Chain Agent Registry SDK
 * 
 * TypeScript SDK for interacting with the Solana-based agent registry.
 * Supports devnet and mainnet deployments.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
  clusterApiUrl,
  Commitment,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";

// ============================================================================
// Constants
// ============================================================================

/** Program ID for the Agent Registry (devnet) */
export const AGENT_REGISTRY_PROGRAM_ID = new PublicKey(
  "DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF"
);

/** Seed for the registry PDA */
export const REGISTRY_SEED = Buffer.from("registry");

/** Seed prefix for agent PDAs */
export const AGENT_SEED = Buffer.from("agent");

// ============================================================================
// Types
// ============================================================================

export enum AgentStatus {
  Active = "Active",
  Paused = "Paused",
  Deprecated = "Deprecated",
}

export interface AgentData {
  owner: PublicKey;
  agentId: string;
  name: string;
  description: string;
  apiUrl: string;
  tags: string[];
  pricePerTask: BN;
  acceptedPaymentTokens: PublicKey[];
  metadataUri: string;
  status: AgentStatus;
  createdAt: BN;
  updatedAt: BN;
  totalTasksCompleted: BN;
  totalEarnings: BN;
  ratingSum: BN;
  ratingCount: BN;
  bump: number;
}

export interface RegistryData {
  authority: PublicKey;
  agentCount: BN;
  bump: number;
}

export interface RegisterAgentParams {
  agentId: string;
  name: string;
  description: string;
  apiUrl: string;
  tags?: string[];
  pricePerTask?: number;
  acceptedPaymentTokens?: PublicKey[];
  metadataUri?: string;
}

export interface UpdateAgentParams {
  name?: string;
  description?: string;
  apiUrl?: string;
  tags?: string[];
  pricePerTask?: number;
  acceptedPaymentTokens?: PublicKey[];
  metadataUri?: string;
}

export interface AgentWithAddress extends AgentData {
  address: PublicKey;
  averageRating: number;
}

// ============================================================================
// SDK Class
// ============================================================================

export class AgentRegistrySDK {
  private connection: Connection;
  private programId: PublicKey;
  private commitment: Commitment;

  constructor(
    connection: Connection,
    programId: PublicKey = AGENT_REGISTRY_PROGRAM_ID,
    commitment: Commitment = "confirmed"
  ) {
    this.connection = connection;
    this.programId = programId;
    this.commitment = commitment;
  }

  /**
   * Create SDK instance for devnet
   */
  static forDevnet(commitment: Commitment = "confirmed"): AgentRegistrySDK {
    const connection = new Connection(clusterApiUrl("devnet"), commitment);
    return new AgentRegistrySDK(connection, AGENT_REGISTRY_PROGRAM_ID, commitment);
  }

  /**
   * Create SDK instance for mainnet
   */
  static forMainnet(commitment: Commitment = "confirmed"): AgentRegistrySDK {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), commitment);
    return new AgentRegistrySDK(connection, AGENT_REGISTRY_PROGRAM_ID, commitment);
  }

  /**
   * Create SDK instance for localhost
   */
  static forLocalhost(commitment: Commitment = "confirmed"): AgentRegistrySDK {
    const connection = new Connection("http://localhost:8899", commitment);
    return new AgentRegistrySDK(connection, AGENT_REGISTRY_PROGRAM_ID, commitment);
  }

  // --------------------------------------------------------------------------
  // PDA Derivation
  // --------------------------------------------------------------------------

  /**
   * Derive the registry PDA address
   */
  getRegistryAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [REGISTRY_SEED],
      this.programId
    );
  }

  /**
   * Derive an agent PDA address from its ID
   */
  getAgentAddress(agentId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [AGENT_SEED, Buffer.from(agentId)],
      this.programId
    );
  }

  // --------------------------------------------------------------------------
  // Read Operations
  // --------------------------------------------------------------------------

  /**
   * Fetch the registry state
   */
  async getRegistry(): Promise<RegistryData | null> {
    const [registryAddress] = this.getRegistryAddress();
    const accountInfo = await this.connection.getAccountInfo(registryAddress);
    
    if (!accountInfo) {
      return null;
    }

    // Decode the account data (skip 8-byte discriminator)
    const data = accountInfo.data.slice(8);
    return this.decodeRegistryData(data);
  }

  /**
   * Fetch a specific agent by ID
   */
  async getAgent(agentId: string): Promise<AgentWithAddress | null> {
    const [agentAddress] = this.getAgentAddress(agentId);
    const accountInfo = await this.connection.getAccountInfo(agentAddress);
    
    if (!accountInfo) {
      return null;
    }

    // Decode the account data (skip 8-byte discriminator)
    const data = accountInfo.data.slice(8);
    const agentData = this.decodeAgentData(data);
    
    const averageRating = agentData.ratingCount.gt(new BN(0))
      ? agentData.ratingSum.toNumber() / agentData.ratingCount.toNumber()
      : 0;

    return {
      ...agentData,
      address: agentAddress,
      averageRating,
    };
  }

  /**
   * Fetch all registered agents
   */
  async getAllAgents(): Promise<AgentWithAddress[]> {
    const accounts = await this.connection.getProgramAccounts(this.programId, {
      filters: [
        {
          // Filter by account size to get only Agent accounts (approximate)
          dataSize: 1500, // Approximate size, adjust based on actual account size
        },
      ],
    });

    const agents: AgentWithAddress[] = [];

    for (const { pubkey, account } of accounts) {
      try {
        const data = account.data.slice(8);
        const agentData = this.decodeAgentData(data);
        
        const averageRating = agentData.ratingCount.gt(new BN(0))
          ? agentData.ratingSum.toNumber() / agentData.ratingCount.toNumber()
          : 0;

        agents.push({
          ...agentData,
          address: pubkey,
          averageRating,
        });
      } catch {
        // Skip accounts that don't decode properly
        continue;
      }
    }

    return agents;
  }

  /**
   * Fetch active agents only
   */
  async getActiveAgents(): Promise<AgentWithAddress[]> {
    const allAgents = await this.getAllAgents();
    return allAgents.filter((agent) => agent.status === AgentStatus.Active);
  }

  /**
   * Search agents by tag
   */
  async getAgentsByTag(tag: string): Promise<AgentWithAddress[]> {
    const allAgents = await this.getAllAgents();
    return allAgents.filter((agent) =>
      agent.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  /**
   * Get agents owned by a specific wallet
   */
  async getAgentsByOwner(owner: PublicKey): Promise<AgentWithAddress[]> {
    const allAgents = await this.getAllAgents();
    return allAgents.filter((agent) => agent.owner.equals(owner));
  }

  // --------------------------------------------------------------------------
  // Write Operations (Instruction Builders)
  // --------------------------------------------------------------------------

  /**
   * Build instruction to initialize the registry
   */
  buildInitializeInstruction(authority: PublicKey): TransactionInstruction {
    const [registryAddress] = this.getRegistryAddress();

    // Anchor discriminator for "initialize"
    const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

    const data = discriminator;

    const keys = [
      { pubkey: registryAddress, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }

  /**
   * Build instruction to register a new agent
   */
  buildRegisterAgentInstruction(
    owner: PublicKey,
    params: RegisterAgentParams
  ): TransactionInstruction {
    const [registryAddress] = this.getRegistryAddress();
    const [agentAddress] = this.getAgentAddress(params.agentId);

    // Anchor discriminator for "register_agent"
    const discriminator = Buffer.from([153, 135, 102, 59, 96, 23, 68, 51]);

    // Serialize the instruction data
    const agentIdBuffer = this.serializeString(params.agentId);
    const nameBuffer = this.serializeString(params.name);
    const descriptionBuffer = this.serializeString(params.description);
    const apiUrlBuffer = this.serializeString(params.apiUrl);
    const tagsBuffer = this.serializeStringArray(params.tags || []);
    const priceBuffer = this.serializeU64(params.pricePerTask || 0);
    const tokensBuffer = this.serializePubkeyArray(params.acceptedPaymentTokens || []);
    const metadataBuffer = this.serializeString(params.metadataUri || "");

    const data = Buffer.concat([
      discriminator,
      agentIdBuffer,
      nameBuffer,
      descriptionBuffer,
      apiUrlBuffer,
      tagsBuffer,
      priceBuffer,
      tokensBuffer,
      metadataBuffer,
    ]);

    const keys = [
      { pubkey: registryAddress, isSigner: false, isWritable: true },
      { pubkey: agentAddress, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }

  /**
   * Build instruction to update an agent
   */
  buildUpdateAgentInstruction(
    owner: PublicKey,
    agentId: string,
    params: UpdateAgentParams
  ): TransactionInstruction {
    const [agentAddress] = this.getAgentAddress(agentId);

    // Anchor discriminator for "update_agent"
    const discriminator = Buffer.from([101, 93, 172, 74, 83, 216, 208, 158]);

    // Serialize optional fields
    const nameBuffer = this.serializeOption(params.name, this.serializeString.bind(this));
    const descriptionBuffer = this.serializeOption(params.description, this.serializeString.bind(this));
    const apiUrlBuffer = this.serializeOption(params.apiUrl, this.serializeString.bind(this));
    const tagsBuffer = this.serializeOption(params.tags, this.serializeStringArray.bind(this));
    const priceBuffer = this.serializeOption(params.pricePerTask, this.serializeU64.bind(this));
    const tokensBuffer = this.serializeOption(params.acceptedPaymentTokens, this.serializePubkeyArray.bind(this));
    const metadataBuffer = this.serializeOption(params.metadataUri, this.serializeString.bind(this));

    const data = Buffer.concat([
      discriminator,
      nameBuffer,
      descriptionBuffer,
      apiUrlBuffer,
      tagsBuffer,
      priceBuffer,
      tokensBuffer,
      metadataBuffer,
    ]);

    const keys = [
      { pubkey: agentAddress, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }

  /**
   * Build instruction to deregister an agent
   */
  buildDeregisterAgentInstruction(
    owner: PublicKey,
    agentId: string
  ): TransactionInstruction {
    const [registryAddress] = this.getRegistryAddress();
    const [agentAddress] = this.getAgentAddress(agentId);

    // Anchor discriminator for "deregister_agent"
    const discriminator = Buffer.from([246, 134, 43, 210, 244, 96, 213, 89]);

    const keys = [
      { pubkey: registryAddress, isSigner: false, isWritable: true },
      { pubkey: agentAddress, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
    ];

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data: discriminator,
    });
  }

  /**
   * Build instruction to set agent status
   */
  buildSetAgentStatusInstruction(
    owner: PublicKey,
    agentId: string,
    status: AgentStatus
  ): TransactionInstruction {
    const [agentAddress] = this.getAgentAddress(agentId);

    // Anchor discriminator for "set_agent_status"
    const discriminator = Buffer.from([89, 165, 184, 117, 103, 55, 54, 234]);

    const statusByte = status === AgentStatus.Active ? 0 : status === AgentStatus.Paused ? 1 : 2;

    const data = Buffer.concat([discriminator, Buffer.from([statusByte])]);

    const keys = [
      { pubkey: agentAddress, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ];

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  private serializeString(value: string): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32LE(value.length, 0);
    return Buffer.concat([len, Buffer.from(value)]);
  }

  private serializeStringArray(values: string[]): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32LE(values.length, 0);
    const items = values.map((v) => this.serializeString(v));
    return Buffer.concat([len, ...items]);
  }

  private serializePubkeyArray(values: PublicKey[]): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32LE(values.length, 0);
    const items = values.map((v) => v.toBuffer());
    return Buffer.concat([len, ...items]);
  }

  private serializeU64(value: number): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(value), 0);
    return buf;
  }

  private serializeOption<T>(
    value: T | undefined,
    serializer: (v: T) => Buffer
  ): Buffer {
    if (value === undefined || value === null) {
      return Buffer.from([0]); // None
    }
    return Buffer.concat([Buffer.from([1]), serializer(value)]); // Some
  }

  private decodeRegistryData(data: Buffer): RegistryData {
    let offset = 0;

    const authority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const agentCount = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const bump = data[offset];

    return { authority, agentCount, bump };
  }

  private decodeAgentData(data: Buffer): AgentData {
    let offset = 0;

    const owner = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const [agentId, agentIdLen] = this.decodeString(data.slice(offset));
    offset += agentIdLen;

    const [name, nameLen] = this.decodeString(data.slice(offset));
    offset += nameLen;

    const [description, descLen] = this.decodeString(data.slice(offset));
    offset += descLen;

    const [apiUrl, apiLen] = this.decodeString(data.slice(offset));
    offset += apiLen;

    const [tags, tagsLen] = this.decodeStringArray(data.slice(offset));
    offset += tagsLen;

    const pricePerTask = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const [acceptedPaymentTokens, tokensLen] = this.decodePubkeyArray(data.slice(offset));
    offset += tokensLen;

    const [metadataUri, metaLen] = this.decodeString(data.slice(offset));
    offset += metaLen;

    const statusByte = data[offset];
    offset += 1;
    const status = statusByte === 0 ? AgentStatus.Active : statusByte === 1 ? AgentStatus.Paused : AgentStatus.Deprecated;

    const createdAt = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const updatedAt = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const totalTasksCompleted = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const totalEarnings = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const ratingSum = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const ratingCount = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;

    const bump = data[offset];

    return {
      owner,
      agentId,
      name,
      description,
      apiUrl,
      tags,
      pricePerTask,
      acceptedPaymentTokens,
      metadataUri,
      status,
      createdAt,
      updatedAt,
      totalTasksCompleted,
      totalEarnings,
      ratingSum,
      ratingCount,
      bump,
    };
  }

  private decodeString(data: Buffer): [string, number] {
    const len = data.readUInt32LE(0);
    const str = data.slice(4, 4 + len).toString("utf-8");
    return [str, 4 + len];
  }

  private decodeStringArray(data: Buffer): [string[], number] {
    const count = data.readUInt32LE(0);
    let offset = 4;
    const strings: string[] = [];

    for (let i = 0; i < count; i++) {
      const [str, len] = this.decodeString(data.slice(offset));
      strings.push(str);
      offset += len;
    }

    return [strings, offset];
  }

  private decodePubkeyArray(data: Buffer): [PublicKey[], number] {
    const count = data.readUInt32LE(0);
    let offset = 4;
    const pubkeys: PublicKey[] = [];

    for (let i = 0; i < count; i++) {
      pubkeys.push(new PublicKey(data.slice(offset, offset + 32)));
      offset += 32;
    }

    return [pubkeys, offset];
  }
}

// Export everything
export default AgentRegistrySDK;
