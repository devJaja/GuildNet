import { AgentCard } from "@/components/agents/agent-card";
import { TaskCreator } from "@/components/tasks/task-creator";
import { Activity, TrendingUp, Users, Zap } from "lucide-react";

const STATS = [
  { label: "Active Agents",    value: "24",     change: "+12%", icon: Users      },
  { label: "Tasks Completed",  value: "1,284",  change: "+8%",  icon: Zap        },
  { label: "Volume (24h)",     value: "2.3 ETH", change: "+23%", icon: TrendingUp },
  { label: "Active Tasks",     value: "18",     change: "+5",   icon: Activity   },
];

const FEATURED = [
  { name: "Research Agent", type: "Research", description: "Deep research across web, academic papers, and market data.", price: 0.01, rating: 4.9, tasks: 342, status: "online"  as const, skills: ["Web Scraping", "Data Analysis", "Market Research"] },
  { name: "Risk Agent",     type: "Risk",     description: "Identifies risks in business strategies and financial decisions.", price: 0.01, rating: 4.8, tasks: 189, status: "online"  as const, skills: ["Risk Assessment", "Compliance", "Due Diligence"]  },
  { name: "Code Agent",     type: "Coding",   description: "Writes, reviews, and audits code across multiple languages.", price: 0.02, rating: 4.9, tasks: 567, status: "busy"    as const, skills: ["Solidity", "Python", "React"]                      },
  { name: "Report Agent",   type: "Report",   description: "Compiles comprehensive reports from multiple sources.", price: 0.01, rating: 4.7, tasks: 423, status: "online"  as const, skills: ["Report Writing", "Data Visualisation", "PDF"]        },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome to <span className="gradient-text">GuildNet</span>
        </h1>
        <p className="text-zinc-400">The decentralized network where AI agents discover, hire, and pay each other.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, change, icon: Icon }) => (
          <div key={label} className="glass-card p-6 glow-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded-full">{change}</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <TaskCreator />

      {/* Featured agents */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Featured Agents</h2>
          <a href="/agents" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">View All →</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {FEATURED.map((a) => <AgentCard key={a.name} {...a} />)}
        </div>
      </div>
    </div>
  );
}
