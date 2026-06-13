"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const coordinator_1 = require("./coordinator");
const agentRunner_1 = require("./agentRunner");
const builder_1 = require("./builder");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGIN ?? "*",
    methods: ["GET", "POST"],
}));
app.use(express_1.default.json());
const limiter = (0, express_rate_limit_1.default)({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });
// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({ status: "ok", chain: config_1.config.chainId });
});
/**
 * POST /task
 * Full coordinator loop: discover all agents → hire → Venice AI → complete
 */
// In-memory store for design HTML (keyed by taskId)
const designStore = new Map();
app.post("/task", limiter, async (req, res, next) => {
    try {
        const { description, budgetEth = "0.05", durationDays = 7, capabilities } = req.body;
        if (!description?.trim()) {
            res.status(400).json({ error: "description is required" });
            return;
        }
        const result = await (0, coordinator_1.runCoordinator)(description, budgetEth, durationDays, capabilities);
        // Store design HTML for preview endpoint
        if (result.design)
            designStore.set(result.taskId.toString(), result.design);
        res.json({
            taskId: result.taskId.toString(),
            agentsHired: result.agentsHired,
            txHashes: result.txHashes,
            research: result.research,
            riskAnalysis: result.riskAnalysis,
            coding: result.coding,
            design: result.design,
            audit: result.audit,
            report: result.report,
            previewUrl: result.previewUrl,
        });
    }
    catch (err) {
        next(err);
    }
});
// Serve design HTML as a live preview page
app.get("/design-preview/:taskId", (req, res) => {
    const html = designStore.get(req.params.taskId);
    if (!html) {
        res.status(404).send("Design not found");
        return;
    }
    // Ensure it's a complete HTML document
    const full = html.trim().startsWith("<!DOCTYPE") || html.trim().startsWith("<html")
        ? html
        : `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Design Preview</title></head><body>${html}</body></html>`;
    res.setHeader("Content-Type", "text/html");
    res.send(full);
});
/**
 * POST /agent/:capability/run
 * A2A route: run a specific agent directly. The agent can autonomously hire
 * sub-agents on-chain using its own wallet before performing Venice AI inference.
 *
 * Body: { taskId: string, description: string, context?: string }
 */
