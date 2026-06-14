"use client";

import { useState, useEffect } from "react";
import { createPublicClient, http, parseAbiItem } from "viem";
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

// AgentHired(uint256 indexed taskId, address indexed agent, uint256 amount)
const AGENT_HIRED_EVENT = parseAbiItem("event AgentHired(uint256 indexed taskId, address indexed agent, uint256 amount)");

export function useChainAgents() {
  const [agents,  setAgents]  = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("All");

  useEffect(() => {
    if (!CONTRACTS.AGENT_REGISTRY) { setLoading(false); return; }
    const client = createPublicClient({ chain, transport: http() });

    (async () => {
      try {
        // 1. Fetch all registered agents
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

        // 2. Fetch AgentHired events to build reputation (task count per agent)
        const reputation: Record<string, number> = {};
        try {
          const logs = await client.getLogs({
            address: CONTRACTS.TASK_COORDINATOR,
            event: AGENT_HIRED_EVENT,
            fromBlock: BigInt(0),
            toBlock: "latest",
          });
          for (const log of logs) {
            const agentAddr = (log.args.agent as string).toLowerCase();
            reputation[agentAddr] = (reputation[agentAddr] ?? 0) + 1;
          }
        } catch { /* reputation is optional — don't fail if logs unavailable */ }

        // 3. Build agent list with real task counts
        const result: Agent[] = raw
          .filter(a => a.active)
          .map((a, i) => {
            const addr = addresses[i].toLowerCase();
            const taskCount = reputation[addr] ?? 0;
            // Rating: starts at 4.5, improves with completions, max 5.0
            const rating = Math.min(5.0, 4.5 + taskCount * 0.01);
            return {
              name: `${a.capability.charAt(0).toUpperCase() + a.capability.slice(1)} Agent`,
              type: TYPE_MAP[a.capability] ?? "Research",
              description: `Autonomous ${a.capability} agent on GuildNet. ${taskCount > 0 ? `${taskCount} tasks completed.` : "Ready for hire."}`,
              price: Number(a.pricePerTask) / 1e18,
              rating: Math.round(rating * 10) / 10,
              tasks: taskCount,
              status: "online" as const,
              skills: SKILL_MAP[a.capability] ?? [],
            };
          });
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
