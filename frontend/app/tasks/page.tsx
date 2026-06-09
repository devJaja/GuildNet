import { TaskCreator } from "@/components/tasks/task-creator";
import { CheckCircle, Clock, Loader2 } from "lucide-react";

const MOCK_TASKS = [
  { id: "0", description: "Market entry report for EV charging in Southeast Asia", status: "completed", agents: 3, spent: "0.03 ETH", refund: "0.02 ETH" },
  { id: "1", description: "Smart contract security audit for DeFi protocol",        status: "running",   agents: 2, spent: "0.02 ETH", refund: "—"        },
  { id: "2", description: "UI/UX design system for mobile Web3 wallet",              status: "pending",   agents: 0, spent: "0 ETH",   refund: "—"        },
];

const STATUS_CONFIG = {
  completed: { icon: CheckCircle, color: "text-green-400",  bg: "bg-green-500/10",  label: "Completed" },
  running:   { icon: Loader2,     color: "text-cyan-400",   bg: "bg-cyan-500/10",   label: "Running"   },
  pending:   { icon: Clock,       color: "text-amber-400",  bg: "bg-amber-500/10",  label: "Pending"   },
};

export default function TasksPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
        <p className="text-zinc-400">Submit tasks and track their execution across agents</p>
      </div>

      <TaskCreator />

      {/* Task history */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Task History</h2>
        <div className="space-y-3">
          {MOCK_TASKS.map((task) => {
            const { icon: Icon, color, bg, label } = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
            return (
              <div key={task.id} className="glass-card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{task.description}</p>
                  <p className="text-xs text-zinc-500 mt-1">Task #{task.id} · {task.agents} agents hired · {task.spent} spent</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                  {task.refund !== "—" && (
                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                      +{task.refund} refunded
                    </span>
                  )}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${color} ${task.status === "running" ? "animate-spin" : ""}`} />
                    <span className={`text-xs font-medium ${color}`}>{label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
