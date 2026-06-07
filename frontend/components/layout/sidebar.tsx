"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bot, ClipboardList, Wallet, Settings, ChevronLeft, ChevronRight, Zap } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Bot,             label: "Agents",    href: "/agents"    },
  { icon: ClipboardList,   label: "Tasks",     href: "/tasks"     },
  { icon: Wallet,          label: "Payments",  href: "/payments"  },
  { icon: Settings,        label: "Settings",  href: "/settings"  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={`glass-card border-r border-white/5 flex flex-col transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Zap className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-xl gradient-text">GuildNet</h1>
            <p className="text-xs text-zinc-500">Agent Network</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                active
                  ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-cyan-400" : "group-hover:text-cyan-400"}`} />
              {!collapsed && <span className="font-medium">{label}</span>}
              {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
            </Link>
          );
        })}
      </nav>

      {/* Collapse */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-4 border-t border-white/5 text-zinc-500 hover:text-white transition-colors flex items-center justify-center"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  );
}
