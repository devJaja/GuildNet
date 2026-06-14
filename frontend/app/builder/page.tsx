"use client";

import { useState } from "react";
import { Wand2, Loader2, CheckCircle, AlertCircle, FileCode, ExternalLink, Monitor, Sparkles } from "lucide-react";
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
  "NFT marketplace with mint button",
  "DeFi staking dApp with APY dashboard",
  "Todo app with glassmorphism UI",
  "SaaS landing page with pricing table",
  "E-commerce store with shopping cart",
  "Portfolio website with dark theme",
];

const STAGES = [
  { icon: "🏗️", label: "Architecting structure" },
  { icon: "💻", label: "Writing all files" },
  { icon: "🎨", label: "Polishing UI design" },
  { icon: "📦", label: "Building project" },
  { icon: "🚀", label: "Starting live preview" },
];

export default function BuilderPage() {
  const [prompt,  setPrompt]  = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<BuildResult | null>(null);
  const [error,   setError]   = useState("");
  const [stageIdx, setStageIdx] = useState(0);
  const [preview, setPreview] = useState(false);

  async function handleBuild() {
    if (!prompt.trim() || loading) return;
    setLoading(true); setResult(null); setError(""); setStageIdx(0); setPreview(false);

    let si = 0;
    const ticker = setInterval(() => { si = Math.min(si + 1, STAGES.length - 1); setStageIdx(si); }, 22_000);

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
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">AI <span className="gradient-text">Builder</span></h1>
        <p className="text-sm text-slate-400 mt-1">One sentence → a fully working, interactive website or dApp.</p>
      </div>

      {/* Input card */}
      <div className="glass-card p-5 sm:p-6 space-y-4">
        <div className="relative">
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild(); }}
            placeholder="Describe what you want to build..."
            rows={3}
            className="input-base p-4 pr-14 resize-none text-sm w-full" disabled={loading} />
          <button onClick={handleBuild} disabled={!prompt.trim() || loading}
            className="btn-primary absolute bottom-3 right-3 p-2.5 rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <p className="text-[11px] text-slate-600 mb-2 uppercase tracking-wide">Try an example</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => setPrompt(ex)} disabled={loading}
                className="btn-ghost px-3 py-1.5 text-xs rounded-lg">{ex}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress */}
      {loading && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
            <p className="text-white text-sm font-medium">{STAGES[stageIdx].icon} {STAGES[stageIdx].label}…</p>
          </div>
          <div className="flex gap-1.5">
            {STAGES.map((s, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= stageIdx ? "bg-cyan-500" : "bg-white/10"}`} />
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">4 AI agents building your project · takes ~90 seconds</p>
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
          <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border ${result.success ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
            <CheckCircle className={`w-5 h-5 flex-shrink-0 ${result.success ? "text-green-400" : "text-amber-400"}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${result.success ? "text-green-400" : "text-amber-400"}`}>
                {result.success ? "Build successful!" : "Build completed with warnings"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{result.plan.stack} · {result.files.length} files</p>
            </div>
            {result.previewUrl && (
              <a href={result.previewUrl} target="_blank" rel="noreferrer"
                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl flex-shrink-0">
                <ExternalLink className="w-3.5 h-3.5" /> Open Site
              </a>
            )}
          </div>

          {/* iframe preview */}
          {result.previewUrl && preview && (
            <div className="glass-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06]">
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Live Preview</span>
                <button onClick={() => setPreview(false)} className="ml-auto text-slate-500 hover:text-white text-lg leading-none">×</button>
              </div>
              <iframe src={result.previewUrl} className="w-full border-0" style={{ height: "580px" }}
                title="Live Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
            </div>
          )}

          {/* Files */}
          <details className="glass-card" open={false}>
            <summary className="px-4 py-3 text-xs font-medium text-slate-400 cursor-pointer hover:text-white select-none">
              {result.files.length} files generated — click to expand
            </summary>
            <div className="px-4 pb-4 space-y-1.5 border-t border-white/[0.06] pt-3">
              {result.files.map(f => (
                <div key={f.path} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <code className="text-slate-300 truncate">{f.path}</code>
                  </div>
                  <span className="text-slate-600 flex-shrink-0">{(f.size / 1024).toFixed(1)}kb</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="glass-card p-10 text-center">
          <Sparkles className="w-10 h-10 text-cyan-400/40 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Describe your project above and hit build.</p>
          <p className="text-slate-600 text-xs mt-1">Works best with specific descriptions.</p>
        </div>
      )}
    </div>
  );
}
