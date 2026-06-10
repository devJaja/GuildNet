"use client";

import { ExternalLink, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { CONTRACTS } from "@/lib/constants";

const RECENT_TXS = [
  { hash: "0x8132a05fd363a1074d6a598fda7d62612cc103f113b237d70150d39638d7ced9", type: "out", label: "Task #15 — createTask",     amount: "0.008 ETH" },
  { hash: "0xb25b4e3f4ad0fabd669d8faea511f9b2165f3651c163ea2f1b309d5eea49446c", type: "out", label: "hireAgent — research",       amount: "0.001 ETH" },
  { hash: "0xe017dca540eca3b6c5f278135411f0167f22db4d76d98b38a56ed3b485cdd0dc", type: "out", label: "hireAgent — risk",           amount: "0.001 ETH" },
  { hash: "0x5740b02d6cbfec28ed393a8b11ee34b601f81dee663715009229ea2a8b9fca71", type: "out", label: "hireAgent — coding",         amount: "0.001 ETH" },
  { hash: "0xfe3ac0207741039b9c9e28a939e1438cc19e60253cc3b60c155fca9f87c4b6b4", type: "out", label: "hireAgent — design",         amount: "0.001 ETH" },
  { hash: "0x921e54d7490fa7225a2248064ac56e2c8602e8003c21518cd723f426f5848799", type: "out", label: "hireAgent — audit",          amount: "0.001 ETH" },
  { hash: "0xa38a7b85fe45bf1c889437fa586f297c7d07a545d333fb95f5b0719374893886", type: "in",  label: "completeTask — refund",     amount: "0.002 ETH" },
];

export default function PaymentsPage() {
  const { connected, address, connect } = useWallet();

  return (
    <div className="space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Payments</h1>
        <p className="text-zinc-400">On-chain payment history via ERC-7710 spend permissions</p>
      </div>

      {/* Contract addresses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "AgentRegistry",    addr: CONTRACTS.AGENT_REGISTRY    },
          { label: "GuildPermissions", addr: CONTRACTS.GUILD_PERMISSIONS },
          { label: "TaskCoordinator",  addr: CONTRACTS.TASK_COORDINATOR  },
        ].map(({ label, addr }) => (
          <div key={label} className="glass-card p-4">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-cyan-400 truncate">{addr}</code>
              <a href={`https://sepolia.basescan.org/address/${addr}`} target="_blank" rel="noreferrer"
                className="text-zinc-500 hover:text-white flex-shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Wallet */}
      {!connected ? (
        <div className="glass-card p-8 text-center space-y-4">
          <p className="text-zinc-400">Connect your wallet to see your payment history</p>
          <button onClick={connect}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity">
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="glass-card p-4">
          <p className="text-xs text-zinc-500 mb-1">Connected</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <code className="text-sm text-white">{address}</code>
            <a href={`https://sepolia.basescan.org/address/${address}`} target="_blank" rel="noreferrer"
              className="text-zinc-500 hover:text-white">
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Recent transactions — from last testnet run */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Recent Transactions — Task #15</h2>
        <div className="space-y-2">
          {RECENT_TXS.map(tx => (
            <div key={tx.hash} className="glass-card px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  tx.type === "out" ? "bg-red-500/10" : "bg-green-500/10"
                }`}>
                  {tx.type === "out"
                    ? <ArrowUpRight className="w-4 h-4 text-red-400" />
                    : <ArrowDownLeft className="w-4 h-4 text-green-400" />}
                </div>
                <div>
                  <p className="text-sm text-white">{tx.label}</p>
                  <code className="text-xs text-zinc-500">{tx.hash.slice(0, 18)}…</code>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-sm font-medium ${tx.type === "out" ? "text-red-400" : "text-green-400"}`}>
                  {tx.type === "out" ? "-" : "+"}{tx.amount}
                </span>
                <a href={`https://sepolia.basescan.org/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                  className="text-zinc-500 hover:text-cyan-400 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
