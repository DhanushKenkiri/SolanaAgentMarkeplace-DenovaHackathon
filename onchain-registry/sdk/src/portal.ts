#!/usr/bin/env node
/**
 * Layer2Agents Agent Registration Portal
 * 
 * A web-based UI for registering agents on the Solana blockchain.
 * Run with: npx ts-node src/portal.ts
 */

import express from "express";
import cors from "cors";
import open from "open";
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
  clusterApiUrl 
} from "@solana/web3.js";
import * as borsh from "borsh";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";

const app = express();
const PORT = process.env.PORT || 3456;

// Program ID (deployed on devnet)
const PROGRAM_ID = new PublicKey("DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF");

// Local wallet file path
const WALLET_PATH = path.join(__dirname, ".local-wallet.json");

// Load or create local wallet
function loadOrCreateLocalWallet(): Keypair {
  try {
    if (fs.existsSync(WALLET_PATH)) {
      const data = JSON.parse(fs.readFileSync(WALLET_PATH, "utf-8"));
      return Keypair.fromSecretKey(Uint8Array.from(data));
    }
  } catch (e) {
    console.log("Creating new local wallet...");
  }
  const keypair = Keypair.generate();
  fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(keypair.secretKey)));
  return keypair;
}

// Global local wallet
const localWallet = loadOrCreateLocalWallet();
console.log("📍 Local Wallet Address:", localWallet.publicKey.toBase58());

// Instruction discriminator for registerAgent (first 8 bytes of sha256("global:register_agent"))
// We'll compute this or use the known value
const REGISTER_AGENT_DISCRIMINATOR = Buffer.from([34, 63, 121, 34, 155, 123, 136, 163]);

// Helper to encode strings for Borsh
function encodeString(str: string): Buffer {
  const bytes = Buffer.from(str, "utf-8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([lenBuf, bytes]);
}

// Helper to encode Vec<String>
function encodeStringVec(strings: string[]): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strings.length, 0);
  const encoded = strings.map(s => encodeString(s));
  return Buffer.concat([lenBuf, ...encoded]);
}

// Helper to encode u64
function encodeU64(value: number | BN): Buffer {
  const bn = BN.isBN(value) ? value : new BN(value);
  return bn.toArrayLike(Buffer, "le", 8);
}

// Helper to encode Vec<Pubkey> (empty for now)
function encodePubkeyVec(pubkeys: PublicKey[]): Buffer {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(pubkeys.length, 0);
  const encoded = pubkeys.map(p => p.toBuffer());
  return Buffer.concat([lenBuf, ...encoded]);
}

// Build registerAgent instruction data manually
function buildRegisterAgentData(
  agentId: string,
  name: string,
  description: string,
  apiUrl: string,
  tags: string[],
  pricePerTask: number,
  acceptedPaymentTokens: PublicKey[],
  metadataUri: string
): Buffer {
  return Buffer.concat([
    REGISTER_AGENT_DISCRIMINATOR,
    encodeString(agentId),
    encodeString(name),
    encodeString(description),
    encodeString(apiUrl),
    encodeStringVec(tags),
    encodeU64(pricePerTask),
    encodePubkeyVec(acceptedPaymentTokens),
    encodeString(metadataUri),
  ]);
}

app.use(cors());
app.use(express.json());

