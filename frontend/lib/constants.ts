export const CONTRACTS = {
  AGENT_REGISTRY:    process.env.NEXT_PUBLIC_AGENT_REGISTRY    as `0x${string}`,
  GUILD_PERMISSIONS: process.env.NEXT_PUBLIC_GUILD_PERMISSIONS as `0x${string}`,
  TASK_COORDINATOR:  process.env.NEXT_PUBLIC_TASK_COORDINATOR  as `0x${string}`,
};

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);

export const BACKEND_URL = "/api";

export const CAPABILITIES = ["research", "risk", "coding", "design", "audit", "report"] as const;
export type Capability = typeof CAPABILITIES[number];
