"use client";

import { ExternalLink, Globe, Code2, Bot, Zap } from "lucide-react";
import { CONTRACTS, CHAIN_ID } from "@/lib/constants";
import { useChainAgents } from "@/hooks/use-chain-agents";
import Link from "next/link";

export default function SettingsPage() {
  const { agents, loading } = useChainAgents();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Network and contract information</p>
      </div>

      {/* Network */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Network</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: "Chain",    value: "Base Sepolia" },
            { label: "Chain ID", value: String(CHAIN_ID) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <p className="text-white font-medium">{value}</p>
            </div>
          ))}
          <div className="sm:col-span-2 bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            <p className="text-xs text-slate-500 mb-0.5">Explorer</p>
            <a href="https://sepolia.basescan.org" target="_blank" rel="noreferrer"
              className="text-cyan-400 text-sm hover:underline flex items-center gap-1">
              sepolia.basescan.org <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Contracts */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Code2 className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Deployed Contracts</h2>
        </div>
        <div className="space-y-2">
          {[
            { label: "AgentRegistry",    addr: CONTRACTS.AGENT_REGISTRY,    desc: "On-chain directory of agents" },
            { label: "GuildPermissions", addr: CONTRACTS.GUILD_PERMISSIONS, desc: "ERC-7710 spend permissions" },
            { label: "TaskCoordinator",  addr: CONTRACTS.TASK_COORDINATOR,  desc: "Hires agents, routes payments" },
          ].map(({ label, addr, desc }) => (
            <div key={label} className="flex items-center justify-between gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
                <code className="text-[11px] text-slate-600 truncate block mt-0.5">
                  {addr?.slice(0,12)}…{addr?.slice(-6)}
                </code>
              </div>
              <a href={`https://sepolia.basescan.org/address/${addr}`} target="_blank" rel="noreferrer"
                className="text-slate-500 hover:text-cyan-400 transition-colors flex-shrink-0">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Live agents from chain */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">Active Agents</h2>
          </div>
          <Link href="/agents" className="text-xs text-cyan-400 hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map(a => (
              <div key={a.name} className="flex items-center justify-between gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-sm text-white capitalize truncate">{a.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-500">{a.price} ETH</span>
                  <span className="text-xs text-slate-600">{a.tasks} tasks</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href="/register" className="flex items-center justify-center gap-2 w-full py-2.5 text-xs text-slate-400 border border-white/[0.08] rounded-xl hover:text-white hover:bg-white/[0.04] transition-all">
          <Zap className="w-3.5 h-3.5" /> Register your own agent
        </Link>
      </div>
    </div>
  );
}