// Serve the registration portal HTML
const portalHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Layer2Agents | Admin Dashboard</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>">
    <script src="https://unpkg.com/@solana/web3.js@1.95.0/lib/index.iife.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0f0f0f;
            --bg-secondary: #1a1a1a;
            --bg-card: #1f1f1f;
            --bg-card-hover: #252525;
            --border-color: #2a2a2a;
            --border-light: #333333;
            --text-primary: #ffffff;
            --text-secondary: #a0a0a0;
            --text-muted: #666666;
            --accent-primary: #dc2626;
            --accent-secondary: #ef4444;
            --accent-purple: #8b5cf6;
            --accent-cyan: #22d3ee;
            --accent-green: #22c55e;
            --success: #22c55e;
            --warning: #f59e0b;
            --error: #ef4444;
            --sidebar-width: 260px;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            line-height: 1.5;
        }

        /* Layout */
        .app-container {
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
            width: var(--sidebar-width);
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            padding: 1.5rem 0;
            display: flex;
            flex-direction: column;
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }

        .sidebar-logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0 1.5rem;
            margin-bottom: 2rem;
        }

        .sidebar-logo-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }

        .sidebar-logo-text {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        .sidebar-toggle {
            display: flex;
            gap: 0;
            margin: 0 1rem 1.5rem;
            background: var(--bg-card);
            border-radius: 8px;
            padding: 4px;
        }

        .toggle-btn {
            flex: 1;
            padding: 0.5rem 1rem;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .toggle-btn.active {
            background: var(--bg-primary);
            color: var(--text-primary);
        }

        .sidebar-nav {
            flex: 1;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            cursor: pointer;
            border-left: 3px solid transparent;
        }

        .nav-item:hover {
            background: var(--bg-card);
            color: var(--text-primary);
        }

        .nav-item.active {
            background: var(--bg-card);
            color: var(--text-primary);
            border-left-color: var(--accent-primary);
        }

        .nav-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
        }

        .sidebar-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-color);
            margin-top: auto;
        }

        .sidebar-footer a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.8rem;
            margin-right: 1rem;
        }

        .sidebar-footer a:hover {
            color: var(--text-primary);
        }

        /* Main Content */
        .main-content {
            flex: 1;
            margin-left: var(--sidebar-width);
            min-height: 100vh;
        }

        /* Top Bar */
        .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 2rem;
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .search-box {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 0.5rem 1rem;
            width: 300px;
        }

        .search-box input {
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-size: 0.9rem;
            width: 100%;
            outline: none;
        }

        .search-box input::placeholder {
            color: var(--text-muted);
        }

        .search-shortcut {
            font-size: 0.75rem;
            color: var(--text-muted);
            background: var(--bg-secondary);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            white-space: nowrap;
        }

        .top-bar-actions {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .top-bar-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 0.875rem;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s;
        }

        .top-bar-btn:hover {
            background: var(--bg-card-hover);
        }

        /* Page Content */
        .page-content {
            padding: 2rem;
        }

        .page-header {
            margin-bottom: 0.5rem;
        }

        .page-title {
            font-size: 0.9rem;
            color: var(--text-secondary);
            font-weight: 400;
        }

        .wallet-info-bar {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 2rem;
        }

        .wallet-link {
            color: var(--accent-primary);
            text-decoration: underline;
            cursor: pointer;
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1.5rem;
            transition: all 0.2s;
        }

        .stat-card:hover {
            border-color: var(--border-light);
        }

        .stat-label {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 0.75rem;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        .stat-value-small {
            font-size: 0.85rem;
            color: var(--text-secondary);
            font-weight: 400;
        }

        .stat-link {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            color: var(--text-primary);
            font-size: 0.85rem;
            text-decoration: none;
            margin-top: 0.5rem;
        }

        .stat-link:hover {
            text-decoration: underline;
        }

        /* Content Grid */
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
        }

        /* Section Card */
        .section-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1.5rem;
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .section-title .arrow {
            font-size: 0.875rem;
        }

        .section-subtitle {
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
        }

        /* Agent List */
        .agent-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .agent-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 0.75rem;
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }

        .agent-item:hover {
            border-color: var(--border-light);
        }

        .agent-name {
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 0.25rem;
        }

        .agent-desc {
            font-size: 0.8rem;
            color: var(--text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 280px;
        }

        .agent-price {
            font-size: 0.85rem;
            color: var(--text-secondary);
            text-align: right;
        }

        /* Wallet Table */
        .wallet-table {
            width: 100%;
            border-collapse: collapse;
        }

        .wallet-table th {
            text-align: left;
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-secondary);
            padding: 0.5rem 0.75rem;
            border-bottom: 1px solid var(--border-color);
        }

        .wallet-table td {
            padding: 0.75rem;
            font-size: 0.85rem;
            border-bottom: 1px solid var(--border-color);
        }

        .wallet-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .wallet-badge.connected {
            background: rgba(34, 197, 94, 0.15);
            color: var(--accent-green);
        }

        .wallet-badge.disconnected {
            background: rgba(239, 68, 68, 0.15);
            color: var(--error);
        }

        .wallet-address {
            font-family: monospace;
            color: var(--text-secondary);
        }

        .btn-topup {
            padding: 0.375rem 0.75rem;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-topup:hover {
            background: var(--bg-card-hover);
        }

        /* Register Button */
        .btn-register {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.25rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 1rem;
        }

        .btn-register:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-light);
        }

        /* Transaction Logs */
        .logs-section {
            margin-top: 2rem;
        }

        .logs-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
        }

        .logs-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.5rem;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
        }

        .logs-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.95rem;
            font-weight: 600;
        }

        .logs-actions {
            display: flex;
            gap: 0.5rem;
        }

        .logs-btn {
            padding: 0.375rem 0.75rem;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-secondary);
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .logs-btn:hover {
            color: var(--text-primary);
            background: var(--bg-card-hover);
        }

        .logs-btn.active {
            background: var(--accent-primary);
            border-color: var(--accent-primary);
            color: white;
        }

        .logs-content {
            padding: 1rem;
            max-height: 400px;
            overflow-y: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.8rem;
            line-height: 1.7;
            background: #0a0a0a;
        }

        .log-entry {
            display: flex;
            gap: 1rem;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            transition: background 0.1s;
        }

        .log-entry:hover {
            background: rgba(255, 255, 255, 0.03);
        }

        .log-time {
            color: var(--text-muted);
            white-space: nowrap;
        }

        .log-type {
            min-width: 60px;
            font-weight: 600;
        }

        .log-type.info { color: var(--accent-cyan); }
        .log-type.success { color: var(--success); }
        .log-type.error { color: var(--error); }
        .log-type.warn { color: var(--warning); }
        .log-type.tx { color: var(--accent-purple); }

        .log-message {
            color: var(--text-secondary);
            flex: 1;
        }

        .log-link {
            color: var(--accent-cyan);
            text-decoration: none;
        }

        .log-link:hover {
            text-decoration: underline;
        }

        /* Modal */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal-overlay.active {
            display: flex;
        }

        .modal {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
        }

        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .modal-title {
            font-size: 1.125rem;
            font-weight: 600;
        }

        .modal-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }

        .modal-close:hover {
            color: var(--text-primary);
        }

        .modal-body {
            padding: 1.5rem;
        }

        .form-group {
            margin-bottom: 1.25rem;
        }

        .form-label {
            display: block;
            font-size: 0.85rem;
            font-weight: 500;
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
        }

        .form-label .required {
            color: var(--error);
        }

        .form-input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 0.9rem;
            transition: border-color 0.2s;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--accent-primary);
        }

        .form-input::placeholder {
            color: var(--text-muted);
        }

        textarea.form-input {
            resize: vertical;
            min-height: 80px;
        }

        .form-hint {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 0.375rem;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }

        .price-input-group {
            position: relative;
        }

        .price-suffix {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 0.85rem;
        }

        .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            padding: 0.5rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            min-height: 45px;
        }

        .tag {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.25rem 0.5rem;
            background: rgba(139, 92, 246, 0.2);
            border-radius: 4px;
            font-size: 0.8rem;
            color: var(--accent-purple);
        }

        .tag-remove {
            cursor: pointer;
            opacity: 0.7;
        }

        .tag-remove:hover {
            opacity: 1;
        }

        .tag-input {
            flex: 1;
            min-width: 100px;
            border: none;
            background: transparent;
            color: var(--text-primary);
            font-size: 0.85rem;
            padding: 0.25rem;
            outline: none;
        }

        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            padding: 1.5rem;
            border-top: 1px solid var(--border-color);
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }

        .btn-secondary {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
        }

        .btn-secondary:hover {
            background: var(--bg-card-hover);
        }

        .btn-primary {
            background: var(--accent-primary);
            color: white;
        }

        .btn-primary:hover:not(:disabled) {
            background: var(--accent-secondary);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.8s linear infinite;
            margin-right: 0.5rem;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Toast Notifications */
        .toast-container {
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 2000;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .toast {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 1.25rem;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        }

        .toast.success { border-left: 3px solid var(--success); }
        .toast.error { border-left: 3px solid var(--error); }
        .toast.info { border-left: 3px solid var(--accent-cyan); }

        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 2rem;
            color: var(--text-muted);
        }

        .empty-state-icon {
            font-size: 2.5rem;
            margin-bottom: 0.75rem;
        }

        /* Responsive */
        @media (max-width: 1200px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .content-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 768px) {
            .sidebar {
                display: none;
            }
            .main-content {
                margin-left: 0;
            }
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-logo">
                <div class="sidebar-logo-icon">⚡</div>
                <span class="sidebar-logo-text">layer2agents</span>
            </div>
            
            <div class="sidebar-toggle">
                <button class="toggle-btn active" id="btn-devnet">🔗 Devnet</button>
            </div>
            
            <nav class="sidebar-nav">
                <a class="nav-item active" data-page="dashboard" onclick="showPage('dashboard')">
                    <span class="nav-icon">📊</span>
                    Dashboard
                </a>
                <a class="nav-item" data-page="agents" onclick="showPage('agents')">
                    <span class="nav-icon">🤖</span>
                    AI Agents
                </a>
                <a class="nav-item" data-page="wallets" onclick="showPage('wallets')">
                    <span class="nav-icon">💰</span>
                    Wallets
                </a>
                <a class="nav-item" data-page="transactions" onclick="showPage('transactions')">
                    <span class="nav-icon">📜</span>
                    Transactions
                </a>
                <a class="nav-item" data-page="logs" onclick="showPage('logs')">
                    <span class="nav-icon">📋</span>
                    Blockchain Logs
                </a>
                <a class="nav-item" data-page="settings" onclick="showPage('settings')">
                    <span class="nav-icon">⚙️</span>
                    Settings
                </a>
            </nav>
            
            <div class="sidebar-footer">
                <a href="#">About</a>
                <a href="#">Privacy Policy</a>
                <span style="cursor: pointer;">☀️</span>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Top Bar -->
            <div class="top-bar">
                <div class="search-box">
                    <span>🔍</span>
                    <input type="text" placeholder="Search..." id="search-input">
                    <span class="search-shortcut">(Ctrl + K)</span>
                </div>
                <div class="top-bar-actions">
                    <a class="top-bar-btn" href="https://github.com/DhanushKenkiri/SolanaAgentMarkeplace-DenovaHackathon" target="_blank">
                        📖 Documentation
                    </a>
                    <a class="top-bar-btn" href="#" target="_blank">
                        💬 Support
                    </a>
                    <button class="top-bar-btn" id="wallet-connect-btn" onclick="connectWallet()">
                        🔗 Connect Wallet
                    </button>
                </div>
            </div>

            <!-- Page Content -->
            <div class="page-content">
                <div class="page-header">
                    <p class="page-title">Overview of your AI agents, wallets, and transactions.</p>
                </div>
                <div class="wallet-info-bar" id="wallet-info-bar">
                    Showing data for <span id="display-wallet-address">Loading...</span>. 
                    <span class="wallet-link" onclick="loadLocalWallet()">Refresh wallet</span> to update.
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Total AI Agents</div>
                        <div class="stat-value" id="stat-agents">0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total SOL Earned</div>
                        <div class="stat-value">◎ <span id="stat-sol">0.00</span></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total SOL Balance</div>
                        <div class="stat-value"><span id="stat-balance">0.00</span> <span class="stat-value-small">SOL</span></div>
                        <div class="stat-value-small" id="stat-balance-usd">~ $0.00</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New Transactions</div>
                        <div class="stat-value" id="stat-txs">0</div>
                        <a class="stat-link" href="#" onclick="showPage('transactions')">View all transactions →</a>
                    </div>
                </div>

                <!-- Content Grid -->
                <div class="content-grid">
                    <!-- AI Agents Section -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                AI agents <span class="arrow">›</span>
                            </div>
                        </div>
                        <p class="section-subtitle">Manage your AI agents and their configurations.</p>
                        
                        <div class="agent-list" id="agent-list">
                            <div class="empty-state">
                                <div class="empty-state-icon">🤖</div>
                                <p>No agents registered yet</p>
                            </div>
                        </div>
                        
                        <button class="btn-register" onclick="openRegisterModal()">
                            <span>+</span> Register agent
                        </button>
                    </div>

                    <!-- Wallets Section -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                Wallets <span class="arrow">›</span>
                            </div>
                        </div>
                        <p class="section-subtitle">Manage your connected wallets.</p>
                        
                        <table class="wallet-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Name</th>
                                    <th>Address</th>
                                    <th>Balance</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="wallet-table-body">
                                <tr>
                                    <td><span class="wallet-badge disconnected">Disconnected</span></td>
                                    <td>Main wallet</td>
                                    <td class="wallet-address">-</td>
                                    <td>-</td>
                                    <td><button class="btn-topup" onclick="connectWallet()">Connect</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Blockchain Logs Section -->
                <div class="logs-section">
                    <div class="logs-card">
                        <div class="logs-header">
                            <div class="logs-title">
                                📋 Blockchain Logs
                            </div>
                            <div class="logs-actions">
                                <button class="logs-btn active" onclick="filterLogs('all')">All</button>
                                <button class="logs-btn" onclick="filterLogs('tx')">Transactions</button>
                                <button class="logs-btn" onclick="filterLogs('info')">Info</button>
                                <button class="logs-btn" onclick="filterLogs('error')">Errors</button>
                                <button class="logs-btn" onclick="clearLogs()">Clear</button>
                            </div>
                        </div>
                        <div class="logs-content" id="logs-content">
                            <div class="log-entry">
                                <span class="log-time">[--:--:--]</span>
                                <span class="log-type info">INFO</span>
                                <span class="log-message">Dashboard initialized. Connect your wallet to begin.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Register Agent Modal -->
    <div class="modal-overlay" id="register-modal">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">🤖 Register New Agent</h3>
                <button class="modal-close" onclick="closeRegisterModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="agent-form">
                    <div class="form-group">
                        <label class="form-label">Agent ID <span class="required">*</span></label>
                        <input type="text" class="form-input" id="agent-id" placeholder="my-unique-agent-id" required pattern="[a-z0-9\\-]+" maxlength="64">
                        <p class="form-hint">Unique identifier (lowercase letters, numbers, hyphens only)</p>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Agent Name <span class="required">*</span></label>
                        <input type="text" class="form-input" id="agent-name" placeholder="My Awesome AI Agent" required maxlength="128">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Description <span class="required">*</span></label>
                        <textarea class="form-input" id="agent-description" placeholder="Describe what your agent does..." required maxlength="512"></textarea>
                        <p class="form-hint">Max 512 characters</p>
                    </div>

                    <div class="form-group">
                        <label class="form-label">API Endpoint URL <span class="required">*</span></label>
                        <input type="url" class="form-input" id="agent-api-url" placeholder="https://your-agent-api.example.com" required maxlength="256">
                        <p class="form-hint">MIP-003 compliant endpoint</p>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Price per Task</label>
                            <div class="price-input-group">
                                <input type="number" class="form-input" id="agent-price" step="0.001" min="0" placeholder="0.05" value="0.05">
                                <span class="price-suffix">SOL</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Metadata URI (Optional)</label>
                            <input type="url" class="form-input" id="agent-metadata" placeholder="https://arweave.net/..." maxlength="256">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Tags</label>
                        <div class="tags-container" id="tags-container">
                            <input type="text" class="tag-input" id="tag-input" placeholder="Add tags (press Enter)">
                        </div>
                        <p class="form-hint">Press Enter to add a tag. Max 10 tags.</p>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="verifyEndpoint()">🔍 Verify Endpoint</button>
                <button class="btn btn-primary" id="register-btn" onclick="registerAgent()" disabled>⚡ Register Agent</button>
            </div>
        </div>
    </div>

    <!-- Toast Container -->
    <div class="toast-container" id="toast-container"></div>

    <script>
        // Constants
        const PROGRAM_ID = 'DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF';
        // Devnet only - no mainnet support in this dashboard
        const DEVNET_RPC = 'https://api.devnet.solana.com';
        const DEVNET_RPC_FALLBACK = 'https://rpc.ankr.com/solana_devnet';
        
        // Base64 decode helper (browser compatible - no Buffer needed)
        function base64ToUint8Array(base64) {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        }
        
        // State
        let wallet = null;
        let localWalletAddress = null;
        let tags = [];
        let connection = null;
        let currentNetwork = 'devnet';
        let agents = [];
        let logs = [];

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            checkWalletConnection();
            setupFormListeners();
            addLog('info', '🚀 Dashboard initialized. Welcome to Layer2Agents!');
            addLog('info', '🌐 Network: Solana Devnet');
            addLog('info', '🔑 Using local server wallet for transactions');
            
            // Keyboard shortcut
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'k') {
                    e.preventDefault();
                    document.getElementById('search-input').focus();
                }
            });
        });

        function switchNetwork(network) {
            // Only devnet is supported in this dashboard
            currentNetwork = 'devnet';
            addLog('info', 'Network: Solana Devnet (Program ID: ' + PROGRAM_ID.slice(0,8) + '...)');
        }

        function showPage(page) {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.page === page);
            });
            addLog('info', 'Navigated to ' + page);
        }

        function setupFormListeners() {
            const tagInput = document.getElementById('tag-input');
            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(tagInput.value.trim());
                    tagInput.value = '';
                }
            });
        }

        function addTag(tag) {
            if (!tag || tags.length >= 10 || tags.includes(tag)) return;
            tags.push(tag);
            renderTags();
        }

        function removeTag(index) {
            tags.splice(index, 1);
            renderTags();
        }

        function renderTags() {
            const container = document.getElementById('tags-container');
            const input = document.getElementById('tag-input');
            container.innerHTML = '';
            tags.forEach((tag, index) => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.innerHTML = tag + ' <span class="tag-remove" onclick="removeTag(' + index + ')">×</span>';
                container.appendChild(tagEl);
            });
            container.appendChild(input);
        }

        // Logging functions
        function addLog(type, message, link = null) {
            const now = new Date();
            const time = now.toTimeString().slice(0, 8);
            const logEntry = { time, type, message, link };
            logs.push(logEntry);
            renderLogs();
        }

        function renderLogs(filter = 'all') {
            const container = document.getElementById('logs-content');
            const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter);
            container.innerHTML = filtered.map(log => {
                const linkHtml = log.link ? ' <a class="log-link" href="' + log.link + '" target="_blank">[View on Explorer]</a>' : '';
                return '<div class="log-entry"><span class="log-time">[' + log.time + ']</span><span class="log-type ' + log.type + '">' + log.type.toUpperCase() + '</span><span class="log-message">' + log.message + linkHtml + '</span></div>';
            }).join('');
            container.scrollTop = container.scrollHeight;
        }

        function filterLogs(type) {
            document.querySelectorAll('.logs-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            renderLogs(type);
        }

        function clearLogs() {
            logs = [];
            addLog('info', 'Logs cleared');
        }

        // Wallet functions
        async function checkWalletConnection() {
            const provider = window.phantom?.solana || window.solana || window.solflare;
            if (provider) {
                try {
                    const resp = await provider.connect({ onlyIfTrusted: true });
                    wallet = resp.publicKey;
                    window.solanaProvider = provider;
                    // Don't auto-connect browser wallet, use local wallet instead
                } catch (e) {
                    // Not connected - that's ok, we'll use local wallet
                }
            }
            // Auto-load local wallet on startup
            await loadLocalWallet();
        }

        async function loadLocalWallet() {
            try {
                addLog('info', '🔑 Loading local server wallet...');
                const response = await fetch('/api/local-wallet');
                const data = await response.json();
                
                if (data.address) {
                    localWalletAddress = data.address;
                    const shortAddr = data.address.slice(0, 6) + '...' + data.address.slice(-4);
                    
                    document.getElementById('wallet-connect-btn').innerHTML = '🔑 ' + shortAddr;
                    document.getElementById('display-wallet-address').textContent = shortAddr + ' (Local)';
                    document.getElementById('register-btn').disabled = false;

                    addLog('info', '━━━━━━ LOCAL WALLET LOADED ━━━━━━');
                    addLog('info', '📍 Address: ' + data.address);
                    addLog('success', '💵 Balance: ' + data.balance.toFixed(4) + ' SOL');
                    
                    document.getElementById('stat-balance').textContent = data.balance.toFixed(4);
                    document.getElementById('stat-balance-usd').textContent = '~ $' + (data.balance * 100).toFixed(2);
                    
                    // Update wallet table
                    document.getElementById('wallet-table-body').innerHTML = 
                        '<tr><td><span class="wallet-badge connected">Local</span></td>' +
                        '<td>Server Wallet</td>' +
                        '<td class="wallet-address">' + shortAddr + '</td>' +
                        '<td>' + data.balance.toFixed(4) + ' SOL</td>' +
                        '<td><button class="btn-topup" onclick="requestAirdrop()">Airdrop</button></td></tr>';
                    
                    if (data.balance < 0.01) {
                        addLog('warn', '⚠️ Low balance! Click "Airdrop" to get devnet SOL');
                    }
                    addLog('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    loadAgents();
                }
            } catch (e) {
                addLog('error', '❌ Failed to load local wallet: ' + e.message);
            }
        }

        async function connectWallet() {
            // Just reload local wallet info
            await loadLocalWallet();
            showToast('Using local server wallet for transactions', 'success');
        }

        async function onWalletConnected() {
            // This is now handled by loadLocalWallet
            await loadLocalWallet();
        }

        async function requestAirdrop() {
            try {
                addLog('info', '📤 Requesting SOL airdrop from Solana Devnet faucet...');
                addLog('info', 'Target: Local server wallet');
                
                const response = await fetch('/api/airdrop', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    addLog('tx', '✈️ Airdrop transaction confirmed', 'https://explorer.solana.com/tx/' + data.signature + '?cluster=devnet');
                    addLog('success', '✅ Airdrop successful! New balance: ' + data.newBalance.toFixed(4) + ' SOL');
                    showToast('Airdrop successful! +1 SOL', 'success');
                    await loadLocalWallet();
                } else {
                    throw new Error(data.error || 'Airdrop failed');
                }
            } catch (e) {
                showToast('Airdrop failed: ' + e.message, 'error');
                addLog('error', '❌ Airdrop failed: ' + e.message);
            }
        }

        // Agent functions
        async function loadAgents() {
            try {
                addLog('info', '🔍 Fetching registered agents from on-chain registry...');
                addLog('info', 'Program ID: ' + PROGRAM_ID.slice(0,8) + '...');
                const response = await fetch('/api/agents');
                const data = await response.json();
                agents = data.agents || [];
                document.getElementById('stat-agents').textContent = agents.length;
                renderAgents();
                if (agents.length > 0) {
                    addLog('success', '📋 Loaded ' + agents.length + ' registered agents from blockchain');
                    agents.forEach((agent, i) => {
                        addLog('info', '  Agent #' + (i+1) + ': ' + (agent.name || agent.address.slice(0,8) + '...'));
                    });
                } else {
                    addLog('info', '📋 No agents registered yet on this program');
                }
            } catch (e) {
                console.error('Failed to load agents:', e);
                addLog('error', '❌ Failed to fetch agents: ' + e.message);
            }
        }

        function renderAgents() {
            const container = document.getElementById('agent-list');
            if (agents.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤖</div><p>No agents registered yet</p></div>';
                return;
            }
            container.innerHTML = agents.map(agent => 
                '<div class="agent-item"><div><div class="agent-name">' + (agent.name || 'Agent') + '</div><div class="agent-desc">' + (agent.description || agent.address) + '</div></div><div class="agent-price">' + (agent.price || '0.05') + ' SOL</div></div>'
            ).join('');
        }

        // Modal functions
        function openRegisterModal() {
            document.getElementById('register-modal').classList.add('active');
            addLog('info', 'Opened agent registration form');
        }

        function closeRegisterModal() {
            document.getElementById('register-modal').classList.remove('active');
        }

        async function verifyEndpoint() {
            const apiUrl = document.getElementById('agent-api-url').value;
            if (!apiUrl) {
                showToast('Please enter an API URL first', 'error');
                return;
            }
            addLog('info', 'Verifying endpoint: ' + apiUrl);
            try {
                const response = await fetch(apiUrl.replace(/\\/$/, '') + '/availability');
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'available') {
                        showToast('Endpoint verified! Agent is MIP-003 compliant.', 'success');
                        addLog('success', 'Endpoint verified successfully');
                    } else {
                        showToast('Endpoint responded but status is: ' + data.status, 'info');
                        addLog('warn', 'Endpoint status: ' + data.status);
                    }
                } else {
                    showToast('Endpoint returned status ' + response.status, 'error');
                    addLog('error', 'Endpoint verification failed: HTTP ' + response.status);
                }
            } catch (e) {
                showToast('Could not reach endpoint: ' + e.message, 'error');
                addLog('error', 'Endpoint unreachable: ' + e.message);
            }
        }

        async function registerAgent() {
            if (!localWalletAddress) {
                showToast('Wallet not loaded. Please wait...', 'error');
                await loadLocalWallet();
                return;
            }

            const btn = document.getElementById('register-btn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span>Registering...';

            const agentId = document.getElementById('agent-id').value;
            const name = document.getElementById('agent-name').value;
            const description = document.getElementById('agent-description').value;
            const apiUrl = document.getElementById('agent-api-url').value;
            const price = parseFloat(document.getElementById('agent-price').value) || 0.05;
            const metadataUri = document.getElementById('agent-metadata').value || '';

            addLog('info', '━━━━━━ AGENT REGISTRATION STARTED ━━━━━━');
            addLog('info', '📝 Agent Name: ' + name);
            addLog('info', '🆔 Agent ID: ' + agentId);
            addLog('info', '🔗 API Endpoint: ' + apiUrl);
            addLog('info', '💰 Price per Task: ' + price + ' SOL');
            addLog('info', '🏷️ Tags: ' + (tags.length > 0 ? tags.join(', ') : 'None'));
            addLog('info', '🔑 Using local server wallet to sign');

            try {
                addLog('info', '📡 Sending registration request to server...');
                addLog('info', '⏳ Server will sign and broadcast transaction...');
                
                const response = await fetch('/api/register-agent-local', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentId,
                        name,
                        description,
                        apiUrl,
                        tags,
                        pricePerTask: Math.floor(price * 1e9),
                        metadataUri
                    })
                });

                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to register agent');
                }

                addLog('success', '━━━━━━ REGISTRATION COMPLETE ━━━━━━');
                addLog('success', '🎉 Agent "' + name + '" registered on-chain!');
                addLog('tx', '🚀 Transaction: ' + result.signature.slice(0, 16) + '...', result.explorerUrl);
                addLog('info', '📍 Agent Address: ' + result.agentPda);

                showToast('Agent registered successfully!', 'success');
                closeRegisterModal();
                await loadLocalWallet(); // Refresh balance
                loadAgents();
                
                // Reset form
                document.getElementById('agent-form').reset();
                tags = [];
                renderTags();

            } catch (e) {
                console.error(e);
                showToast('Registration failed: ' + e.message, 'error');
                addLog('error', '❌ Registration failed: ' + e.message);
                if (e.message.includes('insufficient')) {
                    addLog('warn', '💡 Try clicking "Airdrop" to get devnet SOL');
                }
            }

            btn.disabled = false;
            btn.textContent = '⚡ Register Agent';
        }

        // Toast notifications
        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = 'toast ' + type;
            toast.innerHTML = '<span>' + (type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ') + '</span><span>' + message + '</span>';
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        }

        function openWalletSettings() {
            connectWallet();
        }
    </script>
