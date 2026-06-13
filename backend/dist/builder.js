"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProject = buildProject;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const builder_js_1 = require("./agents/builder.js");
// Track running preview servers so we can reuse ports
const usedPorts = new Set();
let nextPort = 4000;
function getFreePort() {
    while (usedPorts.has(nextPort))
        nextPort++;
    usedPorts.add(nextPort);
    return nextPort++;
}
function writeFiles(outputDir, files) {
    for (const f of files) {
        const fullPath = (0, path_1.join)(outputDir, f.path);
        (0, fs_1.mkdirSync)((0, path_1.dirname)(fullPath), { recursive: true });
        (0, fs_1.writeFileSync)(fullPath, f.content, "utf8");
    }
}
function runCmd(cmd, cwd) {
    try {
        return (0, child_process_1.execSync)(cmd, { cwd, timeout: 120_000, encoding: "utf8", stdio: "pipe" });
    }
    catch (e) {
        return e.stdout ?? e.message;
    }
}
function startPreviewServer(outputDir, plan, port) {
    let startCmd;
    let args;
    if (plan.framework === "nextjs") {
        // Use dev mode — more forgiving for generated code, no prod build needed
        startCmd = "node_modules/.bin/next";
        args = ["dev", "-p", String(port)];
    }
    else if (plan.framework.startsWith("vite")) {
        startCmd = "node_modules/.bin/vite";
        args = ["--port", String(port), "--host"];
    }
    else {
        runCmd("npm install --save-dev serve", outputDir);
        startCmd = "node_modules/.bin/serve";
        args = ["-l", String(port), "dist"];
    }
    const child = (0, child_process_1.spawn)(startCmd, args, {
        cwd: outputDir,
        detached: true,
        stdio: "ignore",
        env: { ...process.env, PORT: String(port), NODE_ENV: "development" },
    });
    child.unref();
    console.log(`[Builder] Preview server started on port ${port} (pid ${child.pid})`);
}
async function buildProject(prompt, baseOutputDir = "/tmp/guildnet-builds") {
    const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const outputDir = (0, path_1.join)(baseOutputDir, `${slug}-${Date.now()}`);
    (0, fs_1.mkdirSync)(outputDir, { recursive: true });
    console.log("[Builder] Architecting...");
    const plan = await (0, builder_js_1.runArchitect)(prompt);
    console.log("[Builder] Coding...");
    let files = await (0, builder_js_1.runCoder)(prompt, plan);
    console.log("[Builder] Designing + Reviewing in parallel...");
    const [designed, reviewed] = await Promise.all([
        (0, builder_js_1.runDesigner)(prompt, files),
        (0, builder_js_1.runReviewer)(prompt, files),
    ]);
    const map = new Map(designed.map(f => [f.path, f]));
    for (const f of reviewed)
        map.set(f.path, f);
    files = Array.from(map.values());
    console.log(`[Builder] Writing ${files.length} files to ${outputDir}`);
    writeFiles(outputDir, files);
    console.log("[Builder] Installing dependencies...");
    const installLog = runCmd(plan.installCmd, outputDir);
    console.log("[Builder] Building...");
    const buildLog = runCmd(plan.buildCmd, outputDir);
    const success = !(/build failed|compilation failed/i.test(buildLog));
    // Start live preview server (local dev only — not available on cloud deployments)
    let previewUrl;
    if (success && process.env.NODE_ENV !== "production") {
        const port = getFreePort();
        startPreviewServer(outputDir, plan, port);
        await new Promise(r => setTimeout(r, 2000));
        previewUrl = `http://localhost:${port}`;
        console.log(`[Builder] Live preview: ${previewUrl}`);
    }
    console.log(`[Builder] Done — success=${success}`);
    return { prompt, plan, files, outputDir, buildLog: installLog + "\n" + buildLog, success, previewUrl };
}
