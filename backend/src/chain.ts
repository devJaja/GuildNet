import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "./config";

// Define the chain dynamically from env so this works on any EVM network
export const chain = defineChain({
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

// Wallet client — signs and broadcasts transactions directly.
// To enable 1Shot gasless relay, replace the transport with:
//   http(`${config.oneshotBaseUrl}/relay`, { fetchOptions: { headers: { "x-api-key": config.oneshotApiKey } } })
export const walletClient: WalletClient = createWalletClient({
  account,
  chain,
  transport: http(config.rpcUrl),
});
