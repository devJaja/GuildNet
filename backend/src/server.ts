import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { runCoordinator } from "./coordinator";
import { runAgent, type Capability } from "./agentRunner";
import { buildProject } from "./builder";

const app = express();
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(",")
    : ["https://guild-net-plum.vercel.app", "http://localhost:3001", "http://localhost:3000"],
  methods: ["GET", "POST"],
}));
app.use(express.json());

const limiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", chain: config.chainId });
});

/**
 * POST /task
 * Full coordinator loop: discover all agents → hire → Venice AI → complete
 */
// In-memory store for design HTML (keyed by taskId)
const designStore = new Map<string, string>();

app.post("/task", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, budgetEth = "0.05", durationDays = 7, capabilities } = req.body as {
      description: string; budgetEth?: string; durationDays?: number;
      capabilities?: string[];
    };
    if (!description?.trim()) { res.status(400).json({ error: "description is required" }); return; }

    const result = await runCoordinator(description, budgetEth, durationDays, capabilities);

    // Store design HTML for preview endpoint
    if (result.design) designStore.set(result.taskId.toString(), result.design);

    res.json({
      taskId:       result.taskId.toString(),
      agentsHired:  result.agentsHired,
      txHashes:     result.txHashes,
      research:     result.research,
      riskAnalysis: result.riskAnalysis,
      coding:       result.coding,
      design:       result.design,
      audit:        result.audit,
      report:       result.report,
      previewUrl:   result.previewUrl,
    });
  } catch (err) { next(err); }
});

// Serve design HTML as a live preview page
app.get("/design-preview/:taskId", (req: Request, res: Response) => {
  const html = designStore.get(req.params.taskId);
  if (!html) { res.status(404).send("Design not found"); return; }
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
app.post("/agent/:capability/run", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capability = req.params.capability as Capability;
    const { taskId, description, context = "" } = req.body as {
      taskId: string; description: string; context?: string;
    };

    if (!["research","risk","report","coding","design","audit"].includes(capability)) {
      res.status(400).json({ error: `Unknown capability: ${capability}` }); return;
    }
    if (!taskId || !description?.trim()) {
      res.status(400).json({ error: "taskId and description are required" }); return;
    }

    const result = await runAgent(capability, BigInt(taskId), description, context);
    res.json({
      capability:     result.capability,
      agentAddress:   result.agentAddress,
      output:         result.output,
      subAgentsHired: result.subAgentsHired,
      txHashes:       result.txHashes,
    });
  } catch (err) { next(err); }
});

/**
 * POST /verify-endpoint
 * Probes an agent endpoint to confirm it's reachable and returns a valid response.
 */
app.post("/verify-endpoint", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body as { endpoint: string };
    if (!endpoint?.trim()) { res.status(400).json({ error: "endpoint is required" }); return; }

    // Must be a valid URL
    let url: URL;
    try { url = new URL(endpoint); } catch { res.status(400).json({ ok: false, reason: "Invalid URL" }); return; }
    if (!["http:", "https:"].includes(url.protocol)) {
      res.status(400).json({ ok: false, reason: "URL must be http or https" }); return;
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
        res.json({ ok: false, reason: `Endpoint returned HTTP ${probe.status}` }); return;
      }
      const text = await probe.text().catch(() => "");
      res.json({ ok: true, status: probe.status, preview: text.slice(0, 200) });
    } catch (e: unknown) {
      clearTimeout(timeout);
      const msg = (e as Error).message ?? "Connection failed";
      res.json({ ok: false, reason: msg.includes("abort") ? "Endpoint timed out (>10s)" : msg });
    }
  } catch (err) { next(err); }
});

/**
 * POST /suggest-agents
 * Deterministic routing — reads live capabilities from chain, matches to task keywords.
 */
