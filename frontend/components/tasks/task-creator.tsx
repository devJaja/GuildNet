"use client";

import { useState } from "react";
import { Send, Sparkles, Loader2, CheckCircle, ChevronDown, ChevronUp, AlertCircle, Zap } from "lucide-react";
import { CAPABILITIES, CONTRACTS } from "@/lib/constants";
import { useWallet } from "@/hooks/use-wallet";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, parseEther, encodeFunctionData } from "viem";
import type { TaskRecord } from "@/hooks/use-tasks";

const PIPELINE_LABELS: Record<string, string> = {
  creating:  "⛓️ Smart Account tx",
  research:  "🔍 Research",
  risk:      "⚠️ Risk",
  coding:    "💻 Coding",
  design:    "🎨 Design",
  audit:     "✅ Audit",
  report:    "📄 Report",
};

const OUTPUT_LABELS: Record<string, string> = {
  research: "🔍 Research", riskAnalysis: "⚠️ Risk Analysis",
  coding: "💻 Code", design: "🎨 Design",
  audit: "✅ Audit", report: "📄 Final Report",
};

const CREATE_TASK_ABI = [{
  name: "createTask",
  type: "function",
  stateMutability: "payable",
  inputs: [{ name: "description", type: "string" }, { name: "duration", type: "uint256" }],
  outputs: [{ name: "", type: "uint256" }],
}] as const;

const baseSepolia = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
} as const;

interface Props { onTaskComplete?: (task: TaskRecord) => void; }

export function TaskCreator({ onTaskComplete }: Props) {
  const [description,   setDescription]   = useState("");
  const [capabilities,  setCapabilities]  = useState<string[]>(["research","risk","audit","report"]);
  const [step,          setStep]          = useState("idle");
  const [result,        setResult]        = useState<TaskRecord | null>(null);
  const [error,         setError]         = useState("");
  const [expanded,      setExpanded]      = useState<string | null>("report");
  const [onChainTx,     setOnChainTx]     = useState("");

  const { connected, address, smartAccount, connect } = useWallet();
  const { wallets } = useWallets();

  const busy = step !== "idle" && step !== "done" && step !== "error";
  const pipelineKeys = ["creating", ...capabilities];
  const stepIndex = pipelineKeys.indexOf(step);

  async function handleSubmit() {
    if (!description.trim() || busy) return;
    if (!connected) { connect(); return; }

    setResult(null); setError(""); setOnChainTx(""); setStep("creating");

    try {
      // ── Step 1: MetaMask Smart Account sends createTask on-chain directly ──
      const wallet = wallets.find(w => w.address === address);
      if (!wallet) throw new Error("Wallet not found");

      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain: baseSepolia,
        transport: custom(provider),
      });

      const BUDGET = parseEther("0.008");
      const data   = encodeFunctionData({
        abi: CREATE_TASK_ABI,
        functionName: "createTask",
        args: [description, BigInt(7 * 24 * 60 * 60)],
      });

      // Smart Account sends the tx — this is the MetaMask Smart Accounts Kit integration
      const txHash = await walletClient.sendTransaction({
        to: CONTRACTS.TASK_COORDINATOR,
        data,
        value: BUDGET,
      });
      setOnChainTx(txHash);

      // ── Step 2: Backend coordinator hires agents and runs Venice AI ──
      let si = 1;
      const ticker = setInterval(() => {
        si = Math.min(si + 1, pipelineKeys.length - 1);
        setStep(pipelineKeys[si]);
      }, 14_000);

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

      const data2 = await res.json();
      const record: TaskRecord = { ...data2, description, status: "completed", createdAt: Date.now() };
      setResult(record);
      setStep("done");
      onTaskComplete?.(record);
    } catch (e: unknown) {
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
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-zinc-400">Autonomous agents · on-chain payments · Venice AI</p>
            {smartAccount && (
              <span className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" /> MetaMask Smart Account
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Capability selector */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Select agents</p>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map(cap => {
            const active = capabilities.includes(cap);
            return (
              <button key={cap} disabled={busy}
                onClick={() => setCapabilities(prev =>
                  active && prev.length > 1 ? prev.filter(c => c !== cap) : active ? prev : [...prev, cap]
                )}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400"
                         : "border-white/10 bg-white/5 text-zinc-500 hover:text-white"
                }`}>
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
        <button onClick={handleSubmit} disabled={!description.trim() || busy}
          className="absolute bottom-4 right-4 p-2 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg text-white disabled:opacity-40 hover:opacity-90 transition-opacity">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      {/* Not connected */}
      {!connected && (
        <p className="text-xs text-zinc-500 text-center">
          <button onClick={connect} className="text-cyan-400 hover:underline">Connect your wallet</button> to submit tasks
        </p>
      )}

      {/* On-chain tx link (shown as soon as Smart Account tx is confirmed) */}
      {onChainTx && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Smart Account tx confirmed:
          <a href={`https://sepolia.basescan.org/tx/${onChainTx}`} target="_blank" rel="noreferrer"
            className="text-cyan-400 hover:underline font-mono">{onChainTx.slice(0,18)}…</a>
        </div>
      )}

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
