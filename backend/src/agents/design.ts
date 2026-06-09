import { veniceChat } from "./venice.js";

const SYSTEM = `You are a UI/UX design specialist. Produce detailed design specifications: 
component breakdowns, user flow descriptions, layout structure, color/typography guidance, 
and accessibility considerations.`;

export async function runDesign(taskDescription: string, context = ""): Promise<string> {
  const prompt = context
    ? `Task: ${taskDescription}\n\nContext:\n${context}\n\nProvide the design specification.`
    : taskDescription;
  return veniceChat(SYSTEM, prompt);
}
