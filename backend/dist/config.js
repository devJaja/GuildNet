"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskCoordinatorAbi = exports.agentRegistryAbi = exports.config = void 0;
require("dotenv/config");
function required(key) {
    const val = process.env[key];
    if (!val)
        throw new Error(`Missing env var: ${key}`);
    return val;
}
exports.config = {
    rpcUrl: required("RPC_URL"),
    chainId: Number(required("CHAIN_ID")),
    coordinatorKey: required("COORDINATOR_PRIVATE_KEY"),
    veniceApiKey: required("VENICE_API_KEY"),
    veniceBaseUrl: process.env.VENICE_BASE_URL ?? "https://api.venice.ai/api/v1",
    oneshotApiKey: required("ONESHOT_API_KEY"),
    oneshotBaseUrl: process.env.ONESHOT_BASE_URL ?? "https://api.1shot.link/v1",
    port: Number(process.env.PORT ?? 3000),
    contracts: {
        agentRegistry: required("AGENT_REGISTRY_ADDRESS"),
        guildPermissions: required("GUILD_PERMISSIONS_ADDRESS"),
        taskCoordinator: required("TASK_COORDINATOR_ADDRESS"),
    },
};
// ── Minimal ABIs (only functions the backend calls) ───────────────────────────
exports.agentRegistryAbi = [
    {
        name: "findByCapability",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "capability", type: "string" }],
        outputs: [{ name: "", type: "address[]" }],
    },
    {
        name: "agents",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "a", type: "address" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "wallet", type: "address" },
                    { name: "endpoint", type: "string" },
                    { name: "capability", type: "string" },
                    { name: "pricePerTask", type: "uint256" },
                    { name: "active", type: "bool" },
                ],
            },
        ],
    },
];
exports.taskCoordinatorAbi = [
    {
        name: "createTask",
        type: "function",
        stateMutability: "payable",
        inputs: [
            { name: "description", type: "string" },
            { name: "duration", type: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "hireAgent",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "taskId", type: "uint256" },
            { name: "agent", type: "address" },
        ],
        outputs: [],
    },
    {
        name: "completeTask",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "taskId", type: "uint256" }],
        outputs: [],
    },
    {
        name: "getAssignedAgents",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "taskId", type: "uint256" }],
        outputs: [{ name: "", type: "address[]" }],
    },
];
