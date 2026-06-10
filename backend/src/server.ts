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
 * POST /suggest-agents
 * Given a task description, returns the optimal capability pipeline.
 */
app.post("/suggest-agents", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description } = req.body as { description: string };
    if (!description?.trim()) { res.status(400).json({ error: "description is required" }); return; }

    const { veniceChat } = await import("./agents/venice.js");
    const SYSTEM = `You are a task router. Given a task description, return ONLY a JSON array of capability strings needed, in execution order.

Available: ["research","risk","coding","design","audit","report"]

Rules:
- For CODE tasks (build, create, implement, write code, smart contract, script, CLI, app): return ["coding","report"] — do NOT add research/risk/audit unless explicitly asked
- For BUSINESS/STRATEGY tasks: ["research","risk","audit","report"]
- For DESIGN tasks: ["design","report"]
- For MIXED tasks (e.g. dApp with market research): ["research","coding","design","report"]
- Always end with "report"
- Output ONLY the JSON array, nothing else

Examples:
"write a solidity ERC-20 token" → ["coding","report"]
"build a React dashboard" → ["coding","design","report"]
"market analysis for AI startups" → ["research","risk","audit","report"]
"create a Web3 NFT marketplace dApp" → ["research","coding","design","report"]`;
    const raw = await veniceChat(SYSTEM, description, "mistral-small-3-2-24b-instruct");
    const cleaned = raw.replace(/```[a-z]*\n?/g, "").replace(/```/g, "").trim();
    const capabilities = JSON.parse(cleaned) as string[];
    res.json({ capabilities });
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
      plan:      result.plan,
      files:     result.files.map(f => ({ path: f.path, size: f.content.length })),
      buildLog:  result.buildLog.slice(-2000), // last 2000 chars
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
