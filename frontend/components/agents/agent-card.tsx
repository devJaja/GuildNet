"use client";

import { Star, Zap } from "lucide-react";
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

const GRADIENTS: Record<string, string> = {
  Research: "from-blue-500 to-cyan-400",
  Risk:     "from-amber-500 to-orange-400",
  Coding:   "from-violet-500 to-purple-400",
  Design:   "from-pink-500 to-rose-400",
  Report:   "from-emerald-500 to-teal-400",
};
const STATUS: Record<string, { dot: string; label: string }> = {
  online:  { dot: "bg-green-400",  label: "Online"  },
  busy:    { dot: "bg-amber-400",  label: "Busy"    },
  offline: { dot: "bg-slate-500",  label: "Offline" },
};

export function AgentCard({ name, type, description, price, rating, tasks, status, skills }: Agent) {
  const gradient = GRADIENTS[type] ?? "from-cyan-500 to-violet-400";
  const s = STATUS[status];

  return (
    <div className="glass-card p-5 glow-hover flex flex-col group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-base flex-shrink-0", gradient)}>
            {name[0]}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm group-hover:text-cyan-400 transition-colors">{name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 rounded-lg">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-medium text-amber-300">{rating}</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-3 flex-1 line-clamp-2">{description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {skills.slice(0, 3).map(s => (
          <span key={s} className="px-2 py-0.5 text-[11px] bg-white/[0.04] border border-white/[0.08] rounded-md text-slate-400">{s}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <div>
          <span className="text-base font-bold text-white">{price} ETH</span>
          <span className="text-xs text-slate-500 ml-1">/ task</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Zap className="w-3 h-3" />{tasks} tasks
        </div>
      </div>
    </div>
  );
}
