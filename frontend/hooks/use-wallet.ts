"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useCallback } from "react";

interface WalletState {
  connected: boolean;
  address: string;
  connecting: boolean;
  copied: boolean;
  smartAccount: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  copyAddress: () => void;
}

export function useWallet(): WalletState {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [copied, setCopied] = useState(false);

  // Prefer smart wallet, fall back to embedded, then external
  const activeWallet =
    wallets.find(w => w.walletClientType === "privy" && w.connectorType === "embedded") ??
    wallets.find(w => w.walletClientType === "metamask") ??
    wallets[0];

  const address = activeWallet?.address ?? "";
  const connected = authenticated && !!address;
  const connecting = !ready;
  // Privy embedded wallets are smart accounts when smartWallets.enabled = true
  const smartAccount = activeWallet?.walletClientType === "privy";

  const connect = useCallback(async () => {
    if (!authenticated) login();
  }, [authenticated, login]);

  const disconnect = useCallback(() => { logout(); }, [logout]);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return { connected, address, connecting, copied, smartAccount, connect, disconnect, copyAddress };
}
