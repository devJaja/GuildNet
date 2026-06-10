"use client";

import { useState, useCallback } from "react";
import { CHAIN_ID } from "@/lib/constants";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

interface WalletState {
  connected: boolean;
  address: string;
  connecting: boolean;
  copied: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  copyAddress: () => void;
}

const CHAIN_HEX = `0x${CHAIN_ID.toString(16)}`;

export function useWallet(): WalletState {
  const [connected,  setConnected]  = useState(false);
  const [address,    setAddress]    = useState("");
  const [connecting, setConnecting] = useState(false);
  const [copied,     setCopied]     = useState(false);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask not detected. Please install MetaMask.");
      return;
    }
    setConnecting(true);
    try {
      // Switch / add Base Sepolia
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
      } catch {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_HEX,
            chainName: "Base Sepolia",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia.base.org"],
            blockExplorerUrls: ["https://sepolia.basescan.org"],
          }],
        });
      }
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      setAddress(accounts[0]);
      setConnected(true);
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => { setConnected(false); setAddress(""); }, []);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return { connected, address, connecting, copied, connect, disconnect, copyAddress };
}
