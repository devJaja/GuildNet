"use client";

import { ExternalLink, ArrowUpRight, ArrowDownLeft, Wallet, Receipt } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { useTaskHistory } from "@/hooks/use-task-history";

export default function PaymentsPage() {
  const { connected, address, connect } = useWallet();
  const { history } = useTaskHistory();

  const txRows = history.flatMap(task =>
    task.txHashes.map((hash, i) => ({
      hash,
      label: i === 0
        ? `Created task #${task.taskId}`
        : i === task.txHashes.length - 1
        ? `Refund — task #${task.taskId}`
        : `Paid ${task.agentsHired[i - 1]?.slice(0, 6)}… agent`,
      type:   i === task.txHashes.length - 1 ? "in" : "out",
      amount: i === 0 ? "0.008 ETH" : i === task.txHashes.length - 1 ? "refund" : "0.001 ETH",
      taskId: task.taskId,
    }))
  );

  const totalOut = history.reduce((s, t) => s + t.agentsHired.length * 0.001, 0);
  const totalTxs = txRows.length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-sm text-slate-400 mt-1">On-chain payment history via ERC-7710 spend permissions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Spent</p>
          <p className="text-lg font-bold text-white">{totalOut.toFixed(3)} ETH</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 mb-1">Transactions</p>
          <p className="text-lg font-bold text-white">{totalTxs}</p>
        </div>
        <div className="glass-card p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500 mb-1">Tasks</p>
          <p className="text-lg font-bold text-white">{history.length}</p>
        </div>
      </div>

      {/* Wallet */}
      {!connected ? (
        <div className="glass-card p-6 text-center space-y-3">
          <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400">Connect your wallet to view your address on Basescan</p>
          <button onClick={connect} className="btn-primary px-6 py-2 rounded-xl text-sm">Connect Wallet</button>
        </div>
      ) : (
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <code className="text-sm text-white truncate flex-1">{address}</code>
          <a href={`https://sepolia.basescan.org/address/${address}`} target="_blank" rel="noreferrer"
            className="text-slate-500 hover:text-cyan-400 transition-colors flex-shrink-0">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Transactions */}
      {txRows.length > 0 ? (
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Transaction History</h2>
          <div className="space-y-2">
            {txRows.map(tx => (
              <div key={tx.hash} className="glass-card px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === "out" ? "bg-red-500/10" : "bg-green-500/10"}`}>
                  {tx.type === "out"
                    ? <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                    : <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{tx.label}</p>
                  <code className="text-xs text-slate-500">{tx.hash.slice(0, 14)}…</code>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span className={`text-xs font-medium tabular-nums ${tx.type === "out" ? "text-red-400" : "text-green-400"}`}>
                    {tx.type === "out" ? "−" : "+"}{tx.amount}
                  </span>
                  <a href={`https://sepolia.basescan.org/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                    className="text-slate-500 hover:text-cyan-400 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card p-10 text-center">
          <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No transactions yet.</p>
          <p className="text-slate-600 text-xs mt-1">Submit a task to see payments here.</p>
        </div>
      )}
    </div>
  );
}
