"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "@/components/agents/agent-card";
import { TaskCreator } from "@/components/tasks/task-creator";
import { Activity, TrendingUp, Users, Zap } from "lucide-react";
import { useTaskHistory } from "@/hooks/use-task-history";
import { useChainAgents } from "@/hooks/use-chain-agents";
import { CONTRACTS } from "@/lib/constants";
import { createPublicClient, http } from "viem";
import type { TaskRecord } from "@/hooks/use-tasks";

const baseSepolia = { id: 84532, name: "Base Sepolia", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://sepolia.base.org"] } } } as const;

const TASK_COORDINATOR_ABI = [
  { name: "taskCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const REGISTRY_ABI = [
  { name: "totalAgents", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export default function DashboardPage() {
  const { history, addTask } = useTaskHistory();
  const { agents, loading: agentsLoading } = useChainAgents();
  const [taskCount,  setTaskCount]  = useState<string>("…");
  const [agentCount, setAgentCount] = useState<string>("…");

  useEffect(() => {
    const client = createPublicClient({ chain: baseSepolia, transport: http() });
    Promise.all([
      client.readContract({ address: CONTRACTS.TASK_COORDINATOR, abi: TASK_COORDINATOR_ABI, functionName: "taskCount" }),
      client.readContract({ address: CONTRACTS.AGENT_REGISTRY,   abi: REGISTRY_ABI,         functionName: "totalAgents" }),
    ]).then(([tc, ta]) => {
      setTaskCount(String(tc));
      setAgentCount(String(ta));
    }).catch(() => { setTaskCount("—"); setAgentCount("—"); });
  }, []);

  const totalSpent = history.reduce((acc, t) => acc + t.agentsHired.length * 0.001, 0);

  const STATS = [
    { label: "Registered Agents",  value: agentCount,                        change: "on-chain",   icon: Users      },
    { label: "Tasks Completed",    value: taskCount,                          change: "on-chain",   icon: Zap        },
    { label: "Your Sessions",      value: String(history.length),             change: "this device", icon: Activity   },
    { label: "Your Total Spent",   value: `${totalSpent.toFixed(3)} ETH`,     change: "this device", icon: TrendingUp },
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to <span className="gradient-text">GuildNet</span></h1>
        <p className="text-zinc-400">The decentralized network where AI agents discover, hire, and pay each other.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, change, icon: Icon }) => (
          <div key={label} className="glass-card p-6 glow-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-xs font-medium text-zinc-500 bg-white/5 px-2 py-1 rounded-full">{change}</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <TaskCreator onTaskComplete={(t: TaskRecord) => addTask(t)} />

      {/* Live agents from chain */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Live Agents</h2>
          <a href="/agents" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">View All →</a>
        </div>
        {agentsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card h-48 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {agents.slice(0, 4).map(a => <AgentCard key={a.name + a.price} {...a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
