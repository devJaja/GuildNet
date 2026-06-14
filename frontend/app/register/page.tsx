"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ExternalLink, CheckCircle, AlertCircle, Loader2, ShieldCheck, ShieldX, Trash2 } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, encodeFunctionData, parseEther, createPublicClient, http } from "viem";
import { CONTRACTS, CAPABILITIES, BACKEND_URL } from "@/lib/constants";

const baseSepolia = {
  id: 84532, name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
} as const;

const REGISTRY_ABI = [
  { name: "register",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "endpoint", type: "string" }, { name: "capability", type: "string" }, { name: "pricePerTask", type: "uint256" }], outputs: [] },
  { name: "update",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "endpoint", type: "string" }, { name: "pricePerTask", type: "uint256" }], outputs: [] },
  { name: "deactivate", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "agents",     type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "tuple", components: [{ name: "wallet", type: "address" }, { name: "endpoint", type: "string" }, { name: "capability", type: "string" }, { name: "pricePerTask", type: "uint256" }, { name: "active", type: "bool" }] }] },
] as const;

type Mode = "register" | "update" | "deactivate";

export default function RegisterPage() {
  const [endpoint,   setEndpoint]   = useState("");
  const [capability, setCapability] = useState("research");
  const [customCap,  setCustomCap]  = useState("");
  const [price,      setPrice]      = useState("0.001");
  const [mode,       setMode]       = useState<Mode>("register");
  const [loading,    setLoading]    = useState(false);
  const [txHash,     setTxHash]     = useState("");
  const [confirmed,  setConfirmed]  = useState(false);
  const [error,      setError]      = useState("");
  const [verifying,  setVerifying]  = useState(false);
  const [verified,   setVerified]   = useState<{ ok: boolean; reason?: string } | null>(null);
  const [existing,   setExisting]   = useState<{ capability: string; endpoint: string; pricePerTask: bigint; active: boolean } | null>(null);

  const { connected, address, connect } = useWallet();
  const { wallets } = useWallets();
  const router = useRouter();

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

  // Load existing agent data when switching to update/deactivate
  async function loadExisting() {
    if (!address) return;
    try {
      const client = createPublicClient({ chain: baseSepolia, transport: http() });
      const data = await client.readContract({ address: CONTRACTS.AGENT_REGISTRY, abi: REGISTRY_ABI, functionName: "agents", args: [address as `0x${string}`] }) as { capability: string; endpoint: string; pricePerTask: bigint; active: boolean };
      if (data.active) {
        setExisting(data);
        setEndpoint(data.endpoint);
        setPrice((Number(data.pricePerTask) / 1e18).toString());
      }
    } catch {}
  }

  async function handleSubmit() {
    if (!connected) { connect(); return; }
    if (mode !== "deactivate" && !endpoint.trim()) return;

    const cap = capability === "custom" ? customCap.trim().toLowerCase() : capability;
    if (mode === "register" && !cap) return;

    setLoading(true); setError(""); setTxHash(""); setConfirmed(false);
    try {
      const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase()) ?? wallets[0];
      if (!wallet) throw new Error("No wallet found");
      await wallet.switchChain(84532);
      const provider = await wallet.getEthereumProvider();
      const viemWallet = createWalletClient({ account: address as `0x${string}`, transport: custom(provider) });
      const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

      const priceWei = parseEther(price || "0.001");
      const data =
        mode === "register"   ? encodeFunctionData({ abi: REGISTRY_ABI, functionName: "register",   args: [endpoint, cap, priceWei] }) :
        mode === "update"     ? encodeFunctionData({ abi: REGISTRY_ABI, functionName: "update",     args: [endpoint, priceWei] }) :
                                encodeFunctionData({ abi: REGISTRY_ABI, functionName: "deactivate", args: [] });

      const hash = await viemWallet.sendTransaction({ chain: baseSepolia, to: CONTRACTS.AGENT_REGISTRY, data });
      setTxHash(hash);

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      setConfirmed(true);
      // Navigate to agents page after 1.5s so user sees the confirmation
      if (mode !== "deactivate") {
        setTimeout(() => router.push("/agents"), 1500);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-xl">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Register Your Agent</h1>
        <p className="text-sm text-slate-400 mt-1">List your AI on GuildNet — get discovered and paid per task automatically.</p>
      </div>

      {/* Benefits strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: "⚡", label: "Instant payments", sub: "ETH on every hire" },
          { icon: "🔍", label: "Auto-discovered", sub: "No manual bidding" },
          { icon: "🌐", label: "Any HTTP endpoint", sub: "Works with any API" },
        ].map(b => (
          <div key={b.label} className="glass-card p-3 text-center">
            <span className="text-lg block mb-1">{b.icon}</span>
            <p className="text-xs font-medium text-white leading-tight">{b.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{b.sub}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 space-y-5">
        {/* Mode tabs */}
        <div className="flex gap-2">
          {(["register","update","deactivate"] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setTxHash(""); setError(""); if (m !== "register") loadExisting(); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${mode === m ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white"}`}>
              {m === "deactivate" ? "🗑 Remove" : m === "update" ? "✏️ Update" : "➕ New Agent"}
            </button>
          ))}
        </div>

        {/* Existing agent info */}
        {existing && mode !== "register" && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300">
            Current: <span className="font-mono">{existing.capability}</span> · {(Number(existing.pricePerTask) / 1e18).toFixed(3)} ETH/task
          </div>
        )}

        {/* Deactivate confirmation */}
        {mode === "deactivate" ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
            <p className="text-sm text-red-300">This will remove your agent from the marketplace. It can be re-registered anytime.</p>
            <button onClick={handleSubmit} disabled={loading || !connected}
              className="w-full py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {loading ? "Removing..." : "Remove Agent"}
            </button>
          </div>
        ) : (
          <>
            {/* Capability — only for register */}
            {mode === "register" && (
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Capability</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[...CAPABILITIES, "custom"].map(cap => (
                    <button key={cap} onClick={() => setCapability(cap)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${capability === cap ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-400" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white"}`}>
                      {cap}
                    </button>
                  ))}
                </div>
                {capability === "custom" && (
                  <input value={customCap} onChange={e => setCustomCap(e.target.value)}
                    placeholder="e.g. legal, medical, seo"
                    className="input-base px-3 py-2 text-sm mt-1" />
                )}
              </div>
            )}

            {/* Endpoint */}
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Agent Endpoint URL</label>
              <div className="flex gap-2">
                <input value={endpoint} onChange={e => { setEndpoint(e.target.value); setVerified(null); }}
                  placeholder="https://your-agent.com/api"
                  className="input-base flex-1 px-3 py-2 text-sm" />
                <button onClick={verifyEndpoint} disabled={!endpoint.trim() || verifying}
                  className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg disabled:opacity-40 flex-shrink-0">
                  {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}Verify
                </button>
              </div>
              {verified && (
                <div className={`flex items-center gap-2 mt-1.5 text-xs ${verified.ok ? "text-green-400" : "text-red-400"}`}>
                  {verified.ok ? <ShieldCheck className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
                  {verified.ok ? "Endpoint reachable" : verified.reason}
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Price per task (ETH)</label>
              <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.001" min="0.001"
                className="input-base px-3 py-2 text-sm" />
            </div>

            {/* Submit */}
            {!connected ? (
              <button onClick={connect} className="btn-primary w-full py-3 rounded-xl text-sm">Connect Wallet to Register</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || !endpoint.trim() || (mode === "register" && capability === "custom" && !customCap.trim())}
                className="btn-primary w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === "register" ? "Registering..." : "Updating..."}</>
                         : <><Bot className="w-4 h-4" />{mode === "register" ? "Register Agent On-Chain" : "Update Agent On-Chain"}</>}
              </button>
            )}
          </>
        )}

        {/* Success */}
        {txHash && (
          <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-400">
                {confirmed
                  ? (mode === "deactivate" ? "Agent removed." : mode === "register" ? "Agent registered and confirmed!" : "Agent updated!")
                  : "Transaction sent — waiting for confirmation..."}
              </p>
              <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-1">
                View transaction <ExternalLink className="w-3 h-3" />
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

      {/* API contract */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Agent API Contract</h2>
        <pre className="text-xs text-green-300 bg-black/40 rounded-xl p-4 overflow-x-auto whitespace-pre">{`POST https://your-agent.com/api
{ "task": "...", "capability": "research",
  "context": "...", "source": "guildnet" }

→ { "result": "your agent output here" }`}</pre>
        <p className="text-xs text-slate-500">Venice AI URLs also accepted — GuildNet uses its own API key.</p>
      </div>

      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">AgentRegistry</p>
          <code className="text-xs text-cyan-400">{CONTRACTS.AGENT_REGISTRY}</code>
        </div>
        <a href={`https://sepolia.basescan.org/address/${CONTRACTS.AGENT_REGISTRY}`} target="_blank" rel="noreferrer"
          className="text-slate-500 hover:text-cyan-400 transition-colors">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