app.post("/agent/:capability/run", limiter, async (req, res, next) => {
    try {
        const capability = req.params.capability;
        const { taskId, description, context = "" } = req.body;
        if (!["research", "risk", "report", "coding", "design", "audit"].includes(capability)) {
            res.status(400).json({ error: `Unknown capability: ${capability}` });
            return;
        }
        if (!taskId || !description?.trim()) {
            res.status(400).json({ error: "taskId and description are required" });
            return;
        }
        const result = await (0, agentRunner_1.runAgent)(capability, BigInt(taskId), description, context);
        res.json({
            capability: result.capability,
            agentAddress: result.agentAddress,
            output: result.output,
            subAgentsHired: result.subAgentsHired,
            txHashes: result.txHashes,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /verify-endpoint
 * Probes an agent endpoint to confirm it's reachable and returns a valid response.
 */
app.post("/verify-endpoint", limiter, async (req, res, next) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint?.trim()) {
            res.status(400).json({ error: "endpoint is required" });
            return;
        }
        // Must be a valid URL
        let url;
        try {
            url = new URL(endpoint);
        }
        catch {
            res.status(400).json({ ok: false, reason: "Invalid URL" });
            return;
        }
        if (!["http:", "https:"].includes(url.protocol)) {
            res.status(400).json({ ok: false, reason: "URL must be http or https" });
            return;
        }
        // Probe with a minimal test task
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        try {
            const probe = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task: "ping", description: "GuildNet endpoint verification" }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!probe.ok) {
                res.json({ ok: false, reason: `Endpoint returned HTTP ${probe.status}` });
                return;
            }
            const text = await probe.text().catch(() => "");
            res.json({ ok: true, status: probe.status, preview: text.slice(0, 200) });
        }
        catch (e) {
            clearTimeout(timeout);
            const msg = e.message ?? "Connection failed";
            res.json({ ok: false, reason: msg.includes("abort") ? "Endpoint timed out (>10s)" : msg });
        }
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /suggest-agents
 * Deterministic routing — reads live capabilities from chain, matches to task keywords.
 */
app.post("/suggest-agents", limiter, async (req, res, next) => {
    try {
        const { description = "" } = req.body;
        const d = description.toLowerCase();
        // Fetch all registered capabilities from chain
        const { createPublicClient, http } = await Promise.resolve().then(() => __importStar(require("viem")));
        const registryAbi = [
            { name: "totalAgents", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
            { name: "agentList", type: "function", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ type: "address" }] },
            { name: "agents", type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "tuple", components: [{ name: "wallet", type: "address" }, { name: "endpoint", type: "string" }, { name: "capability", type: "string" }, { name: "pricePerTask", type: "uint256" }, { name: "active", type: "bool" }] }] },
        ];
        const chainDef = { id: Number(config_1.config.chainId), name: "GuildNet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [config_1.config.rpcUrl] } } };
        const client = createPublicClient({ chain: chainDef, transport: http(config_1.config.rpcUrl) });
        let registeredCaps = [];
        try {
            const total = await client.readContract({ address: config_1.config.contracts.agentRegistry, abi: registryAbi, functionName: "totalAgents" });
            const addresses = await Promise.all(Array.from({ length: Number(total) }, (_, i) => client.readContract({ address: config_1.config.contracts.agentRegistry, abi: registryAbi, functionName: "agentList", args: [BigInt(i)] })));
            const agentData = await Promise.all(addresses.map(addr => client.readContract({ address: config_1.config.contracts.agentRegistry, abi: registryAbi, functionName: "agents", args: [addr] })));
            registeredCaps = [...new Set(agentData.filter(a => a.active).map(a => a.capability))];
        }
        catch {
            registeredCaps = ["research", "risk", "coding", "design", "audit", "report"];
        }
        // Core routing logic
        const hasCoding = /\b(build|code|implement|write|create|develop|program|script|solidity|smart contract|dapp|app|cli|api|backend|frontend|website|web app|react|next|vue|angular|node|express)\b/.test(d);
        const hasDesign = /\b(design|ui|ux|interface|layout|figma|wireframe|visual|landing page|dashboard|component|style|theme|css|tailwind)\b/.test(d);
        const hasBiz = /\b(market|research|analysis|strategy|business|competitor|risk|report|study|survey|industry|trend|startup|investment|growth)\b/.test(d);
        const hasMixed = hasCoding && hasBiz;
        let base;
        if (hasMixed)
            base = hasDesign ? ["research", "coding", "design", "audit", "report"] : ["research", "coding", "audit", "report"];
        else if (hasCoding)
            base = hasDesign ? ["coding", "design", "report"] : ["coding", "report"];
        else if (hasDesign)
            base = ["design", "report"];
        else
            base = ["research", "risk", "audit", "report"];
        // Add any registered custom capabilities that match keywords in the description
        const customCaps = registeredCaps.filter(cap => !base.includes(cap) &&
            !["research", "risk", "coding", "design", "audit", "report"].includes(cap) &&
            d.includes(cap.toLowerCase()));
        // Insert custom caps before "report"
        const reportIdx = base.indexOf("report");
        const capabilities = reportIdx >= 0
            ? [...base.slice(0, reportIdx), ...customCaps, ...base.slice(reportIdx)]
            : [...base, ...customCaps];
        // Only keep capabilities that have a registered agent
        const filtered = capabilities.filter(c => registeredCaps.includes(c));
        // Always ensure "report" is last if registered
        if (!filtered.includes("report") && registeredCaps.includes("report"))
            filtered.push("report");
        res.json({ capabilities: filtered.length > 0 ? filtered : base });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /enhance
 * Refine a specific agent output with a follow-up prompt.
 */
app.post("/enhance", limiter, async (req, res, next) => {
    try {
        const { capability, originalOutput, feedback } = req.body;
        if (!originalOutput?.trim() || !feedback?.trim()) {
            res.status(400).json({ error: "originalOutput and feedback are required" });
            return;
        }
        const { veniceChat } = await Promise.resolve().then(() => __importStar(require("./agents/venice.js")));
        const SYSTEM = `You are a ${capability} specialist. You previously produced an output. The user wants it improved. Apply their feedback precisely and return the complete revised output — no explanations, just the improved content.`;
        const enhanced = await veniceChat(SYSTEM, `Original output:\n${originalOutput}\n\nUser feedback:\n${feedback}\n\nRevised output:`, "mistral-small-3-2-24b-instruct");
        res.json({ enhanced });
    }
    catch (err) {
        next(err);
    }
});
app.post("/build", limiter, async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt?.trim()) {
            res.status(400).json({ error: "prompt is required" });
            return;
        }
        const result = await (0, builder_1.buildProject)(prompt);
        res.json({
            success: result.success,
            outputDir: result.outputDir,
            previewUrl: result.previewUrl,
            plan: result.plan,
            files: result.files.map(f => ({ path: f.path, size: f.content.length })),
            buildLog: result.buildLog.slice(-2000),
        });
    }
    catch (err) {
        next(err);
    }
});
// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error("[Server error]", err.message);
    res.status(500).json({ error: err.message });
});
app.listen(config_1.config.port, () => {
    console.log(`[GuildNet] Backend running on port ${config_1.config.port}`);
    console.log(`[GuildNet] Chain ID: ${config_1.config.chainId}`);
    console.log(`[GuildNet] TaskCoordinator: ${config_1.config.contracts.taskCoordinator}`);
});
