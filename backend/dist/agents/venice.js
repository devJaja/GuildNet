"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.veniceChat = veniceChat;
const axios_1 = __importDefault(require("axios"));
const config_js_1 = require("../config.js");
const venice = axios_1.default.create({
    baseURL: config_js_1.config.veniceBaseUrl,
    headers: {
        Authorization: `Bearer ${config_js_1.config.veniceApiKey}`,
        "Content-Type": "application/json",
    },
    timeout: 240_000,
});
async function veniceChat(systemPrompt, userMessage, model = "llama-3.3-70b") {
    const res = await venice.post("/chat/completions", {
        model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
    });
    return res.data.choices[0].message.content.trim();
}
