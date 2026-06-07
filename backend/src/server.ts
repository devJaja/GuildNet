import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { config } from "./config.js";
import { runCoordinator } from "./coordinator.js";

const app = express();
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

/** Health check */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", chain: config.chainId });
});

/**
 * POST /task
 * Body: { description: string, budgetEth?: string, durationDays?: number }
 * Runs the full coordinator loop: discover → hire → Venice AI → complete
 */
app.post("/task", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, budgetEth = "0.05", durationDays = 7 } = req.body as {
      description: string;
      budgetEth?: string;
      durationDays?: number;
    };

    if (!description?.trim()) {
      res.status(400).json({ error: "description is required" });
      return;
    }

    const result = await runCoordinator(description, budgetEth, durationDays);

    res.json({
      taskId:       result.taskId.toString(),
      agentsHired:  result.agentsHired,
      txHashes:     result.txHashes,
      research:     result.research,
      riskAnalysis: result.riskAnalysis,
      report:       result.report,
    });
  } catch (err) {
    next(err);
  }
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server error]", err.message);
  res.status(500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`[GuildNet] Backend running on port ${config.port}`);
  console.log(`[GuildNet] Chain ID: ${config.chainId}`);
  console.log(`[GuildNet] TaskCoordinator: ${config.contracts.taskCoordinator}`);
});
