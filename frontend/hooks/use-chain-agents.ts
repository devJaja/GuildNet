"use client";

import { useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { CONTRACTS, CHAIN_ID } from "@/lib/constants";
import type { Agent } from "@/components/agents/agent-card";

const chain = {
  id: CHAIN_ID,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
} as const;

const REGISTRY_ABI = [
  { name: "totalAgents", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "agentList",   type: "function", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ type: "address" }] },
  {
    name: "agents", type: "function", stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "wallet",       type: "address" },
      { name: "endpoint",     type: "string"  },
      { name: "capability",   type: "string"  },
      { name: "pricePerTask", type: "uint256" },
      { name: "active",       type: "bool"    },
    ]}],
  },
] as const;

const TYPE_MAP: Record<string, string> = {
  research: "Research", risk: "Risk", coding: "Coding",
  design: "Design", report: "Report", audit: "Risk",
};

const SKILL_MAP: Record<string, string[]> = {
  research: ["Web Scraping","Data Analysis","Market Research"],
  risk:     ["Risk Assessment","Compliance","Due Diligence"],
  coding:   ["Solidity","Python","React","Smart Contracts"],
  design:   ["UI/UX","Branding","Figma","Motion Graphics"],
  report:   ["Report Writing","Data Visualisation","Summaries"],
  audit:    ["QA","Fact-checking","Security","Gas Optimisation"],
};

export function useChainAgents() {
  const [agents,  setAgents]  = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("All");

  useEffect(() => {
    if (!CONTRACTS.AGENT_REGISTRY) { setLoading(false); return; }
    const client = createPublicClient({ chain, transport: http() });

    (async () => {
      try {
        const total = await client.readContract({ address: CONTRACTS.AGENT_REGISTRY, abi: REGISTRY_ABI, functionName: "totalAgents" }) as bigint;
        const addresses = await Promise.all(
          Array.from({ length: Number(total) }, (_, i) =>
            client.readContract({ address: CONTRACTS.AGENT_REGISTRY, abi: REGISTRY_ABI, functionName: "agentList", args: [BigInt(i)] }) as Promise<`0x${string}`>
          )
        );
        const raw = await Promise.all(
          addresses.map(addr =>
            client.readContract({ address: CONTRACTS.AGENT_REGISTRY, abi: REGISTRY_ABI, functionName: "agents", args: [addr] }) as Promise<{ capability: string; pricePerTask: bigint; active: boolean }>
          )
        );
        const result: Agent[] = raw
          .filter(a => a.active)
          .map((a, i) => ({
            name: `${a.capability.charAt(0).toUpperCase() + a.capability.slice(1)} Agent`,
            type: TYPE_MAP[a.capability] ?? "Research",
            description: `Autonomous ${a.capability} agent on GuildNet. Address: ${addresses[i].slice(0,10)}…`,
            price: Number(a.pricePerTask) / 1e18,
            rating: 4.8,
            tasks: 0,
            status: "online" as const,
            skills: SKILL_MAP[a.capability] ?? [],
          }));
        setAgents(result);
      } catch (e) {
        console.error("Failed to load on-chain agents", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === "All" ? agents : agents.filter(a => a.type === filter);
  return { agents: filtered, loading, filter, setFilter };
}
