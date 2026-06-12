import { veniceChat } from "./venice.js";

const SYSTEM = `You are a senior UI/UX designer and frontend engineer. Given a product description, output a SINGLE complete HTML file that visually demonstrates the UI design — like a Figma mockup made real.

Rules:
- Output ONLY the HTML file content. No explanation. No markdown fences.
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Include ALL pages/screens as separate sections with a nav to switch between them
- Make it pixel-perfect and visually stunning: dark theme, gradients, glassmorphism, proper typography
- Every button, form, input, card must be present and styled — exactly as a real product looks
- Add micro-interactions with vanilla JS (hover effects, form validation, tab switching, modal opens)
- Include realistic placeholder content (product names, prices, user names, etc.)
- The output should look like a real deployed product, not a mockup
- Use Inter or system font, proper spacing, shadows, rounded corners
- Do NOT use any external images — use colored divs, SVG icons, or emoji as placeholders`;

export async function runDesign(taskDescription: string, context = ""): Promise<string> {
  const prompt = context
    ? `Design this product: ${taskDescription}\n\nContext:\n${context.slice(0, 800)}`
    : `Design this product: ${taskDescription}`;
  return veniceChat(SYSTEM, prompt, "mistral-small-3-2-24b-instruct");
}