app.post("/suggest-agents", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description = "" } = req.body as { description: string };
    const d = description.toLowerCase();

    // Fetch all registered capabilities from chain
    const { createPublicClient, http } = await import("viem");
    const registryAbi = [
      { name: "totalAgents", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
      { name: "agentList",   type: "function", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ type: "address" }] },
      { name: "agents",      type: "function", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "tuple", components: [{ name: "wallet", type: "address" }, { name: "endpoint", type: "string" }, { name: "capability", type: "string" }, { name: "pricePerTask", type: "uint256" }, { name: "active", type: "bool" }] }] },
    ] as const;
    const chainDef = { id: Number(config.chainId), name: "GuildNet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [config.rpcUrl] } } };
    const client = createPublicClient({ chain: chainDef, transport: http(config.rpcUrl) });

    let registeredCaps: string[] = [];
    try {
      const total = await client.readContract({ address: config.contracts.agentRegistry, abi: registryAbi, functionName: "totalAgents" }) as bigint;
      const addresses = await Promise.all(
        Array.from({ length: Number(total) }, (_, i) =>
          client.readContract({ address: config.contracts.agentRegistry, abi: registryAbi, functionName: "agentList", args: [BigInt(i)] }) as Promise<`0x${string}`>
        )
      );
      const agentData = await Promise.all(addresses.map(addr =>
        client.readContract({ address: config.contracts.agentRegistry, abi: registryAbi, functionName: "agents", args: [addr] }) as Promise<{ capability: string; active: boolean }>
      ));
      registeredCaps = [...new Set(agentData.filter(a => a.active).map(a => a.capability))];
    } catch { registeredCaps = ["research","risk","coding","design","audit","report"]; }

    // Core routing logic
    const hasCoding  = /\b(build|code|implement|write|create|develop|program|script|solidity|smart contract|dapp|app|cli|api|backend|frontend|website|web app|react|next|vue|angular|node|express)\b/.test(d);
    const hasDesign  = /\b(design|ui|ux|interface|layout|figma|wireframe|visual|landing page|dashboard|component|style|theme|css|tailwind)\b/.test(d);
    const hasBiz     = /\b(market|research|analysis|strategy|business|competitor|risk|report|study|survey|industry|trend|startup|investment|growth)\b/.test(d);
    const hasMixed   = hasCoding && hasBiz;

    let base: string[];
    if (hasMixed)        base = hasDesign ? ["research","coding","design","audit","report"] : ["research","coding","audit","report"];
    else if (hasCoding)  base = hasDesign ? ["coding","design","report"] : ["coding","report"];
    else if (hasDesign)  base = ["design","report"];
    else                 base = ["research","risk","audit","report"];

    // Add any registered custom capabilities that match keywords in the description
    const customCaps = registeredCaps.filter(cap =>
      !base.includes(cap) &&
      !["research","risk","coding","design","audit","report"].includes(cap) &&
      d.includes(cap.toLowerCase())
    );
    // Insert custom caps before "report"
    const reportIdx = base.indexOf("report");
    const capabilities = reportIdx >= 0
      ? [...base.slice(0, reportIdx), ...customCaps, ...base.slice(reportIdx)]
      : [...base, ...customCaps];

    // Only keep capabilities that have a registered agent
    const filtered = capabilities.filter(c => registeredCaps.includes(c));
    // Always ensure "report" is last if registered
    if (!filtered.includes("report") && registeredCaps.includes("report")) filtered.push("report");

    res.json({ capabilities: filtered.length > 0 ? filtered : base });
  } catch (err) { next(err); }
});

/**
 * POST /enhance
 * Refine a specific agent output with a follow-up prompt.
 */
app.post("/enhance", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { capability, originalOutput, feedback } = req.body as {
      capability: string; originalOutput: string; feedback: string;
    };
    if (!originalOutput?.trim() || !feedback?.trim()) {
      res.status(400).json({ error: "originalOutput and feedback are required" }); return;
    }
    const { veniceChat } = await import("./agents/venice.js");
    const SYSTEM = `You are a ${capability} specialist. You previously produced an output. The user wants it improved. Apply their feedback precisely and return the complete revised output — no explanations, just the improved content.`;
    const enhanced = await veniceChat(SYSTEM, `Original output:\n${originalOutput}\n\nUser feedback:\n${feedback}\n\nRevised output:`, "mistral-small-3-2-24b-instruct");
    res.json({ enhanced });
  } catch (err) { next(err); }
});

app.post("/build", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt?.trim()) { res.status(400).json({ error: "prompt is required" }); return; }
    const result = await buildProject(prompt);
    res.json({
      success:   result.success,
      outputDir: result.outputDir,
      previewUrl: result.previewUrl,
      plan:      result.plan,
      files:     result.files.map(f => ({ path: f.path, size: f.content.length })),
      buildLog:  result.buildLog.slice(-2000),
    });
  } catch (err) { next(err); }
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server error]", err.message);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`[GuildNet] Backend running on port ${config.port}`);
  console.log(`[GuildNet] Chain ID: ${config.chainId}`);
  console.log(`[GuildNet] TaskCoordinator: ${config.contracts.taskCoordinator}`);
});
