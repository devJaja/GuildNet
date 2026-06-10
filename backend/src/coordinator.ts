import { parseEther, type Address } from "viem";
import { publicClient, walletClient, account, chain } from "./chain";
import { config, agentRegistryAbi, taskCoordinatorAbi } from "./config";
import { runResearch } from "./agents/research";
import { runRiskAnalysis } from "./agents/risk";
import { runReport } from "./agents/report";
import { runCoding } from "./agents/coding";
import { runDesign } from "./agents/design";
import { runAudit } from "./agents/audit";

export interface TaskResult {
  taskId: bigint;
  research?: string;
  riskAnalysis?: string;
  coding?: string;
  design?: string;
  audit?: string;
  report: string;
  agentsHired: Address[];
  txHashes: `0x${string}`[];
}

// ── On-chain helpers ──────────────────────────────────────────────────────────

async function findAgents(capability: string): Promise<Address[]> {
  return publicClient.readContract({
    address: config.contracts.agentRegistry,
    abi: agentRegistryAbi,
    functionName: "findByCapability",
    args: [capability],
  }) as Promise<Address[]>;
}

async function createTask(description: string, budgetEth: string, durationSecs: bigint): Promise<bigint> {
  const hash = await walletClient.writeContract({
    chain,
    account,
    address: config.contracts.taskCoordinator,
    abi: taskCoordinatorAbi,
    functionName: "createTask",
    args: [description, durationSecs],
    value: parseEther(budgetEth),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  // TaskCreated(uint256 indexed taskId, ...) — taskId is topics[1]
  const log = receipt.logs.find(l => l.topics.length >= 2);
  if (!log) throw new Error("TaskCreated log not found");
  return BigInt(log.topics[1]!);
}

async function hireAgent(taskId: bigint, agent: Address): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({ chain,
    account,
    address: config.contracts.taskCoordinator,
    abi: taskCoordinatorAbi,
    functionName: "hireAgent",
    args: [taskId, agent],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function completeTask(taskId: bigint): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({ chain,
    account,
    address: config.contracts.taskCoordinator,
    abi: taskCoordinatorAbi,
    functionName: "completeTask",
    args: [taskId],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ── Main orchestration loop ───────────────────────────────────────────────────

export async function runCoordinator(
  taskDescription: string,
  budgetEth = "0.05",
  durationDays = 7,
  capabilities: ("research" | "risk" | "coding" | "design" | "audit" | "report")[] = ["research", "risk", "audit", "report"]
): Promise<TaskResult> {
  const durationSecs = BigInt(durationDays * 24 * 60 * 60);
  const txHashes: `0x${string}`[] = [];
  const agentsHired: Address[] = [];
  const result: TaskResult = { taskId: 0n, report: "", agentsHired, txHashes };

  console.log(`[Coordinator] Creating task: "${taskDescription}"`);
  result.taskId = await createTask(taskDescription, budgetEth, durationSecs);
  console.log(`[Coordinator] Task created: id=${result.taskId}`);

  // Discover all needed agents up front
  const agentMap: Partial<Record<string, Address>> = {};
  await Promise.all(capabilities.map(async (cap) => {
    const found = await findAgents(cap);
    if (!found[0]) throw new Error(`No ${cap} agent registered`);
    agentMap[cap] = found[0];
  }));

  // ── research (parallel with hire tx) ────────────────────────────────────
  if (capabilities.includes("research")) {
    console.log(`[Coordinator] Hiring research agent: ${agentMap.research}`);
    const [tx, output] = await Promise.all([
      hireAgent(result.taskId, agentMap.research!),
      runResearch(taskDescription),
    ]);
    txHashes.push(tx); agentsHired.push(agentMap.research!);
    result.research = output;
    console.log("[Coordinator] Research complete");
  }

  // ── risk ─────────────────────────────────────────────────────────────────
  if (capabilities.includes("risk")) {
    console.log(`[Coordinator] Hiring risk agent: ${agentMap.risk}`);
    const [tx, output] = await Promise.all([
      hireAgent(result.taskId, agentMap.risk!),
      runRiskAnalysis(taskDescription, result.research ?? ""),
    ]);
    txHashes.push(tx); agentsHired.push(agentMap.risk!);
    result.riskAnalysis = output;
    console.log("[Coordinator] Risk analysis complete");
  }

  // ── coding ───────────────────────────────────────────────────────────────
  if (capabilities.includes("coding")) {
    console.log(`[Coordinator] Hiring coding agent: ${agentMap.coding}`);
    const [tx, output] = await Promise.all([
      hireAgent(result.taskId, agentMap.coding!),
      runCoding(taskDescription, result.research ?? taskDescription),
    ]);
    txHashes.push(tx); agentsHired.push(agentMap.coding!);
    result.coding = output;
    console.log("[Coordinator] Coding complete");
  }

  // ── design ───────────────────────────────────────────────────────────────
  if (capabilities.includes("design")) {
    console.log(`[Coordinator] Hiring design agent: ${agentMap.design}`);
    const [tx, output] = await Promise.all([
      hireAgent(result.taskId, agentMap.design!),
      runDesign(taskDescription, result.research ?? ""),
    ]);
    txHashes.push(tx); agentsHired.push(agentMap.design!);
    result.design = output;
    console.log("[Coordinator] Design complete");
  }

  // ── audit (runs after all content agents, before report) ─────────────────
  if (capabilities.includes("audit")) {
    console.log(`[Coordinator] Hiring audit agent: ${agentMap.audit}`);
    const outputs: Record<string, string> = {};
    if (result.research)    outputs.research    = result.research;
    if (result.riskAnalysis) outputs.risk        = result.riskAnalysis;
    if (result.coding)      outputs.coding      = result.coding;
    if (result.design)      outputs.design      = result.design;
    const [tx, output] = await Promise.all([
      hireAgent(result.taskId, agentMap.audit!),
      runAudit(taskDescription, outputs),
    ]);
    txHashes.push(tx); agentsHired.push(agentMap.audit!);
    result.audit = output;
    console.log("[Coordinator] Audit complete");
  }

  // ── report (always last — aggregates all prior outputs) ──────────────────
  if (capabilities.includes("report")) {
    console.log(`[Coordinator] Hiring report agent: ${agentMap.report}`);
    const [tx, output] = await Promise.all([
      hireAgent(result.taskId, agentMap.report!),
      runReport(
        taskDescription,
        result.research ?? "",
        result.riskAnalysis ?? "",
        result.audit,
      ),
    ]);
    txHashes.push(tx); agentsHired.push(agentMap.report!);
    result.report = output;
    console.log("[Coordinator] Report compiled");
  }

  const completeTx = await completeTask(result.taskId);
  txHashes.push(completeTx);
  console.log(`[Coordinator] Task ${result.taskId} completed`);

  return result;
}
