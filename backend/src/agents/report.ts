import { veniceChat } from "./venice.js";

const SYSTEM = `You are an expert report writer. Given a task description, 
research findings, and risk analysis, compile a professional, well-structured 
report with an executive summary, key findings, risk overview, and recommendations.`;

export async function runReport(
  taskDescription: string,
  research: string,
  riskAnalysis: string
): Promise<string> {
  return veniceChat(
    SYSTEM,
    `Task: ${taskDescription}\n\nResearch:\n${research}\n\nRisk Analysis:\n${riskAnalysis}\n\nWrite the final report.`
  );
}
