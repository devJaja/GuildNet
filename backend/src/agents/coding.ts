import { veniceChat } from "./venice.js";

const SYSTEM = `You are an expert software engineer. Write clean, well-commented, 
production-ready code. Include error handling, security considerations, and usage examples.`;

export async function runCoding(taskDescription: string, context = ""): Promise<string> {
  // Scope to smart contract architecture only to keep response fast
  const focused = `Smart contract architecture only (Solidity, concise): ${taskDescription}`;
  const prompt = context
    ? `Task: ${focused}\n\nContext:\n${context}\n\nWrite the core Solidity contracts (interfaces + key functions, no full implementation).`
    : `${focused}\n\nWrite the core Solidity contracts (interfaces + key functions, no full implementation).`;
  return veniceChat(SYSTEM, prompt, "mistral-small-3-2-24b-instruct");
}
