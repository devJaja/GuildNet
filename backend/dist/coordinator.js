"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCoordinator = runCoordinator;
const viem_1 = require("viem");
const chain_1 = require("./chain");
const config_1 = require("./config");
const venice_js_1 = require("./agents/venice.js");
const VENICE_HOST = "api.venice.ai";
/**
 * Run an agent by capability.
 * - If the registered endpoint is a Venice AI URL → use internal Venice client (fast, authenticated)
 * - If it's an external URL → POST the task to the developer's own agent endpoint
 */
async function callAgent(agentAddress, capability, taskDescription, context = "") {
    // Read the agent's endpoint from registry
    const agentData = await chain_1.publicClient.readContract({
        address: config_1.config.contracts.agentRegistry,
        abi: config_1.agentRegistryAbi,
        functionName: "agents",
        args: [agentAddress],
    });
    const endpoint = agentData.endpoint;
    const isVenice = endpoint.includes(VENICE_HOST) || !endpoint.startsWith("http");
    if (isVenice) {
        // Use internal Venice client — same as before
        const prompt = context ? `Task: ${taskDescription}\n\nContext:\n${context}` : taskDescription;
        const SYSTEM_MAP = {
            research: "You are a market research specialist. Produce concise, factual research: key players, market size, growth trends.",
            risk: "You are a risk analysis specialist. Identify key risks and rate each High/Medium/Low. Be concise.",
            coding: "You are a senior software engineer. Output ONLY complete, runnable code. No explanations.",
            design: "You are a UI/UX design specialist. Produce detailed design specifications.",
            audit: "You are a quality auditor. Review outputs for accuracy. Give a verdict (PASS/FAIL/NEEDS_REVISION).",
            report: "You are a deliverable compiler. Match output format to what was requested — code for code tasks, report for analysis tasks.",
        };
        return (0, venice_js_1.veniceChat)(SYSTEM_MAP[capability] ?? SYSTEM_MAP.research, prompt, "mistral-small-3-2-24b-instruct");
    }
    // External agent endpoint — POST the task and get the result
    console.log(`[Coordinator] Calling external agent at ${endpoint}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task: taskDescription, capability, context, source: "guildnet" }),
            signal: controller.signal,
        });
        if (!res.ok)
            throw new Error(`Agent endpoint returned HTTP ${res.status}`);
        const data = await res.json();
        // Accept any common response field name
        return data.result ?? data.output ?? data.response ?? data.text ?? await res.text();
    }
    finally {
        clearTimeout(timeout);
    }
}
// ── On-chain helpers ──────────────────────────────────────────────────────────
async function findAgents(capability) {
    return chain_1.publicClient.readContract({
        address: config_1.config.contracts.agentRegistry,
        abi: config_1.agentRegistryAbi,
        functionName: "findByCapability",
        args: [capability],
    });
}
async function createTask(description, budgetEth, durationSecs) {
    const hash = await chain_1.walletClient.writeContract({
        chain: chain_1.chain,
        account: chain_1.account,
        address: config_1.config.contracts.taskCoordinator,
        abi: config_1.taskCoordinatorAbi,
        functionName: "createTask",
        args: [description, durationSecs],
        value: (0, viem_1.parseEther)(budgetEth),
    });
    const receipt = await chain_1.publicClient.waitForTransactionReceipt({ hash });
    // TaskCreated(uint256 indexed taskId, ...) — taskId is topics[1]
    const log = receipt.logs.find(l => l.topics.length >= 2);
    if (!log)
        throw new Error("TaskCreated log not found");
    return BigInt(log.topics[1]);
}
async function hireAgent(taskId, agent) {
    const hash = await chain_1.walletClient.writeContract({ chain: chain_1.chain,
        account: chain_1.account,
        address: config_1.config.contracts.taskCoordinator,
        abi: config_1.taskCoordinatorAbi,
        functionName: "hireAgent",
        args: [taskId, agent],
    });
    await chain_1.publicClient.waitForTransactionReceipt({ hash });
    return hash;
}
async function completeTask(taskId) {
    const hash = await chain_1.walletClient.writeContract({ chain: chain_1.chain,
        account: chain_1.account,
        address: config_1.config.contracts.taskCoordinator,
        abi: config_1.taskCoordinatorAbi,
        functionName: "completeTask",
        args: [taskId],
    });
    await chain_1.publicClient.waitForTransactionReceipt({ hash });
    return hash;
}
// ── Main orchestration loop ───────────────────────────────────────────────────
async function runCoordinator(taskDescription, budgetEth = "0.05", durationDays = 7, capabilities = ["research", "risk", "audit", "report"]) {
    const durationSecs = BigInt(durationDays * 24 * 60 * 60);
    const txHashes = [];
    const agentsHired = [];
    const result = { taskId: 0n, report: "", agentsHired, txHashes };
    console.log(`[Coordinator] Creating task: "${taskDescription}"`);
    result.taskId = await createTask(taskDescription, budgetEth, durationSecs);
    console.log(`[Coordinator] Task created: id=${result.taskId}`);
    // Discover all needed agents up front (parallel)
    const agentMap = {};
    await Promise.all(capabilities.map(async (cap) => {
        const found = await findAgents(cap);
        if (!found[0])
            throw new Error(`No ${cap} agent registered`);
        agentMap[cap] = found[0];
    }));
    // ── Wave 1: all independent agents run in parallel (Venice), hired sequentially ──
    // "independent" = everything except risk (needs research), audit (needs all), report (last)
    const dependents = ["risk", "audit", "report"];
    const wave1 = capabilities.filter(c => !dependents.includes(c));
    if (wave1.length > 0) {
        console.log(`[Coordinator] Wave 1 (parallel): ${wave1.join(", ")}`);
        const veniceResults = await Promise.all(wave1.map(cap => callAgent(agentMap[cap], cap, taskDescription)));
        for (let i = 0; i < wave1.length; i++) {
            const cap = wave1[i];
            const tx = await hireAgent(result.taskId, agentMap[cap]);
            txHashes.push(tx);
            agentsHired.push(agentMap[cap]);
            // Store output — known caps in typed fields, custom caps stored in research slot or logged
            if (cap === "research")
                result.research = veniceResults[i];
            else if (cap === "coding")
                result.coding = veniceResults[i];
            else if (cap === "design")
                result.design = veniceResults[i];
            else {
                // Custom capability — append to research context so downstream agents can use it
                result.research = (result.research ?? "") + `\n\n[${cap.toUpperCase()} AGENT]\n${veniceResults[i]}`;
            }
        }
        console.log("[Coordinator] Wave 1 complete");
    }
    // ── Wave 2: risk (uses research context) ─────────────────────────────────
    if (capabilities.includes("risk")) {
        console.log("[Coordinator] Wave 2: risk");
        const [tx, output] = await Promise.all([
            hireAgent(result.taskId, agentMap.risk),
            callAgent(agentMap.risk, "risk", taskDescription, (result.research ?? "").slice(0, 1500)),
        ]);
        txHashes.push(tx);
        agentsHired.push(agentMap.risk);
        result.riskAnalysis = output;
        console.log("[Coordinator] Risk complete");
    }
    // ── Wave 3: audit ────────────────────────────────────────────────────────
    if (capabilities.includes("audit")) {
        console.log("[Coordinator] Wave 3: audit");
        const ctx = Object.entries({
            research: result.research, risk: result.riskAnalysis,
            coding: result.coding, design: result.design,
        }).filter(([, v]) => v).map(([k, v]) => `[${k}]\n${v.slice(0, 600)}`).join("\n\n");
        const [tx, output] = await Promise.all([
            hireAgent(result.taskId, agentMap.audit),
            callAgent(agentMap.audit, "audit", taskDescription, ctx),
        ]);
        txHashes.push(tx);
        agentsHired.push(agentMap.audit);
        result.audit = output;
        console.log("[Coordinator] Audit complete");
    }
    // ── Wave 4: report ───────────────────────────────────────────────────────
    if (capabilities.includes("report")) {
        console.log("[Coordinator] Wave 4: report");
        const ctx = [
            result.research?.slice(0, 1000),
            result.riskAnalysis?.slice(0, 800),
            result.audit?.slice(0, 500),
        ].filter(Boolean).join("\n\n");
        const [tx, output] = await Promise.all([
            hireAgent(result.taskId, agentMap.report),
            callAgent(agentMap.report, "report", taskDescription, ctx),
        ]);
        txHashes.push(tx);
        agentsHired.push(agentMap.report);
        result.report = output;
        console.log("[Coordinator] Report complete");
    }
    const completeTx = await completeTask(result.taskId);
    txHashes.push(completeTx);
    console.log(`[Coordinator] Task ${result.taskId} completed`);
    return result;
}
