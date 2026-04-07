// Hedera Identity Manager
//
// Strategy:
//   • First-time user → createOrLoadHederaIdentity() creates a Hedera account with
//     the hospital name as the on-chain memo, then persists everything to localStorage.
//   • Returning user → checkExistingIdentity() detects the stored record;
//     the AuthPage skips the registration form entirely.
//
// Identity key priority: verifierId (Web3Auth) › email › walletAddress › random UUID
// This ensures the same hospital always maps to the same key regardless of login method.

const LS_PREFIX = "mediledger_identity_";

export interface HederaIdentity {
  identityKey: string;
  email?: string;
  walletAddress?: string;
  accountId: string;
  did: string;
  hospitalName: string;
  createdAt: string;
  status: "New Identity" | "Existing Identity";
}

interface StoredIdentity {
  identityKey: string;
  email?: string;
  walletAddress?: string;
  accountId: string;
  did: string;
  hospitalName: string;
  createdAt: string;
}

function lsKey(identityKey: string) {
  return `${LS_PREFIX}${identityKey}`;
}

function deriveIdentityKey(
  user: { verifierId?: string; email?: string },
  walletAddress?: string | null
): string {
  return user.verifierId ?? user.email ?? walletAddress ?? crypto.randomUUID();
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

/**
 * Checks if the user already has a stored Hedera identity.
 * Call this immediately after Web3Auth login — before showing any form.
 *
 * Returns the stored identity (as HederaIdentity with "Existing Identity" status)
 * or null if this is a first-time user.
 */
export function checkExistingIdentity(
  user: { verifierId?: string; email?: string },
  walletAddress?: string | null
): HederaIdentity | null {
  const identityKey = deriveIdentityKey(user, walletAddress);
  const stored = loadStored(identityKey);
  if (!stored) return null;
  return { ...stored, status: "Existing Identity" };
}

/**
 * Creates a brand-new Hedera identity for a first-time hospital user.
 * Calls the backend to create a Hedera testnet account (operator pays all fees).
 *
 * @param user          Web3Auth user info { verifierId?, email? }
 * @param walletAddress EVM address from Web3Auth provider (may be null)
 * @param hospitalName  Name entered by the hospital — used as the on-chain memo
 */
export async function createNewHederaIdentity(
  user: { verifierId?: string; email?: string },
  walletAddress: string | null,
  hospitalName: string
): Promise<HederaIdentity> {
  const identityKey = deriveIdentityKey(user, walletAddress);

  // Safety check — don't create a duplicate if one already exists
  const existing = loadStored(identityKey);
  if (existing) {
    return { ...existing, status: "Existing Identity" };
  }

  // Ask the backend to create a Hedera account using the hospital name as the memo
  const res = await fetch("/api/hedera/create-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hospitalName }),
  });

  if (!res.ok) {
    const { error } = (await res.json()) as { error: string };
    throw new Error(error ?? "Failed to create Hedera account.");
  }

  const { accountId } = (await res.json()) as { accountId: string };
  const did = `did:hedera:testnet:${accountId}`;

  const toStore: StoredIdentity = {
    identityKey,
    email: user.email,
    walletAddress: walletAddress ?? undefined,
    accountId,
    did,
    hospitalName,
    createdAt: new Date().toISOString(),
  };

  saveStored(toStore);

  return { ...toStore, status: "New Identity" };
}
