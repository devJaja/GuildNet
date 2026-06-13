"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAudit = runAudit;
const venice_js_1 = require("./venice.js");
const SYSTEM = `You are a quality auditor. Review the provided outputs for accuracy and completeness. Give a verdict (PASS/FAIL/NEEDS_REVISION) and list key findings. Be concise.`;
async function runAudit(taskDescription, outputs) {
    // Truncate each section to avoid token overflow
    const sections = Object.entries(outputs)
        .map(([k, v]) => `[${k.toUpperCase()}]\n${v.slice(0, 600)}`)
        .join("\n\n");
    return (0, venice_js_1.veniceChat)(SYSTEM, `Task: ${taskDescription}\n\n${sections}`, "mistral-small-3-2-24b-instruct");
}
