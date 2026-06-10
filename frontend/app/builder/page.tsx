"use client";

import { useState } from "react";
import { Wand2, Loader2, CheckCircle, AlertCircle, FileCode, ExternalLink } from "lucide-react";
import { BACKEND_URL } from "@/lib/constants";

interface BuildResult {
  success: boolean;
  outputDir: string;
  plan: { stack: string; description: string; devCmd: string };
  files: { path: string; size: number }[];
  buildLog: string;
}

const EXAMPLES = [
  "a Web3 NFT marketplace with mint button and dark theme",
  "a DeFi staking dApp with live APY dashboard",
  "a todo app with dark glassmorphism UI",
  "a landing page for a SaaS product with pricing table",
];

export default function BuilderPage() {
  const [prompt,  setPrompt]  = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<BuildResult | null>(null);
  const [error,   setError]   = useState("");
  const [stage,   setStage]   = useState("");

  const STAGES = ["🏗️ Architecting...", "💻 Writing code...", "🎨 Polishing UI + reviewing...", "📦 Building..."];

  async function handleBuild() {
    if (!prompt.trim() || loading) return;
    setLoading(true); setResult(null); setError(""); setStage(STAGES[0]);

    let si = 0;
    const ticker = setInterval(() => {
      si = Math.min(si + 1, STAGES.length - 1);
      setStage(STAGES[si]);
    }, 25_000);

    try {
      const res = await fetch(`${BACKEND_URL}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(300_000),
      });
      clearInterval(ticker);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }
      setResult(await res.json());
    } catch (e: unknown) {
      clearInterval(ticker);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false); setStage("");
    }
  }

  return (
    <div className="space-y-8 animate-slide-up max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          AI <span className="gradient-text">Builder</span>
        </h1>
        <p className="text-zinc-400">One prompt → full working website or dApp. No explanations. Just code.</p>
      </div>

      {/* Input */}
      <div className="glass-card p-6 space-y-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleBuild(); }}
            placeholder="Describe what you want to build... (⌘+Enter)"
            className="w-full h-28 bg-white/5 border border-white/10 rounded-xl p-4 pr-14 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all"
            disabled={loading}
          />
          <button onClick={handleBuild} disabled={!prompt.trim() || loading}
            className="absolute bottom-4 right-4 p-2 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg text-white disabled:opacity-40 hover:opacity-90 transition-opacity">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Examples */}
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => setPrompt(ex)} disabled={loading}
              className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:border-cyan-500/30 transition-all">
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {loading && (
        <div className="glass-card p-6 flex items-center gap-4">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />
          <div>
            <p className="text-white font-medium">{stage}</p>
            <p className="text-xs text-zinc-500 mt-1">4 AI agents working in parallel · ~90 seconds</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            result.success ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"
          }`}>
            <CheckCircle className={`w-5 h-5 flex-shrink-0 ${result.success ? "text-green-400" : "text-amber-400"}`} />
            <div>
              <p className={`font-medium ${result.success ? "text-green-400" : "text-amber-400"}`}>
                {result.success ? "Build successful" : "Build completed with warnings"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{result.plan.stack} · {result.files.length} files</p>
            </div>
          </div>

          {/* Plan */}
          <div className="glass-card p-4 space-y-2">
            <p className="text-sm text-zinc-400">{result.plan.description}</p>
            <code className="text-xs text-cyan-400 block">{result.outputDir}</code>
            <code className="text-xs text-zinc-500 block">Run: {result.plan.devCmd}</code>
          </div>

          {/* File list */}
          <div className="glass-card p-4">
            <p className="text-sm font-medium text-white mb-3">Generated Files</p>
            <div className="space-y-1.5">
              {result.files.map(f => (
                <div key={f.path} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    <code className="text-zinc-300">{f.path}</code>
                  </div>
                  <span className="text-zinc-600">{(f.size / 1024).toFixed(1)}kb</span>
                </div>
              ))}
            </div>
          </div>

          {/* Build log */}
          {result.buildLog && (
            <details className="glass-card p-4">
              <summary className="text-sm text-zinc-400 cursor-pointer hover:text-white">Build log</summary>
              <pre className="mt-3 text-xs text-zinc-500 overflow-auto max-h-48 whitespace-pre-wrap">{result.buildLog}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
