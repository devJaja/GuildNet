import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config.js";

// Define the chain dynamically from env so this works on any EVM network
const chain = defineChain({
  id: config.chainId,
  name: "GuildNet Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
});

export const account = privateKeyToAccount(config.coordinatorKey);

// Public client — read-only chain queries
export const publicClient: PublicClient = createPublicClient({
  chain,
  transport: http(config.rpcUrl),
});

// Wallet client — submits transactions through the 1Shot relay
// 1Shot accepts standard JSON-RPC requests at its relay endpoint;
// we point the transport at the 1Shot URL and pass our API key as a header.
export const walletClient: WalletClient = createWalletClient({
  account,
  chain,
  transport: http(`${config.oneshotBaseUrl}/relay`, {
    fetchOptions: {
      headers: {
        "x-api-key": config.oneshotApiKey,
        "Content-Type": "application/json",
      },
    },
  }),
});
