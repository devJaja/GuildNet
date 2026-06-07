import { veniceChat } from "./venice.js";

const SYSTEM = `You are a risk analysis specialist. Given a task description and 
research findings, identify key risks: regulatory, competitive, financial, and 
operational. Rate each risk (High/Medium/Low) and suggest mitigations.`;

export async function runRiskAnalysis(
  taskDescription: string,
  research: string
): Promise<string> {
  return veniceChat(
    SYSTEM,
    `Task: ${taskDescription}\n\nResearch findings:\n${research}\n\nProvide a structured risk analysis.`
  );
}
