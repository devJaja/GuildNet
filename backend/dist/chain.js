"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletClient = exports.publicClient = exports.account = exports.chain = void 0;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const config_1 = require("./config");
// Define the chain dynamically from env so this works on any EVM network
exports.chain = (0, viem_1.defineChain)({
    id: config_1.config.chainId,
    name: "GuildNet Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config_1.config.rpcUrl] } },
});
exports.account = (0, accounts_1.privateKeyToAccount)(config_1.config.coordinatorKey);
// Public client — read-only chain queries
exports.publicClient = (0, viem_1.createPublicClient)({
    chain: exports.chain,
    transport: (0, viem_1.http)(config_1.config.rpcUrl),
});
// Wallet client — signs and broadcasts transactions directly.
// To enable 1Shot gasless relay, replace the transport with:
//   http(`${config.oneshotBaseUrl}/relay`, { fetchOptions: { headers: { "x-api-key": config.oneshotApiKey } } })
exports.walletClient = (0, viem_1.createWalletClient)({
    account: exports.account,
    chain: exports.chain,
    transport: (0, viem_1.http)(config_1.config.rpcUrl),
});
