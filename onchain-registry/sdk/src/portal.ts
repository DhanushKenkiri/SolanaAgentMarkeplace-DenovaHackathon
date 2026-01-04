#!/usr/bin/env node
/**
 * Layer2Agents Agent Registration Portal
 * 
 * A web-based UI for registering agents on the Solana blockchain.
 * Run with: npx ts-node src/portal.ts
 */

import express from "express";
import cors from "cors";
import path from "path";
import open from "open";
import { Connection, PublicKey, Transaction, clusterApiUrl } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

const app = express();
const PORT = process.env.PORT || 3456;

// Program ID (deployed on devnet)
const PROGRAM_ID = new PublicKey("DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF");

// IDL for the agent registry program (with required metadata for newer Anchor versions)
const IDL = {
  "address": "DhRaN8rXCgvuNzTMRDpiJ4ooEgwvTyvV2cSpTHFgk8NF",
  "metadata": {
    "name": "agent_registry",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "version": "0.1.0",
  "name": "agent_registry",
  "instructions": [
    {
      "name": "registerAgent",
      "accounts": [
        { "name": "registry", "isMut": true, "isSigner": false },
        { "name": "agent", "isMut": true, "isSigner": false },
        { "name": "owner", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "agentId", "type": "string" },
        { "name": "name", "type": "string" },
        { "name": "description", "type": "string" },
        { "name": "apiUrl", "type": "string" },
        { "name": "tags", "type": { "vec": "string" } },
        { "name": "pricePerTask", "type": "u64" },
        { "name": "acceptedPaymentTokens", "type": { "vec": "publicKey" } },
        { "name": "metadataUri", "type": "string" }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Registry",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "agentCount", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    },
    {
      "name": "Agent",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "owner", "type": "publicKey" },
          { "name": "agentId", "type": "string" },
          { "name": "name", "type": "string" },
          { "name": "description", "type": "string" },
          { "name": "apiUrl", "type": "string" },
          { "name": "tags", "type": { "vec": "string" } },
          { "name": "pricePerTask", "type": "u64" },
          { "name": "acceptedPaymentTokens", "type": { "vec": "publicKey" } },
          { "name": "metadataUri", "type": "string" },
          { "name": "status", "type": { "defined": "AgentStatus" } },
          { "name": "createdAt", "type": "i64" },
          { "name": "updatedAt", "type": "i64" },
          { "name": "totalTasksCompleted", "type": "u64" },
          { "name": "totalEarnings", "type": "u64" },
          { "name": "ratingSum", "type": "u64" },
          { "name": "ratingCount", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "AgentStatus",
      "type": {
        "kind": "enum",
        "variants": [
          { "name": "Active" },
          { "name": "Paused" },
          { "name": "Deprecated" }
        ]
      }
    }
  ]
};

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
                <button class="toggle-btn" id="btn-devnet" onclick="switchNetwork('devnet')">Devnet</button>
                <button class="toggle-btn active" id="btn-mainnet" onclick="switchNetwork('mainnet')">Mainnet</button>
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
                    <a class="top-bar-btn" href="https://github.com/your-repo" target="_blank">
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
                    Showing data for <span id="display-wallet-address">Not connected</span>. 
                    <span class="wallet-link" onclick="openWalletSettings()">Connect wallet</span> to view your data.
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
                        <input type="text" class="form-input" id="agent-id" placeholder="my-unique-agent-id" required pattern="[a-z0-9-]+" maxlength="64">
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
        const DEVNET_RPC = 'https://api.devnet.solana.com';
        const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
        
        // State
        let wallet = null;
        let tags = [];
        let connection = null;
        let currentNetwork = 'devnet';
        let agents = [];
        let logs = [];

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            checkWalletConnection();
            setupFormListeners();
            loadAgents();
            addLog('info', 'Dashboard initialized. Welcome to Layer2Agents!');
            addLog('info', 'Network: Solana ' + currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1));
            
            // Keyboard shortcut
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'k') {
                    e.preventDefault();
                    document.getElementById('search-input').focus();
                }
            });
        });

        function switchNetwork(network) {
            currentNetwork = network;
            document.getElementById('btn-devnet').classList.toggle('active', network === 'devnet');
            document.getElementById('btn-mainnet').classList.toggle('active', network === 'mainnet');
            addLog('info', 'Switched to ' + network.charAt(0).toUpperCase() + network.slice(1));
            loadAgents();
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
            if (window.solana && window.solana.isPhantom) {
                try {
                    const resp = await window.solana.connect({ onlyIfTrusted: true });
                    wallet = resp.publicKey;
                    await onWalletConnected();
                } catch (e) {
                    // Not connected
                }
            }
        }

        async function connectWallet() {
            if (!window.solana || !window.solana.isPhantom) {
                showToast('Phantom wallet not found. Please install it from phantom.app', 'error');
                addLog('error', 'Phantom wallet not found');
                return;
            }

            try {
                addLog('info', 'Connecting to Phantom wallet...');
                const resp = await window.solana.connect();
                wallet = resp.publicKey;
                await onWalletConnected();
                showToast('Wallet connected successfully!', 'success');
            } catch (e) {
                showToast('Failed to connect wallet: ' + e.message, 'error');
                addLog('error', 'Failed to connect wallet: ' + e.message);
            }
        }

        async function onWalletConnected() {
            const address = wallet.toBase58();
            const shortAddr = address.slice(0, 6) + '...' + address.slice(-4);
            
            document.getElementById('wallet-connect-btn').innerHTML = '✓ ' + shortAddr;
            document.getElementById('display-wallet-address').textContent = shortAddr;
            document.getElementById('register-btn').disabled = false;

            // Get balance
            const rpc = currentNetwork === 'mainnet' ? MAINNET_RPC : DEVNET_RPC;
            connection = new solanaWeb3.Connection(rpc, 'confirmed');
            const balance = await connection.getBalance(wallet);
            const solBalance = (balance / 1e9).toFixed(4);
            
            document.getElementById('stat-balance').textContent = solBalance;
            document.getElementById('stat-balance-usd').textContent = '~ $' + (parseFloat(solBalance) * 100).toFixed(2);
            
            // Update wallet table
            document.getElementById('wallet-table-body').innerHTML = 
                '<tr><td><span class="wallet-badge connected">Connected</span></td>' +
                '<td>Main wallet</td>' +
                '<td class="wallet-address">' + shortAddr + '</td>' +
                '<td>' + solBalance + ' SOL</td>' +
                '<td><button class="btn-topup" onclick="requestAirdrop()">Airdrop</button></td></tr>';

            addLog('success', 'Wallet connected: ' + shortAddr);
            addLog('info', 'Balance: ' + solBalance + ' SOL');
            
            loadAgents();
        }

        async function requestAirdrop() {
            if (!wallet || currentNetwork !== 'devnet') {
                showToast('Airdrop only available on devnet', 'error');
                return;
            }
            try {
                addLog('info', 'Requesting airdrop of 1 SOL...');
                const signature = await connection.requestAirdrop(wallet, 1e9);
                addLog('tx', 'Airdrop transaction sent', 'https://explorer.solana.com/tx/' + signature + '?cluster=devnet');
                await connection.confirmTransaction(signature);
                showToast('Airdrop successful! 1 SOL received', 'success');
                addLog('success', 'Airdrop confirmed: 1 SOL received');
                await onWalletConnected();
            } catch (e) {
                showToast('Airdrop failed: ' + e.message, 'error');
                addLog('error', 'Airdrop failed: ' + e.message);
            }
        }

        // Agent functions
        async function loadAgents() {
            try {
                const response = await fetch('/api/agents');
                const data = await response.json();
                agents = data.agents || [];
                document.getElementById('stat-agents').textContent = agents.length;
                renderAgents();
                if (agents.length > 0) {
                    addLog('info', 'Loaded ' + agents.length + ' registered agents');
                }
            } catch (e) {
                console.error('Failed to load agents:', e);
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
            if (!wallet) {
                showToast('Please connect your wallet first', 'error');
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

            addLog('info', 'Starting agent registration: ' + name);
            addLog('info', 'Agent ID: ' + agentId);

            try {
                const response = await fetch('/api/create-register-tx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        wallet: wallet.toBase58(),
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
                    throw new Error(result.error || 'Failed to create transaction');
                }

                addLog('info', 'Transaction created. Agent PDA: ' + result.agentPda);
                addLog('info', 'Awaiting wallet signature...');

                // Deserialize and sign transaction
                const tx = solanaWeb3.Transaction.from(Buffer.from(result.transaction, 'base64'));
                const signed = await window.solana.signTransaction(tx);
                
                addLog('success', 'Transaction signed by wallet');
                addLog('info', 'Broadcasting transaction to network...');

                // Send transaction
                const rpc = currentNetwork === 'mainnet' ? MAINNET_RPC : DEVNET_RPC;
                const conn = new solanaWeb3.Connection(rpc, 'confirmed');
                const signature = await conn.sendRawTransaction(signed.serialize());
                
                addLog('tx', 'Transaction sent: ' + signature.slice(0, 20) + '...', 'https://explorer.solana.com/tx/' + signature + '?cluster=' + currentNetwork);

                await conn.confirmTransaction(signature, 'confirmed');

                addLog('success', '✅ Agent registered successfully!');
                addLog('tx', 'View on Solana Explorer', 'https://explorer.solana.com/tx/' + signature + '?cluster=' + currentNetwork);

                showToast('Agent registered successfully!', 'success');
                closeRegisterModal();
                loadAgents();
                
                // Reset form
                document.getElementById('agent-form').reset();
                tags = [];
                renderTags();

            } catch (e) {
                console.error(e);
                showToast('Registration failed: ' + e.message, 'error');
                addLog('error', 'Registration failed: ' + e.message);
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

    // Connect to devnet
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    
    // Create a dummy wallet for building the transaction
    const ownerPubkey = new PublicKey(wallet);
    
    // Create Anchor provider (without signing capability)
    const dummyWallet = {
      publicKey: ownerPubkey,
      signTransaction: async (tx: Transaction) => tx,
      signAllTransactions: async (txs: Transaction[]) => txs,
    };
    
    const provider = new anchor.AnchorProvider(
      connection,
      dummyWallet as anchor.Wallet,
      { commitment: "confirmed" }
    );
    anchor.setProvider(provider);
    
    // Create program interface using older API
    const program = new anchor.Program(IDL as any, provider);
    
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

    // Build the transaction
    const tx = await (program.methods as any)
      .registerAgent(
        agentId,
        name,
        description,
        apiUrl,
        tags,
        new anchor.BN(pricePerTask),
        [], // acceptedPaymentTokens
        metadataUri
      )
      .accounts({
        registry: registryPda,
        agent: agentPda,
        owner: ownerPubkey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

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

// API endpoint to get registered agents
app.get("/api/agents", async (req, res) => {
  try {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    
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
    console.error("Error fetching agents:", error);
    res.status(500).json({ error: error.message || "Failed to fetch agents" });
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
