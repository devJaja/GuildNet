import { parseEther, type Address } from "viem";
import { publicClient, walletClient, account } from "./chain.js";
import { config, agentRegistryAbi, taskCoordinatorAbi } from "./config.js";
import { runResearch } from "./agents/research.js";
import { runRiskAnalysis } from "./agents/risk.js";
import { runReport } from "./agents/report.js";

export interface TaskResult {
  taskId: bigint;
  research: string;
  riskAnalysis: string;
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
    account,
    address: config.contracts.taskCoordinator,
    abi: taskCoordinatorAbi,
    functionName: "createTask",
    args: [description, durationSecs],
    value: parseEther(budgetEth),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  // taskId is returned as the first log topic from TaskCreated event
  // Parse it from the logs: topic[1] = taskId (indexed)
  const taskCreatedLog = receipt.logs[0];
  return BigInt(taskCreatedLog.topics[1] ?? "0x0");
}

async function hireAgent(taskId: bigint, agent: Address): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
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
  const hash = await walletClient.writeContract({
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
  durationDays = 7
): Promise<TaskResult> {
  const durationSecs = BigInt(durationDays * 24 * 60 * 60);
  const txHashes: `0x${string}`[] = [];
  const agentsHired: Address[] = [];

  console.log(`[Coordinator] Creating task: "${taskDescription}"`);
  const taskId = await createTask(taskDescription, budgetEth, durationSecs);
  console.log(`[Coordinator] Task created: id=${taskId}`);

  // ── Step 1: Research ───────────────────────────────────────────────────────
  const [researchAgents, riskAgents, reportAgents] = await Promise.all([
    findAgents("research"),
    findAgents("risk"),
    findAgents("report"),
  ]);

  if (!researchAgents[0]) throw new Error("No research agent registered");
  if (!riskAgents[0])     throw new Error("No risk agent registered");
  if (!reportAgents[0])   throw new Error("No report agent registered");

  // Hire research agent + run Venice AI in parallel
  console.log(`[Coordinator] Hiring research agent: ${researchAgents[0]}`);
  const [researchTx, research] = await Promise.all([
    hireAgent(taskId, researchAgents[0]),
    runResearch(taskDescription),
  ]);
  txHashes.push(researchTx);
  agentsHired.push(researchAgents[0]);
  console.log("[Coordinator] Research complete");

  // ── Step 2: Risk analysis ─────────────────────────────────────────────────
  console.log(`[Coordinator] Hiring risk agent: ${riskAgents[0]}`);
  const [riskTx, riskAnalysis] = await Promise.all([
    hireAgent(taskId, riskAgents[0]),
    runRiskAnalysis(taskDescription, research),
  ]);
  txHashes.push(riskTx);
  agentsHired.push(riskAgents[0]);
  console.log("[Coordinator] Risk analysis complete");

  // ── Step 3: Final report ──────────────────────────────────────────────────
  console.log(`[Coordinator] Hiring report agent: ${reportAgents[0]}`);
  const [reportTx, report] = await Promise.all([
    hireAgent(taskId, reportAgents[0]),
    runReport(taskDescription, research, riskAnalysis),
  ]);
  txHashes.push(reportTx);
  agentsHired.push(reportAgents[0]);
  console.log("[Coordinator] Report compiled");

  // ── Complete task — revokes permission, refunds unspent ETH ──────────────
  const completeTx = await completeTask(taskId);
  txHashes.push(completeTx);
  console.log(`[Coordinator] Task ${taskId} completed`);

  return { taskId, research, riskAnalysis, report, agentsHired, txHashes };
}
