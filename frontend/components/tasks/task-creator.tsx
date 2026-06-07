"use client";

import { useState } from "react";
import { Send, Sparkles, Loader2, CheckCircle } from "lucide-react";

type Step = "idle" | "decomposing" | "hiring" | "executing" | "done";

const STEPS = [
  { key: "decomposing", label: "Decomposing Task", emoji: "🔍" },
  { key: "hiring",      label: "Hiring Agents",    emoji: "🤖" },
  { key: "executing",   label: "Executing",         emoji: "⚡" },
];

export function TaskCreator() {
  const [task, setTask]   = useState("");
  const [step, setStep]   = useState<Step>("idle");

  const busy = step !== "idle" && step !== "done";

  async function handleSubmit() {
    if (!task.trim() || busy) return;
    setStep("decomposing");
    await delay(1800);
    setStep("hiring");
    await delay(1800);
    setStep("executing");
    await delay(1800);
    setStep("done");
    setTimeout(() => { setStep("idle"); setTask(""); }, 2500);
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="glass-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create New Task</h2>
          <p className="text-sm text-zinc-400">Describe what you need — the Coordinator handles the rest</p>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g., Generate a market entry report for EV charging in Southeast Asia..."
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

      {(busy || step === "done") && (
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          {step === "done" ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Task completed successfully!</span>
            </div>
          ) : (
            STEPS.map((s, i) => {
              const isActive  = s.key === step;
              const isDone    = i < stepIndex;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border ${
                    isActive ? "border-cyan-500/50 bg-cyan-500/20 animate-pulse" :
                    isDone   ? "border-green-500/50 bg-green-500/20" :
                               "border-white/10 bg-white/5"
                  }`}>
                    {isActive ? <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" /> :
                     isDone   ? <span className="text-green-400 text-xs">✓</span> :
                                <span className="text-zinc-500">{s.emoji}</span>}
                  </div>
                  <span className={`text-sm ${isActive ? "text-cyan-400" : isDone ? "text-green-400" : "text-zinc-500"}`}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
