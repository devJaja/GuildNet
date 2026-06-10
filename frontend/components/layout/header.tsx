"use client";

import { Search, Menu } from "lucide-react";
import { WalletConnect } from "./wallet-connect";

interface HeaderProps { onMenuClick: () => void; }

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-14 flex items-center gap-3 px-4 md:px-6 flex-shrink-0 border-b border-white/[0.06] sticky top-0 z-30"
      style={{ background: "rgba(7,7,15,0.9)", backdropFilter: "blur(20px)" }}>

      <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
        <Menu className="w-5 h-5" />
      </button>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
        <input type="text" placeholder="Search agents, tasks…"
          className="input-base pl-9 pr-4 py-1.5 text-sm" />
      </div>

      <div className="flex items-center gap-2.5 ml-auto">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-green-400">Base Sepolia</span>
        </div>
        <div className="hidden md:block h-4 w-px bg-white/10" />
        <WalletConnect />
      </div>
    </header>
  );
}
