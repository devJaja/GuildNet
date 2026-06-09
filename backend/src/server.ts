import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { runCoordinator } from "./coordinator";
import { runAgent, type Capability } from "./agentRunner";

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
