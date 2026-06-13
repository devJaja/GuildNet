"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runResearch = runResearch;
const venice_js_1 = require("./venice.js");
const SYSTEM = `You are a market research specialist. Given a task description, 
produce concise, factual market research: key players, market size, growth trends, 
and relevant data points. Be precise and structured.`;
async function runResearch(taskDescription) {
    return (0, venice_js_1.veniceChat)(SYSTEM, `Research this topic thoroughly:\n\n${taskDescription}`);
}
