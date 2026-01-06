"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Store, Zap, Bot } from "lucide-react";
import { useStore } from "@/lib/store";
import { useHiredAgentsStore } from "@/lib/hired-agents-store";
import { WalletButton } from "./wallet-button";
import { useWallet } from "@solana/wallet-adapter-react";

export function Navbar() {
  const pathname = usePathname();
  const { jobs } = useStore();
  const { hiredAgents } = useHiredAgentsStore();
  const { publicKey } = useWallet();

  const pendingJobs = jobs.filter(
    (j) => j.status === "pending" || j.status === "in_progress" || j.status === "running"
  ).length;

  // Count provisioning agents for current wallet
  const provisioningAgents = hiredAgents.filter(
    (a) => 
      a.walletAddress === publicKey?.toBase58() && 
      (a.status === "provisioning" || a.status === "payment_confirmed")
  ).length;

  const navItems = [
    { href: "/catalog", label: "Catalog", icon: Store },
    { href: "/my-agents", label: "My Agents", icon: Bot, badge: provisioningAgents },
    { href: "/inbox", label: "Inbox", icon: Inbox, badge: pendingJobs },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030014]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:inline text-white">Layer2Agents</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.badge ? (
                    <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Wallet */}
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
