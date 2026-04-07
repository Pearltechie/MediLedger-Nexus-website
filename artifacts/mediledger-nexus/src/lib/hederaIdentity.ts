// Hedera Identity Manager — createOrLoadHederaIdentity
//
// Each hospital gets exactly ONE Hedera account and ONE DID, regardless of
// how they log in. Identity is keyed by: verifierId > email > walletAddress.
// State is persisted to localStorage — no backend DB required.

const LS_PREFIX = "mediledger_identity_";

export interface HederaIdentity {
  identityKey: string;
  email?: string;
  walletAddress?: string;
  accountId: string;
  did: string;
  status: "New Identity" | "Existing Identity";
}

interface StoredIdentity {
  identityKey: string;
  email?: string;
  walletAddress?: string;
  accountId: string;
  did: string;
}

function lsKey(identityKey: string) {
  return `${LS_PREFIX}${identityKey}`;
}

function loadStored(identityKey: string): StoredIdentity | null {
  try {
    const raw = localStorage.getItem(lsKey(identityKey));
    if (!raw) return null;
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}

function saveStored(data: StoredIdentity): void {
  localStorage.setItem(lsKey(data.identityKey), JSON.stringify(data));
}

// Calls the backend to create a new Hedera testnet account.
// Backend operator pays all fees — fully gasless for the user.
async function createHederaAccount(): Promise<string> {
  const res = await fetch("/api/hedera/create-account", { method: "POST" });
  if (!res.ok) {
    const { error } = await res.json() as { error: string };
    throw new Error(error ?? "Failed to create Hedera account.");
  }
  const { accountId } = await res.json() as { accountId: string };
  return accountId;
}

/**
 * Creates or loads a Hedera identity for a hospital.
 * Safe to call on every login — will never create duplicates.
 *
 * @param user   Web3Auth user info { verifierId?, email? }
 * @param walletAddress  EVM address from Web3Auth provider (may be null)
 */
export async function createOrLoadHederaIdentity(
  user: { verifierId?: string; email?: string },
  walletAddress?: string | null
): Promise<HederaIdentity> {
  // Derive stable identity key (priority: verifierId > email > walletAddress)
  const identityKey = user.verifierId ?? user.email ?? walletAddress ?? crypto.randomUUID();

  // Check localStorage for an existing identity
  const existing = loadStored(identityKey);
  if (existing) {
    return {
      ...existing,
      status: "Existing Identity",
    };
  }

  // New user — create a Hedera account
  const accountId = await createHederaAccount();
  const did = `did:hedera:testnet:${accountId}`;

  const toStore: StoredIdentity = {
    identityKey,
    email: user.email,
    walletAddress: walletAddress ?? undefined,
    accountId,
    did,
  };

  saveStored(toStore);

  return {
    ...toStore,
    status: "New Identity",
  };
}
