"use client";

import { useState } from "react";
import { Send, Sparkles, Loader2, CheckCircle, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { CAPABILITIES } from "@/lib/constants";
import type { TaskRecord } from "@/hooks/use-tasks";

const PIPELINE_LABELS: Record<string, string> = {
  creating: "⛓️ Creating on-chain",
  research: "🔍 Research",
  risk:     "⚠️ Risk",
  coding:   "💻 Coding",
  design:   "🎨 Design",
  audit:    "✅ Audit",
  report:   "📄 Report",
};

const OUTPUT_LABELS: Record<string, string> = {
  research: "🔍 Research", riskAnalysis: "⚠️ Risk Analysis",
  coding: "💻 Code", design: "🎨 Design",
  audit: "✅ Audit", report: "📄 Final Report",
};

interface Props {
  onTaskComplete?: (task: TaskRecord) => void;
}

export function TaskCreator({ onTaskComplete }: Props) {
  const [description, setDescription] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(["research","risk","audit","report"]);
  const [step,     setStep]   = useState("idle");
  const [result,   setResult] = useState<TaskRecord | null>(null);
  const [error,    setError]  = useState("");
  const [expanded, setExpanded] = useState<string | null>("report");

  const busy = step !== "idle" && step !== "done" && step !== "error";
  const pipelineKeys = ["creating", ...capabilities];
  const stepIndex = pipelineKeys.indexOf(step);

  async function handleSubmit() {
    if (!description.trim() || busy) return;
    setResult(null); setError(""); setStep("creating");
    let si = 0;
    const ticker = setInterval(() => {
      si = Math.min(si + 1, pipelineKeys.length - 1);
      setStep(pipelineKeys[si]);
    }, 14_000);

    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, budgetEth: "0.008", capabilities }),
      });
      clearInterval(ticker);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }
      const data = await res.json();
      const record: TaskRecord = { ...data, description, status: "completed", createdAt: Date.now() };
      setResult(record);
      setStep("done");
      onTaskComplete?.(record);
    } catch (e: unknown) {
      clearInterval(ticker);
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  return (
    <div className="glass-card p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create New Task</h2>
          <p className="text-sm text-zinc-400">Autonomous agents · on-chain payments · Venice AI</p>
        </div>
      </div>

      {/* Capability selector */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Select agents</p>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map(cap => {
            const active = capabilities.includes(cap);
            return (
              <button
                key={cap}
                disabled={busy}
                onClick={() => setCapabilities(prev =>
                  active && prev.length > 1 ? prev.filter(c => c !== cap) : active ? prev : [...prev, cap]
                )}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400"
                    : "border-white/10 bg-white/5 text-zinc-500 hover:text-white"
                }`}
              >
                {cap}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className="relative">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
          placeholder="Describe your task... (⌘+Enter to submit)"
          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 pr-14 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all"
          disabled={busy}
        />
        <button
          onClick={handleSubmit}
          disabled={!description.trim() || busy}
          className="absolute bottom-4 right-4 p-2 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      {/* Progress */}
      {busy && (
        <div className="flex flex-wrap gap-2">
          {pipelineKeys.map((key, i) => {
            const isActive = key === step;
            const isDone   = i < stepIndex;
            return (
              <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isActive ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400 animate-pulse" :
                isDone   ? "border-green-500/30 bg-green-500/10 text-green-400" :
                           "border-white/10 bg-white/5 text-zinc-500"
              }`}>
                {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? "✓" : ""}
                {PIPELINE_LABELS[key] ?? key}
              </div>
            );
          })}
        </div>
      )}

      {/* Error */}
      {step === "error" && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {step === "done" && result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Task #{result.taskId} completed</span>
            </div>
            <span className="text-xs text-zinc-500">{result.agentsHired.length} agents · {result.txHashes.length} txs</span>
            <a href={`https://sepolia.basescan.org/tx/${result.txHashes[0]}`} target="_blank" rel="noreferrer"
              className="text-xs text-cyan-400 hover:underline">Basescan →</a>
          </div>

          {(["research","riskAnalysis","coding","design","audit","report"] as const).map(key => {
            const val = result[key];
            if (!val) return null;
            const isOpen = expanded === key;
            return (
              <div key={key} className="border border-white/10 rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/[0.08] transition-colors text-left">
                  <span className="text-sm font-medium text-white">{OUTPUT_LABELS[key]}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </button>
                {isOpen && (
                  <div className="px-4 py-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto border-t border-white/5">
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
