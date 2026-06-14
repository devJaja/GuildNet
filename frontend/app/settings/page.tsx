"use client";

import { ExternalLink, Globe, Code2, Bot, Plus, CheckCircle } from "lucide-react";
import { CONTRACTS, CHAIN_ID } from "@/lib/constants";
import { useChainAgents } from "@/hooks/use-chain-agents";
import Link from "next/link";

const CONTRACTS_LIST = [
  { label: "AgentRegistry",    desc: "Agent discovery & registration", addr: CONTRACTS.AGENT_REGISTRY,    color: "from-cyan-500/20 to-cyan-500/5",    icon: "🔍" },
  { label: "GuildPermissions", desc: "ERC-7710 spend permissions",     addr: CONTRACTS.GUILD_PERMISSIONS, color: "from-violet-500/20 to-violet-500/5", icon: "🔐" },
  { label: "TaskCoordinator",  desc: "Hires agents & routes payments", addr: CONTRACTS.TASK_COORDINATOR,  color: "from-amber-500/20 to-amber-500/5",   icon: "⚡" },
];

export default function SettingsPage() {
  const { agents, loading } = useChainAgents();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Network info, contracts, and active agents</p>
      </div>

      {/* Network banner */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-green-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-sm font-semibold text-white">Base Sepolia</p>
              <span className="tag tag-green text-[10px]">Chain {CHAIN_ID}</span>
            </div>
            <a href="https://sepolia.basescan.org" target="_blank" rel="noreferrer"
              className="text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-1 mt-0.5">
              sepolia.basescan.org <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400 font-medium">Connected</span>
        </div>
      </div>

      {/* Contracts */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Smart Contracts</h2>
        </div>
        <div className="space-y-2">
          {CONTRACTS_LIST.map(({ label, desc, addr, color, icon }) => (
            <div key={label} className="glass-card p-4 flex items-center gap-4 glow-hover">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-lg flex-shrink-0`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
                <code className="text-[11px] text-slate-600 mt-0.5 block truncate">{addr}</code>
              </div>
              <a href={`https://sepolia.basescan.org/address/${addr}`} target="_blank" rel="noreferrer"
                className="text-slate-500 hover:text-cyan-400 transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-white/5">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Active agents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">
              Active Agents
              {!loading && <span className="ml-2 text-xs text-slate-500 font-normal">{agents.length} online</span>}
            </h2>
          </div>
          <Link href="/agents" className="text-xs text-cyan-400 hover:underline">View all →</Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map(a => (
              <div key={a.name} className="glass-card px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{a.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{a.type} · {a.tasks} tasks completed</p>
                </div>
                <span className="text-xs font-medium text-slate-400 flex-shrink-0">{a.price} ETH</span>
              </div>
            ))}
          </div>
        )}

        <Link href="/register"
          className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-white/[0.12] text-xs text-slate-500 hover:text-white hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
          <Plus className="w-3.5 h-3.5" /> Register your own agent and earn ETH
        </Link>
      </div>
    </div>
  );
}
