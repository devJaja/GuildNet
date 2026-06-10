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

const COORDINATOR_ABI = [{ name: "taskCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }] as const;
const REGISTRY_ABI    = [{ name: "totalAgents", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }] as const;

export default function DashboardPage() {
  const { history, addTask } = useTaskHistory();
  const { agents, loading: agentsLoading } = useChainAgents();
  const [taskCount,  setTaskCount]  = useState("—");
  const [agentCount, setAgentCount] = useState("—");

  useEffect(() => {
    const client = createPublicClient({ chain: baseSepolia, transport: http() });
    Promise.all([
      client.readContract({ address: CONTRACTS.TASK_COORDINATOR, abi: COORDINATOR_ABI, functionName: "taskCount" }),
      client.readContract({ address: CONTRACTS.AGENT_REGISTRY,   abi: REGISTRY_ABI,    functionName: "totalAgents" }),
    ]).then(([tc, ta]) => { setTaskCount(String(tc)); setAgentCount(String(ta)); }).catch(() => {});
  }, []);

  const totalSpent = history.reduce((s, t) => s + t.agentsHired.length * 0.001, 0);

  const STATS = [
    { label: "Registered Agents", value: agentCount,                    sub: "on-chain",    icon: Users,      color: "text-cyan-400",   bg: "from-cyan-500/20 to-cyan-500/5"   },
    { label: "Total Tasks",       value: taskCount,                     sub: "on-chain",    icon: Zap,        color: "text-violet-400", bg: "from-violet-500/20 to-violet-500/5"},
    { label: "Your Sessions",     value: String(history.length),        sub: "this device", icon: Activity,   color: "text-blue-400",   bg: "from-blue-500/20 to-blue-500/5"   },
    { label: "Your Spend",        value: `${totalSpent.toFixed(3)} ETH`,sub: "this device", icon: TrendingUp, color: "text-green-400",  bg: "from-green-500/20 to-green-500/5" },
  ];

  return (
    <div className="space-y-8 stagger">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome to <span className="gradient-text">GuildNet</span></h1>
        <p className="text-sm text-slate-400 mt-1">Autonomous AI agents that discover, hire, and pay each other on-chain.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card p-4 glow-hover">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <TaskCreator onTaskComplete={(t: TaskRecord) => addTask(t)} />

      {/* Live agents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Live Agents</h2>
          <a href="/agents" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">View all →</a>
        </div>
        {agentsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-44" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {agents.slice(0, 4).map(a => <AgentCard key={a.name + a.price} {...a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
