import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { runCoordinator } from "./coordinator";
import { runAgent, type Capability } from "./agentRunner";
import { buildProject } from "./builder";

const app = express();
app.use(cors());
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
app.post("/task", limiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, budgetEth = "0.05", durationDays = 7, capabilities } = req.body as {
      description: string; budgetEth?: string; durationDays?: number;
      capabilities?: ("research" | "risk" | "coding" | "design" | "audit" | "report")[];
    };
    if (!description?.trim()) { res.status(400).json({ error: "description is required" }); return; }

    const result = await runCoordinator(description, budgetEth, durationDays, capabilities);
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
    });
  } catch (err) { next(err); }
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
 * Deterministic keyword-based pipeline selection — no Venice call, instant response.
 */
app.post("/suggest-agents", limiter, async (req: Request, res: Response) => {
  const { description = "" } = req.body as { description: string };
  const d = description.toLowerCase();

  const hasCoding  = /\b(build|code|implement|write|create|develop|program|script|solidity|smart contract|dapp|app|cli|api|backend|frontend|website|web app|react|next|vue|angular|node|express|fastapi|django|flask)\b/.test(d);
  const hasDesign  = /\b(design|ui|ux|interface|layout|figma|wireframe|mockup|visual|landing page|dashboard|component|style|theme|css|tailwind|dark mode)\b/.test(d);
  const hasBiz     = /\b(market|research|analysis|strategy|business|competitor|risk|report|study|survey|industry|trend|revenue|startup|investment|growth|audit)\b/.test(d);
  const hasCode    = hasCoding && !hasBiz;
  const hasMixed   = hasCoding && hasBiz;

  let capabilities: string[];

  if (hasMixed) {
    capabilities = hasDesign
      ? ["research", "coding", "design", "audit", "report"]
      : ["research", "coding", "audit", "report"];
  } else if (hasCode) {
    capabilities = hasDesign
      ? ["coding", "design", "report"]
      : ["coding", "report"];
  } else if (hasDesign) {
    capabilities = ["design", "report"];
  } else {
    // default: business/research task
    capabilities = ["research", "risk", "audit", "report"];
  }

  res.json({ capabilities });
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
