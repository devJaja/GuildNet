"use client";

import { useState, useCallback } from "react";

interface WalletState {
  connected: boolean;
  address: string;
  connecting: boolean;
  copied: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  copyAddress: () => void;
}

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
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      setAddress(accounts[0]);
      setConnected(true);
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress("");
  }, []);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return { connected, address, connecting, copied, connect, disconnect, copyAddress };
}
