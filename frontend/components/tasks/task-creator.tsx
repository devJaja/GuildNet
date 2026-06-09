"use client";

import { useState } from "react";
import { Send, Sparkles, Loader2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { BACKEND_URL } from "@/lib/constants";

type Step = "idle" | "creating" | "research" | "risk" | "coding" | "design" | "audit" | "report" | "done" | "error";

interface TaskOutput {
  taskId: string;
  research?: string;
  riskAnalysis?: string;
  coding?: string;
  design?: string;
  audit?: string;
  report?: string;
  agentsHired: string[];
  txHashes: string[];
}

const PIPELINE: { key: Step; label: string; emoji: string }[] = [
  { key: "creating",  label: "Creating task on-chain",  emoji: "⛓️"  },
  { key: "research",  label: "Research Agent",           emoji: "🔍"  },
  { key: "risk",      label: "Risk Agent",               emoji: "⚠️"  },
  { key: "coding",    label: "Coding Agent",             emoji: "💻"  },
  { key: "design",    label: "Design Agent",             emoji: "🎨"  },
  { key: "audit",     label: "Audit Agent",              emoji: "✅"  },
  { key: "report",    label: "Report Agent",             emoji: "📄"  },
];

export function TaskCreator() {
  const [task,     setTask]     = useState("");
  const [step,     setStep]     = useState<Step>("idle");
  const [output,   setOutput]   = useState<TaskOutput | null>(null);
  const [expanded, setExpanded] = useState<string | null>("report");
  const [error,    setError]    = useState("");

  const busy = step !== "idle" && step !== "done" && step !== "error";

  async function handleSubmit() {
    if (!task.trim() || busy) return;
    setOutput(null);
    setError("");
    setStep("creating");

    try {
      // Poll the step label while waiting — backend streams synchronously so we
      // animate through steps while the fetch is in flight.
      const steps: Step[] = ["creating","research","risk","coding","design","audit","report"];
      let si = 0;
      const ticker = setInterval(() => {
        si = Math.min(si + 1, steps.length - 1);
        setStep(steps[si]);
      }, 14_000); // ~14 s per agent (Venice + on-chain confirm)

      const res = await fetch(`${BACKEND_URL}/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: task,
          budgetEth: "0.008",
          capabilities: ["research","risk","coding","design","audit","report"],
        }),
      });

      clearInterval(ticker);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }

      const data: TaskOutput = await res.json();
      setOutput(data);
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  const stepIndex = PIPELINE.findIndex(s => s.key === step);

  return (
    <div className="glass-card p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create New Task</h2>
          <p className="text-sm text-zinc-400">6 AI agents · on-chain payments · Venice AI inference</p>
        </div>
      </div>

      {/* Input */}
      <div className="relative">
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g., Build a decentralized AI agent marketplace on Base..."
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 pr-14 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all"
          disabled={busy}
        />
        <button
          onClick={handleSubmit}
          disabled={!task.trim() || busy}
          className="absolute bottom-4 right-4 p-2 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      {/* Progress */}
      {busy && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 mb-3">Pipeline running — each agent pays on-chain before executing</p>
          <div className="flex flex-wrap gap-2">
            {PIPELINE.map((s, i) => {
              const isActive = s.key === step;
              const isDone   = i < stepIndex;
              return (
                <div key={s.key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  isActive ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400 animate-pulse" :
                  isDone   ? "border-green-500/30 bg-green-500/10 text-green-400" :
                             "border-white/10 bg-white/5 text-zinc-500"
                }`}>
                  {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> :
                   isDone   ? <span>✓</span> :
                              <span>{s.emoji}</span>}
                  {s.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {step === "error" && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {step === "done" && output && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Task #{output.taskId} completed</span>
            </div>
            <span className="text-xs text-zinc-500">{output.agentsHired.length} agents hired · {output.txHashes.length} on-chain txs</span>
            <a
              href={`https://sepolia.basescan.org/address/${output.agentsHired[0]}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-cyan-400 hover:underline"
            >
              View on Basescan →
            </a>
          </div>

          {/* Agent output sections */}
          {(["research","riskAnalysis","coding","design","audit","report"] as const).map((key) => {
            const val = output[key];
            if (!val) return null;
            const labels: Record<string, string> = {
              research: "🔍 Research", riskAnalysis: "⚠️ Risk Analysis",
              coding: "💻 Code", design: "🎨 Design",
              audit: "✅ Audit", report: "📄 Final Report",
            };
            const isOpen = expanded === key;
            return (
              <div key={key} className="border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/8 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-white">{labels[key]}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </button>
                {isOpen && (
                  <div className="px-4 py-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {val}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
