"use client";

import { Wallet, Copy, Check, ExternalLink } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";

export function WalletConnect() {
  const { connected, address, connecting, connect, copyAddress, copied } = useWallet();

  if (!connected) {
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-lg font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-60 glow-hover"
      >
        <Wallet className="w-4 h-4" />
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-medium text-zinc-300">{short}</span>
        <button onClick={copyAddress} className="text-zinc-500 hover:text-white transition-colors">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <a
        href={`https://basescan.org/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}
