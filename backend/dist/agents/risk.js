"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRiskAnalysis = runRiskAnalysis;
const venice_js_1 = require("./venice.js");
const SYSTEM = `You are a risk analysis specialist. Identify key risks: regulatory, competitive, financial, and operational. Rate each High/Medium/Low and suggest mitigations. Be concise.`;
async function runRiskAnalysis(taskDescription, research) {
    // Truncate research to avoid token overflows
    const ctx = research.slice(0, 1500);
    return (0, venice_js_1.veniceChat)(SYSTEM, `Task: ${taskDescription}\n\nContext:\n${ctx}\n\nProvide a concise risk analysis.`, "mistral-small-3-2-24b-instruct");
}
