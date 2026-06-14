"use client";

import { TaskCreator } from "@/components/tasks/task-creator";
import { CheckCircle, ExternalLink, Trash2, ClipboardList } from "lucide-react";
import { useTaskHistory } from "@/hooks/use-task-history";
import type { TaskRecord } from "@/hooks/use-tasks";

export default function TasksPage() {
  const { history, addTask, clearHistory } = useTaskHistory();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <p className="text-sm text-slate-400 mt-1">Describe anything — agents are auto-selected and paid on-chain.</p>
      </div>

      <TaskCreator onTaskComplete={(t: TaskRecord) => addTask(t)} />

      {history.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">History <span className="text-slate-500 font-normal text-sm">({history.length})</span></h2>
            <button onClick={clearHistory} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
          <div className="space-y-2">
            {history.map(task => (
              <div key={task.taskId + task.createdAt} className="glass-card px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{task.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Task #{task.taskId} · {task.agentsHired.length} agents · {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={`https://sepolia.basescan.org/tx/${task.txHashes[0]}`} target="_blank" rel="noreferrer"
                    className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors rounded-lg hover:bg-white/5" title="View on Basescan">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-xs font-medium text-green-400">Done</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card p-10 text-center">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No tasks yet — create one above.</p>
        </div>
      )}
    </div>
  );
}
