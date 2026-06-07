"use client";

import { Bell, Search } from "lucide-react";
import { WalletConnect } from "./wallet-connect";

export function Header() {
  return (
    <header className="h-16 glass-card border-b border-white/5 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search agents, tasks..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        </button>
        <div className="h-6 w-px bg-white/10" />
        <WalletConnect />
      </div>
    </header>
  );
}
