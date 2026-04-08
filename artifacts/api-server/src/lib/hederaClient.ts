// Shared Hedera utility module.
// Both hedera.ts routes and aria.ts use this to build clients and manage topics.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  Client,
  TopicMessageSubmitTransaction,
  TopicCreateTransaction,
  TopicId,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";

// ── Key resolution ────────────────────────────────────────────────────────────

async function getAccountPublicKey(accountId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`
    );
    if (!res.ok) return null;
    const data = await res.json() as { key?: { key?: string } };
    return data?.key?.key ?? null;
  } catch {
    return null;
  }
}

export async function buildClient(
  accountId: string,
  privateKeyRaw: string
): Promise<{ client: Client; privateKey: PrivateKey }> {
  const expectedPublicKey = await getAccountPublicKey(accountId);

  const parsers: Array<() => PrivateKey> = [
    () => PrivateKey.fromStringECDSA(privateKeyRaw),
    () => PrivateKey.fromStringED25519(privateKeyRaw),
    () => PrivateKey.fromStringDer(privateKeyRaw),
  ];

  let matchedKey: PrivateKey | undefined;

  if (expectedPublicKey) {
    for (const parse of parsers) {
      try {
        const candidate = parse();
        if (candidate.publicKey.toStringRaw().toLowerCase() === expectedPublicKey.toLowerCase()) {
          matchedKey = candidate;
          break;
        }
      } catch { /* try next */ }
    }
    if (!matchedKey) {
      throw new Error(
        `Private key does not match account ${accountId}. ` +
        `Check VITE_HEDERA_PRIVATE_KEY and VITE_HEDERA_ACCOUNT_ID.`
      );
    }
  } else {
    for (const parse of parsers) {
      try { matchedKey = parse(); break; } catch { /* try next */ }
    }
    if (!matchedKey) throw new Error("Could not parse VITE_HEDERA_PRIVATE_KEY.");
  }

  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(accountId), matchedKey);
  return { client, privateKey: matchedKey };
}

// ── Topic management ─────────────────────────────────────────────────────────

interface TopicCacheOptions {
  cacheFile: string;
  envVar?: string;
  memo: string;
  logLabel: string;
}

const topicMemoryCache: Record<string, string> = {};

export async function ensureTopic(
  accountId: string,
  privateKeyRaw: string,
  opts: TopicCacheOptions
): Promise<string> {
  const { cacheFile, envVar, memo, logLabel } = opts;

  // Layer 1 — memory
  if (topicMemoryCache[cacheFile]) return topicMemoryCache[cacheFile];

  // Layer 2 — disk
  try {
    const cached = fs.readFileSync(cacheFile, "utf-8").trim();
    if (cached) {
      topicMemoryCache[cacheFile] = cached;
      console.log(`[hedera] ${logLabel} loaded from disk: ${cached}`);
      return cached;
    }
  } catch { /* file doesn't exist yet */ }

  // Layer 3 — env var
  if (envVar) {
    const envVal = process.env[envVar]?.trim();
    if (envVal) {
      topicMemoryCache[cacheFile] = envVal;
      console.log(`[hedera] ${logLabel} loaded from env: ${envVal}`);
      try { fs.writeFileSync(cacheFile, envVal, "utf-8"); } catch { /* ignore */ }
      return envVal;
    }
  }

  // Layer 4 — create new topic on Hedera
  let client: Client | null = null;
  try {
    const built = await buildClient(accountId, privateKeyRaw);
    client = built.client;
    const privateKey = built.privateKey;

    const tx = await new TopicCreateTransaction()
      .setTopicMemo(memo)
      .freezeWith(client);
    const signed = await tx.sign(privateKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    const newTopicId = receipt.topicId?.toString();

    if (!newTopicId) throw new Error(`${logLabel} creation returned no topicId.`);

    topicMemoryCache[cacheFile] = newTopicId;
    console.log(`[hedera] ${logLabel} created: ${newTopicId}`);
    try { fs.writeFileSync(cacheFile, newTopicId, "utf-8"); } catch { /* ignore */ }

    return newTopicId;
  } finally {
    client?.close();
  }
}

// ── Message submission ────────────────────────────────────────────────────────

export async function submitToTopic(
  accountId: string,
  privateKeyRaw: string,
  topicId: string,
  payload: string
): Promise<string> {
  let client: Client | null = null;
  try {
    const built = await buildClient(accountId, privateKeyRaw);
    client = built.client;
    const privateKey = built.privateKey;

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(payload)
      .freezeWith(client);

    const signed = await tx.sign(privateKey);
    const response = await signed.execute(client);
    return response.transactionId.toString();
  } finally {
    client?.close();
  }
}

// ── Hashing ───────────────────────────────────────────────────────────────────

export function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text, "utf-8").digest("hex");
}

// ── Credential helpers ────────────────────────────────────────────────────────

export function getHederaCreds(): { accountId: string; privateKeyRaw: string } {
  const accountId = process.env.VITE_HEDERA_ACCOUNT_ID?.trim();
  const privateKeyRaw = process.env.VITE_HEDERA_PRIVATE_KEY?.trim();
  if (!accountId || !privateKeyRaw) {
    throw new Error("VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY must be set.");
  }
  return { accountId, privateKeyRaw };
}

// ── Topic paths ───────────────────────────────────────────────────────────────

export const CONSENT_TOPIC_CACHE = path.join(process.cwd(), ".consent-topic-id");
export const ARIA_TOPIC_CACHE = path.join(process.cwd(), ".aria-topic-id");
