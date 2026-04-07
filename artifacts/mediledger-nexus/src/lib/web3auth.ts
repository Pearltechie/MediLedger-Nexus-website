// Web3Auth v10 singleton — Sapphire Devnet.
// v10 no longer accepts chainConfig at the top level; chain is handled by connectors.
// We only need the user's verifierId / email from getUserInfo() for identity purposes.

import { Web3Auth } from "@web3auth/modal";
import { WEB3AUTH_NETWORK } from "@web3auth/base";

let web3authInstance: Web3Auth | null = null;

export function getWeb3Auth(): Web3Auth {
  if (web3authInstance) return web3authInstance;

  const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "VITE_WEB3AUTH_CLIENT_ID is not configured. Add it in Replit Secrets."
    );
  }

  // v10 API: chainConfig is removed from the root options.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  web3authInstance = new Web3Auth({
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    uiConfig: {
      appName: "MediLedger Nexus",
      theme: { primary: "#00FFA3" },
      mode: "dark",
      defaultLanguage: "en",
    },
  } as ConstructorParameters<typeof Web3Auth>[0]);

  return web3authInstance;
}

export interface Web3AuthUser {
  verifierId?: string;
  email?: string;
  name?: string;
}

// Returns user info after a successful connect
export async function getWeb3AuthUser(web3auth: Web3Auth): Promise<Web3AuthUser> {
  try {
    // getUserInfo() returns Partial<AuthUserInfo>; cast to access verifierId which exists at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = await web3auth.getUserInfo() as any;
    return {
      verifierId: info?.verifierId ?? undefined,
      email: info?.email ?? undefined,
      name: info?.name ?? undefined,
    };
  } catch {
    return {};
  }
}

// Returns connected EVM address (may be null in v10 without chainConfig)
export async function getConnectedAddress(web3auth: Web3Auth): Promise<string | null> {
  if (!web3auth.provider) return null;
  try {
    const accounts = (await web3auth.provider.request({ method: "eth_accounts" })) as string[];
    return accounts?.[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}
