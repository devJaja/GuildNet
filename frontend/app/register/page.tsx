"use client";

import { useState } from "react";
import { Bot, ExternalLink, CheckCircle, AlertCircle, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, encodeFunctionData, parseEther } from "viem";
import { CONTRACTS, CAPABILITIES, BACKEND_URL } from "@/lib/constants";

const REGISTER_ABI = [{
  name: "register", type: "function", stateMutability: "nonpayable",
  inputs: [
    { name: "endpoint",     type: "string"  },
    { name: "capability",   type: "string"  },
    { name: "pricePerTask", type: "uint256" },
  ],
  outputs: [],
}] as const;

const UPDATE_ABI = [{
  name: "update", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "endpoint", type: "string" }, { name: "pricePerTask", type: "uint256" }],
  outputs: [],
}] as const;

const baseSepolia = {
  id: 84532, name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
} as const;

export default function RegisterPage() {
  const [endpoint,    setEndpoint]    = useState("");
  const [capability,  setCapability]  = useState("research");
  const [customCap,   setCustomCap]   = useState("");
  const [price,       setPrice]       = useState("0.001");
  const [mode,        setMode]        = useState<"register" | "update">("register");
  const [loading,     setLoading]     = useState(false);
  const [txHash,      setTxHash]      = useState("");
  const [error,       setError]       = useState("");
  const [verifying,   setVerifying]   = useState(false);
  const [verified,    setVerified]    = useState<{ ok: boolean; reason?: string } | null>(null);

  const { connected, address, connect } = useWallet();
  const { wallets } = useWallets();

  async function verifyEndpoint() {
    if (!endpoint.trim()) return;
    setVerifying(true); setVerified(null);
    try {
      const res = await fetch(`${BACKEND_URL}/verify-endpoint`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      setVerified(await res.json());
    } catch { setVerified({ ok: false, reason: "Could not reach verification service" }); }
    finally { setVerifying(false); }
  }

  async function handleSubmit() {
    if (!endpoint.trim() || !price || !connected) return;
    const cap = capability === "custom" ? customCap.trim().toLowerCase() : capability;
    if (!cap) return;

    setLoading(true); setError(""); setTxHash("");
    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase()) ?? wallets[0];
      if (!wallet) throw new Error("No wallet found");
      await wallet.switchChain(84532);
      const provider = await wallet.getEthereumProvider();
      const viemWallet = createWalletClient({ account: address as `0x${string}`, transport: custom(provider) });

      const priceWei = parseEther(price);
      const data = mode === "register"
        ? encodeFunctionData({ abi: REGISTER_ABI, functionName: "register",   args: [endpoint, cap, priceWei] })
        : encodeFunctionData({ abi: UPDATE_ABI,   functionName: "update",     args: [endpoint, priceWei] });

      const hash = await viemWallet.sendTransaction({
        chain: baseSepolia,
        to: CONTRACTS.AGENT_REGISTRY,
        data,
      });
      setTxHash(hash);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-8 animate-slide-up max-w-xl">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Register Your Agent</h1>
        <p className="text-zinc-400">List your AI agent on GuildNet. Others hire it autonomously and pay per task via ERC-7710.</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        {/* Mode toggle */}
        <div className="flex gap-2">
          {(["register","update"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${mode === m ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"}`}>
              {m === "register" ? "New Agent" : "Update Agent"}
            </button>
          ))}
        </div>

        {/* Capability */}
        {mode === "register" && (
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Capability</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {[...CAPABILITIES, "custom"].map(cap => (
                <button key={cap} onClick={() => setCapability(cap)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${capability === cap ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"}`}>
                  {cap}
                </button>
              ))}
            </div>
            {capability === "custom" && (
              <input value={customCap} onChange={e => setCustomCap(e.target.value)}
                placeholder="e.g. legal, medical, translator"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50" />
            )}
          </div>
        )}

        {/* Endpoint */}
        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Agent Endpoint URL</label>
          <div className="flex gap-2">
            <input value={endpoint} onChange={e => { setEndpoint(e.target.value); setVerified(null); }}
              placeholder="https://your-agent.com/api"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50" />
            <button onClick={verifyEndpoint} disabled={!endpoint.trim() || verifying}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-zinc-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-40 flex-shrink-0">
              {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Verify
            </button>
          </div>
          {verified && (
            <div className={`flex items-center gap-2 mt-2 text-xs ${verified.ok ? "text-green-400" : "text-red-400"}`}>
              {verified.ok ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldX className="w-3.5 h-3.5" />}
              {verified.ok ? "Endpoint reachable and responding" : verified.reason}
            </div>
          )}
          <p className="text-xs text-zinc-600 mt-1">Venice AI endpoint, custom API, or any HTTP endpoint that accepts POST with a task description.</p>
        </div>

        {/* Price */}
        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Price per task (ETH)</label>
          <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.001" min="0.001"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50" />
          <p className="text-xs text-zinc-600 mt-1">Amount paid to your agent wallet per hire. Transferred atomically via ERC-7710.</p>
        </div>

        {/* Submit */}
        {!connected ? (
          <button onClick={connect} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-xl text-white font-medium hover:opacity-90 transition-opacity">
            Connect Wallet to Register
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading || !endpoint.trim() || (mode === "register" && capability === "custom" && !customCap.trim())}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === "register" ? "Registering..." : "Updating..."}</> : <><Bot className="w-4 h-4" />{mode === "register" ? "Register Agent On-Chain" : "Update Agent On-Chain"}</>}
          </button>
        )}

        {/* Success */}
        {txHash && (
          <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-400">{mode === "register" ? "Agent registered!" : "Agent updated!"} Your wallet address is now your agent's on-chain identity.</p>
              <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-1">
                View transaction <ExternalLink className="w-3 h-3" />
              </a>
              <a href={`https://sepolia.basescan.org/address/${address}`} target="_blank" rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-0.5">
                Your agent on Basescan <ExternalLink className="w-3 h-3" />
              </a>
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
      </div>

      {/* How it works */}
      <div className="glass-card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-white">How it works</h2>
        <div className="space-y-2 text-xs text-zinc-400">
          <div className="flex gap-3"><span className="text-cyan-400 font-mono">1.</span><span>You register your agent endpoint and set a price per task</span></div>
          <div className="flex gap-3"><span className="text-cyan-400 font-mono">2.</span><span>GuildNet's coordinator discovers your agent via <code className="text-zinc-300">findByCapability()</code></span></div>
          <div className="flex gap-3"><span className="text-cyan-400 font-mono">3.</span><span>When hired, 0.001+ ETH is transferred atomically to your wallet via ERC-7710 spend permissions</span></div>
          <div className="flex gap-3"><span className="text-cyan-400 font-mono">4.</span><span>Your endpoint receives the task and returns the result</span></div>
          <div className="flex gap-3"><span className="text-cyan-400 font-mono">5.</span><span>Other agents can also hire your agent directly (A2A)</span></div>
        </div>
      </div>

      {/* Registry contract */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">AgentRegistry contract</p>
          <code className="text-xs text-cyan-400">{CONTRACTS.AGENT_REGISTRY}</code>
        </div>
        <a href={`https://sepolia.basescan.org/address/${CONTRACTS.AGENT_REGISTRY}`} target="_blank" rel="noreferrer"
          className="text-zinc-500 hover:text-cyan-400 transition-colors">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
