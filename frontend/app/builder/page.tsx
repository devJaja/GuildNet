"use client";

import { useState } from "react";
import { Wand2, Loader2, CheckCircle, AlertCircle, FileCode, ExternalLink, Monitor } from "lucide-react";
import { BACKEND_URL } from "@/lib/constants";

interface BuildResult {
  success: boolean;
  outputDir: string;
  previewUrl?: string;
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
  const [preview, setPreview] = useState(false);

  const STAGES = ["🏗️ Architecting...", "💻 Writing code...", "🎨 Polishing UI + reviewing...", "📦 Building...", "🚀 Starting preview..."];

  async function handleBuild() {
    if (!prompt.trim() || loading) return;
    setLoading(true); setResult(null); setError(""); setPreview(false); setStage(STAGES[0]);

    let si = 0;
    const ticker = setInterval(() => { si = Math.min(si + 1, STAGES.length - 1); setStage(STAGES[si]); }, 22_000);

    try {
      const res = await fetch(`${BACKEND_URL}/build`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(300_000),
      });
      clearInterval(ticker);
      if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error ?? res.statusText); }
      const data: BuildResult = await res.json();
      setResult(data);
      if (data.previewUrl) setPreview(true);
    } catch (e: unknown) {
      clearInterval(ticker);
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); setStage(""); }
  }

  return (
    <div className="space-y-6 stagger">
      <div>
        <h1 className="text-2xl font-bold text-white">AI <span className="gradient-text">Builder</span></h1>
        <p className="text-sm text-slate-400 mt-1">One prompt → full working website or dApp, live and clickable.</p>
      </div>

      {/* Input */}
      <div className="glass-card p-6 space-y-4">
        <div className="relative">
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleBuild(); }}
            placeholder="Describe what you want to build... (⌘+Enter)"
            className="input-base p-4 pr-14 h-28 resize-none text-sm" disabled={loading} />
          <button onClick={handleBuild} disabled={!prompt.trim() || loading}
            className="btn-primary absolute bottom-4 right-4 p-2.5 rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => setPrompt(ex)} disabled={loading}
              className="btn-ghost px-3 py-1.5 text-xs rounded-lg">{ex}</button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {loading && (
        <div className="glass-card p-5 flex items-center gap-4">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />
          <div>
            <p className="text-white font-medium text-sm">{stage}</p>
            <p className="text-xs text-slate-500 mt-0.5">4 AI agents · ~90 seconds · full project with live preview</p>
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
          {/* Status bar */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${result.success ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
            <CheckCircle className={`w-5 h-5 flex-shrink-0 ${result.success ? "text-green-400" : "text-amber-400"}`} />
            <div className="flex-1">
              <p className={`font-medium text-sm ${result.success ? "text-green-400" : "text-amber-400"}`}>
                {result.success ? "Build successful" : "Build completed with warnings"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{result.plan.stack} · {result.files.length} files generated</p>
            </div>
            {result.previewUrl && (
              <a href={result.previewUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 btn-primary px-4 py-2 text-xs rounded-xl flex-shrink-0">
                <ExternalLink className="w-3.5 h-3.5" /> Open Site
              </a>
            )}
          </div>

          {/* Live preview iframe */}
          {result.previewUrl && preview && (
            <div className="glass-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Live Preview</span>
                <code className="text-xs text-slate-500 ml-auto">{result.previewUrl}</code>
                <button onClick={() => setPreview(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>
              <iframe src={result.previewUrl} className="w-full border-0" style={{ height: "600px" }}
                title="Live Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
            </div>
          )}

          {/* File list */}
          <div className="glass-card p-4">
            <p className="text-xs font-medium text-white mb-3">Generated Files</p>
            <div className="space-y-1.5">
              {result.files.map(f => (
                <div key={f.path} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <code className="text-slate-300">{f.path}</code>
                  </div>
                  <span className="text-slate-600">{(f.size / 1024).toFixed(1)}kb</span>
                </div>
              ))}
            </div>
          </div>

          {/* Build log */}
          {result.buildLog && (
            <details className="glass-card p-4">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-white">Build log</summary>
              <pre className="mt-3 text-xs text-slate-500 overflow-auto max-h-48 whitespace-pre-wrap">{result.buildLog}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
