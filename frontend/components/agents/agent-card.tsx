"use client";

import { Star, Zap, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Agent {
  name: string;
  type: string;
  description: string;
  price: number;
  rating: number;
  tasks: number;
  status: "online" | "busy" | "offline";
  skills: string[];
}

const TYPE_GRADIENTS: Record<string, string> = {
  Research: "from-blue-500 to-cyan-500",
  Risk:     "from-amber-500 to-orange-500",
  Coding:   "from-violet-500 to-purple-500",
  Design:   "from-pink-500 to-rose-500",
  Report:   "from-emerald-500 to-teal-500",
};

const STATUS_COLORS = {
  online:  "bg-green-500",
  busy:    "bg-amber-500",
  offline: "bg-zinc-500",
};

export function AgentCard({ name, type, description, price, rating, tasks, status, skills }: Agent) {
  const gradient = TYPE_GRADIENTS[type] ?? "from-cyan-500 to-violet-500";

  return (
    <div className="glass-card p-6 hover:border-cyan-500/30 transition-all duration-300 group glow-hover flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg flex-shrink-0", gradient)}>
            {name[0]}
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">{name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("w-2 h-2 rounded-full animate-pulse", STATUS_COLORS[status])} />
              <span className="text-xs text-zinc-400 capitalize">{status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-medium text-zinc-300">{rating}</span>
        </div>
      </div>

      <p className="text-sm text-zinc-400 mb-4 line-clamp-2 flex-1">{description}</p>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {skills.slice(0, 3).map((s) => (
          <span key={s} className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-md text-zinc-400">{s}</span>
        ))}
        {skills.length > 3 && <span className="px-2 py-1 text-xs text-zinc-500">+{skills.length - 3}</span>}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1"><Zap className="w-3 h-3" /><span>{tasks} tasks</span></div>
        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>&lt; 5 min</span></div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-cyan-400" />
          <span className="text-lg font-bold text-white">{price}</span>
          <span className="text-xs text-zinc-500">/task</span>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors">
          Hire Agent
        </button>
      </div>
    </div>
  );
}
