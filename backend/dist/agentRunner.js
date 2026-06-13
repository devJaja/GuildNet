"use strict";
/**
 * Agent Runner — executes a specific agent capability and allows it to
 * autonomously hire sub-agents on-chain (Agent-to-Agent hiring).
 *
 * Each agent:
 *   1. Receives a task description
 *   2. Calls Venice AI for inference
 *   3. Can call hireAgent() on TaskCoordinator using its own wallet (A2A)
 *   4. Returns its output
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chain_1 = require("./chain");
const config_1 = require("./config");
const venice_1 = require("./agents/venice");
const SYSTEM_PROMPTS = {
    research: "You are a market research specialist. Produce concise, factual research: key players, market size, growth trends, and data points.",
    risk: "You are a risk analysis specialist. Identify key risks (regulatory, competitive, financial, operational). Rate each High/Medium/Low and suggest mitigations.",
    report: "You are an expert report writer. Compile a professional report with executive summary, key findings, risk overview, and recommendations.",
    coding: "You are an expert software engineer. Write clean, well-commented, production-ready code. Include error handling, security considerations, and usage examples.",
    design: "You are a UI/UX design specialist. Produce detailed design specifications, component breakdowns, user flow descriptions, and accessibility considerations.",
    audit: "You are a critical quality auditor. Review AI-generated outputs for accuracy, consistency, and completeness. Flag hallucinations, contradictions, and gaps. Return verdict (PASS/FAIL/NEEDS_REVISION) with specific findings.",
};
// Sub-agents a capability can hire — only valid when the coordinator hasn't already hired them.
// Keep empty by default; populate only for standalone A2A runs where the coordinator loop
// is NOT also hiring these sub-agents (to avoid AgentAlreadyPaid reverts).
const SUB_AGENTS = {
    coding: ["research"], // coding agent hires research — coordinator loop never hires research for coding tasks
};
async function findAgent(capability) {
    const agents = await chain_1.publicClient.readContract({
        address: config_1.config.contracts.agentRegistry,
        abi: config_1.agentRegistryAbi,
        functionName: "findByCapability",
        args: [capability],
    });
    if (!agents[0])
        throw new Error(`No active agent for capability: ${capability}`);
    return agents[0];
}
async function getAgentKey(agentAddress) {
    const mnemonic = process.env.AGENT_MNEMONIC;
    if (!mnemonic)
        throw new Error("AGENT_MNEMONIC not set");
    const { HDKey } = await Promise.resolve().then(() => __importStar(require("@scure/bip32")));
    const { mnemonicToSeedSync } = await Promise.resolve().then(() => __importStar(require("@scure/bip39")));
    const seed = mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    for (let i = 0; i < 10; i++) {
        const child = hdKey.derive(`m/44'/60'/0'/0/${i}`);
        const pk = `0x${Buffer.from(child.privateKey).toString("hex")}`;
        if ((0, accounts_1.privateKeyToAccount)(pk).address.toLowerCase() === agentAddress.toLowerCase())
            return pk;
    }
    throw new Error(`Could not derive key for agent ${agentAddress}`);
}
async function runAgent(capability, taskId, taskDescription, context = "") {
    const agentAddress = await findAgent(capability);
    const agentKey = await getAgentKey(agentAddress);
    const agentAccount = (0, accounts_1.privateKeyToAccount)(agentKey);
    const agentWallet = (0, viem_1.createWalletClient)({ account: agentAccount, chain: chain_1.chain, transport: (0, viem_1.http)(config_1.config.rpcUrl) });
    const subAgentsHired = [];
    const txHashes = [];
    let subContext = context;
    // ── A2A: hire sub-agents if this capability delegates work ──────────────────
    const subs = SUB_AGENTS[capability] ?? [];
    for (const subCap of subs) {
        const subAgent = await findAgent(subCap);
        // Agent hires the sub-agent on-chain using its own wallet (A2A payment)
        const hash = await agentWallet.writeContract({
            chain: chain_1.chain,
            account: agentAccount,
            address: config_1.config.contracts.taskCoordinator,
            abi: config_1.taskCoordinatorAbi,
            functionName: "hireAgent",
            args: [taskId, subAgent],
        });
        await chain_1.publicClient.waitForTransactionReceipt({ hash });
        txHashes.push(hash);
        subAgentsHired.push(subAgent);
        // Run sub-agent Venice AI inference for context
        const subResult = await runAgent(subCap, taskId, taskDescription);
        subContext += `\n\n[${subCap.toUpperCase()} AGENT OUTPUT]\n${subResult.output}`;
    }
    // ── Venice AI inference ────────────────────────────────────────────────────
    const prompt = context
        ? `Task: ${taskDescription}\n\nContext:\n${subContext}`
        : taskDescription;
    const output = await (0, venice_1.veniceChat)(SYSTEM_PROMPTS[capability], prompt);
    return { capability, agentAddress, output, subAgentsHired, txHashes };
}
