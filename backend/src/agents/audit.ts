import { veniceChat } from "./venice.js";

const SYSTEM = `You are a critical quality auditor for AI-generated outputs. 
Review the provided agent outputs for accuracy, consistency, completeness, and logical soundness. 
Flag hallucinations, contradictions, gaps, or unsupported claims. 
Provide a structured audit report: overall verdict (PASS/FAIL/NEEDS_REVISION), 
per-section findings, and specific corrections where needed.`;

export async function runAudit(taskDescription: string, outputs: Record<string, string>): Promise<string> {
  const sections = Object.entries(outputs)
    .map(([k, v]) => `[${k.toUpperCase()}]\n${v}`)
    .join("\n\n");
  return veniceChat(SYSTEM, `Task: ${taskDescription}\n\nOutputs to audit:\n\n${sections}`);
}
