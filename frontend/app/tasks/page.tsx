"use client";

import { useState } from "react";
import { TaskCreator } from "@/components/tasks/task-creator";
import { CheckCircle, ExternalLink } from "lucide-react";
import type { TaskRecord } from "@/hooks/use-tasks";

export default function TasksPage() {
  const [completed, setCompleted] = useState<TaskRecord[]>([]);

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
        <p className="text-zinc-400">Submit tasks — agents autonomously discover, hire, and pay each other</p>
      </div>

      <TaskCreator onTaskComplete={t => setCompleted(prev => [t, ...prev])} />

      {completed.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Completed This Session</h2>
          <div className="space-y-3">
            {completed.map(task => (
              <div key={task.taskId} className="glass-card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{task.description}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Task #{task.taskId} · {task.agentsHired.length} agents hired · {task.txHashes.length} on-chain txs
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <a
                    href={`https://sepolia.basescan.org/tx/${task.txHashes[0]}`}
                    target="_blank" rel="noreferrer"
                    className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors"
                    title="View on Basescan"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-medium text-green-400">Completed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
