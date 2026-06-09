import { veniceChat } from "./venice.js";

const SYSTEM = `You are an expert software engineer. Write clean, well-commented, 
production-ready code. Include error handling, security considerations, and usage examples.`;

export async function runCoding(taskDescription: string, context = ""): Promise<string> {
  const prompt = context
    ? `Task: ${taskDescription}\n\nContext:\n${context}\n\nWrite the code.`
    : taskDescription;
  return veniceChat(SYSTEM, prompt);
}