</body>
</html>
`;

// Serve the portal
app.get("/", (req, res) => {
  res.send(portalHTML);
});

// API endpoint to create registration transaction
app.post("/api/create-register-tx", async (req, res) => {
  try {
    const {
      wallet,
      agentId,
      name,
      description,
      apiUrl,
      tags = [],
      pricePerTask = 50000000, // 0.05 SOL in lamports
      metadataUri = "",
    } = req.body;

    // Validate inputs
    if (!wallet || !agentId || !name || !description || !apiUrl) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Connect to devnet with public RPC
    const connection = new Connection(
      "https://api.devnet.solana.com",
      { commitment: "confirmed", confirmTransactionInitialTimeout: 60000 }
    );
    
    const ownerPubkey = new PublicKey(wallet);
    
    // Derive PDAs
    const [registryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry")],
      PROGRAM_ID
    );
    
    const [agentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), Buffer.from(agentId)],
      PROGRAM_ID
    );

    // Check if agent already exists
    const existingAgent = await connection.getAccountInfo(agentPda);
    if (existingAgent) {
      res.status(400).json({ 
        error: "Agent ID already registered. Please choose a different ID." 
      });
      return;
    }

    // Build instruction data manually (avoiding Anchor IDL issues)
    const instructionData = buildRegisterAgentData(
      agentId,
      name,
      description,
      apiUrl,
      tags,
      pricePerTask,
      [], // acceptedPaymentTokens - empty for now
      metadataUri
    );

    // Create the instruction
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: registryPda, isSigner: false, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: ownerPubkey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    // Build transaction
    const tx = new Transaction().add(instruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = ownerPubkey;

    // Serialize transaction
    const serializedTx = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    res.json({
      transaction: serializedTx.toString("base64"),
      agentPda: agentPda.toBase58(),
      registryPda: registryPda.toBase58(),
    });
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: error.message || "Failed to create transaction" });
  }
});

// API endpoint to get local wallet info
app.get("/api/local-wallet", async (req, res) => {
  try {
    const connection = new Connection(
      "https://api.devnet.solana.com",
      { commitment: "confirmed" }
    );
    
    const balance = await connection.getBalance(localWallet.publicKey);
    
    res.json({
      address: localWallet.publicKey.toBase58(),
      balance: balance / 1e9,
      balanceLamports: balance,
    });
  } catch (error: any) {
    res.json({
      address: localWallet.publicKey.toBase58(),
      balance: 0,
      error: error.message,
    });
  }
});

// API endpoint to request airdrop for local wallet
app.post("/api/airdrop", async (req, res) => {
  try {
    const connection = new Connection(
      "https://api.devnet.solana.com",
      { commitment: "confirmed" }
    );
    
    console.log("Requesting airdrop for:", localWallet.publicKey.toBase58());
    const signature = await connection.requestAirdrop(localWallet.publicKey, 1e9);
    await connection.confirmTransaction(signature);
    
    const newBalance = await connection.getBalance(localWallet.publicKey);
    
    res.json({
      success: true,
      signature,
      newBalance: newBalance / 1e9,
    });
  } catch (error: any) {
    console.error("Airdrop error:", error);
    res.status(500).json({ error: error.message || "Airdrop failed" });
  }
});

// API endpoint to register agent using local wallet (signs and sends server-side)
app.post("/api/register-agent-local", async (req, res) => {
  try {
    const { agentId, name, description, apiUrl, tags = [], pricePerTask = 50000000, metadataUri = "" } = req.body;

    if (!agentId || !name || !description || !apiUrl) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const connection = new Connection(
      "https://api.devnet.solana.com",
      { commitment: "confirmed", confirmTransactionInitialTimeout: 60000 }
    );
    
    // Derive PDAs
    const [registryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry")],
      PROGRAM_ID
    );
    
    const [agentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), Buffer.from(agentId)],
      PROGRAM_ID
    );

    // Check if agent already exists
    const existingAgent = await connection.getAccountInfo(agentPda);
    if (existingAgent) {
      res.status(400).json({ 
        error: "Agent ID already registered. Please choose a different ID." 
      });
      return;
    }

    // Build instruction data
    const instructionData = buildRegisterAgentData(
      agentId,
      name,
      description,
      apiUrl,
      tags,
      pricePerTask,
      [],
      metadataUri
    );

    // Create the instruction
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: registryPda, isSigner: false, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: localWallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    // Build transaction
    const tx = new Transaction().add(instruction);
    tx.feePayer = localWallet.publicKey;

    // Sign and send transaction
    console.log("Signing and sending transaction...");
    const signature = await sendAndConfirmTransaction(connection, tx, [localWallet], {
      commitment: "confirmed",
    });
    
    console.log("Transaction confirmed:", signature);

    res.json({
      success: true,
      signature,
      agentPda: agentPda.toBase58(),
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    });
  } catch (error: any) {
    console.error("Error registering agent:", error);
    res.status(500).json({ error: error.message || "Failed to register agent" });
  }
});

// API endpoint to get registered agents
app.get("/api/agents", async (req, res) => {
  try {
    // Use public Solana RPC
    const connection = new Connection(
      "https://api.devnet.solana.com",
      { commitment: "confirmed", confirmTransactionInitialTimeout: 30000 }
    );
    
    // Fetch all program accounts
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 850 }, // Approximate size of Agent account
      ],
    });

    // Parse agent data (simplified)
    const agents = accounts.map((acc) => ({
      address: acc.pubkey.toBase58(),
      // Would need proper deserialization here
    }));

    res.json({ agents });
  } catch (error: any) {
    console.error("Error fetching agents:", error.message || error);
    // Return empty array instead of error to not break the UI
    res.json({ agents: [], error: "Network temporarily unavailable" });
  }
});

// Start server
async function startPortal() {
  console.log("\n⚡ Layer2Agents - Agent Registration Portal\n");
  console.log("━".repeat(50));
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Portal running at: http://localhost:${PORT}`);
    console.log(`📋 Network: Solana Devnet`);
    console.log(`📦 Program ID: ${PROGRAM_ID.toBase58()}`);
    console.log(`\n💡 Open your browser to register agents!\n`);
    console.log("━".repeat(50));
    
    // Auto-open browser
    open(`http://localhost:${PORT}`).catch(() => {
      console.log("\n⚠️  Could not auto-open browser. Please open manually.");
    });
  });
}

// Run if executed directly
if (require.main === module) {
  startPortal();
}

export { startPortal };
