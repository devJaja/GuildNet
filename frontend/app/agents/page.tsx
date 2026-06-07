"use client";

import { AgentCard } from "@/components/agents/agent-card";
import { useAgents } from "@/hooks/use-agents";
import { Filter, Grid3X3 } from "lucide-react";

const CATEGORIES = ["All", "Research", "Risk", "Coding", "Design", "Report"];

export default function AgentsPage() {
  const { agents, loading, filter, setFilter } = useAgents();

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Agent Marketplace</h1>
          <p className="text-zinc-400">Discover and hire specialised AI agents for your tasks</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:border-white/20 transition-all self-start md:self-auto">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === cat
                ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400"
                : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((a) => <AgentCard key={a.name} {...a} />)}
        </div>
      )}
    </div>
  );
}
