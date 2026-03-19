// Web3Auth v10 singleton setup for Sapphire Devnet.
// Provides social login and passkey authentication.
// Generates an Ethereum-compatible wallet address usable with Hedera EVM.

import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";

let web3authInstance: Web3Auth | null = null;

export function getWeb3Auth(): Web3Auth {
  if (web3authInstance) return web3authInstance;

  const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "VITE_WEB3AUTH_CLIENT_ID is not configured. Add it to your Replit secrets."
    );
  }

  web3authInstance = new Web3Auth({
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    chainConfig: {
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      chainId: "0x128",                            // Hedera Testnet (296 decimal)
      rpcTarget: "https://testnet.hashio.io/api",
      displayName: "Hedera Testnet",
      blockExplorerUrl: "https://hashscan.io/testnet",
      ticker: "HBAR",
      tickerName: "HBAR",
    },
    uiConfig: {
      appName: "MediLedger Nexus",
      theme: {
        primary: "#00FFA3",
      },
      mode: "dark",
      defaultLanguage: "en",
    },
  });

  return web3authInstance;
}

// Returns the connected EVM address (lowercase hex) or null if not connected
export async function getConnectedAddress(web3auth: Web3Auth): Promise<string | null> {
  if (!web3auth.provider) return null;
  try {
    const accounts = (await web3auth.provider.request({ method: "eth_accounts" })) as string[];
    return accounts?.[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}
