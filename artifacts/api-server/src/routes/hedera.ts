// Backend route for Hedera HCS submission.
// We handle this server-side because gRPC (which Hedera uses) can't run
// directly in a browser — it requires Node.js native networking.

import { Router, type IRouter } from "express";
import {
  Client,
  TopicMessageSubmitTransaction,
  TopicId,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";

const router: IRouter = Router();

// Fetch the account's on-chain public key from the Mirror Node.
// We use this to pick the right key format by comparing derived public keys.
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

async function buildClient(accountId: string, privateKeyRaw: string): Promise<{ client: Client; privateKey: PrivateKey }> {
  // Get the account's known public key so we can verify which parsing method is correct
  const expectedPublicKey = await getAccountPublicKey(accountId);

  // All candidate parsing methods to try
  const parsers: Array<() => PrivateKey> = [
    () => PrivateKey.fromStringECDSA(privateKeyRaw),
    () => PrivateKey.fromStringED25519(privateKeyRaw),
    () => PrivateKey.fromStringDer(privateKeyRaw),
  ];

  let matchedKey: PrivateKey | undefined;

  if (expectedPublicKey) {
    // Try each parser and pick the one whose derived public key matches on-chain
    for (const parse of parsers) {
      try {
        const candidate = parse();
        const derivedPub = candidate.publicKey.toStringRaw();
        // Compare case-insensitively (both are hex)
        if (derivedPub.toLowerCase() === expectedPublicKey.toLowerCase()) {
          matchedKey = candidate;
          console.log(`[hedera] Matched key format: ${candidate.type}`);
          break;
        }
      } catch {
        // try next
      }
    }

    if (!matchedKey) {
      // None matched — the private key does not correspond to this account
      throw new Error(
        `The private key you provided does not match account ${accountId}. ` +
        `Please check your VITE_HEDERA_PRIVATE_KEY and VITE_HEDERA_ACCOUNT_ID are from the same account.`
      );
    }
  } else {
    // Couldn't fetch public key — fall back to trying in order
    for (const parse of parsers) {
      try {
        matchedKey = parse();
        break;
      } catch {
        // try next
      }
    }
    if (!matchedKey) {
      throw new Error("Could not parse VITE_HEDERA_PRIVATE_KEY.");
    }
  }

  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(accountId), matchedKey);
  return { client, privateKey: matchedKey };
}


router.post("/hedera/submit-hcs", async (req, res) => {
  const topicId = process.env.VITE_HEDERA_TOPIC_ID?.trim();
  const accountId = process.env.VITE_HEDERA_ACCOUNT_ID?.trim();
  const privateKeyRaw = process.env.VITE_HEDERA_PRIVATE_KEY?.trim();

  if (!topicId) {
    res.status(500).json({ error: "VITE_HEDERA_TOPIC_ID is not configured." });
    return;
  }
  if (!accountId || !privateKeyRaw) {
    res.status(500).json({ error: "VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY must be set." });
    return;
  }

  const { patientName, recordTitle, ipfsCid, timestamp } = req.body as {
    patientName?: string;
    recordTitle?: string;
    ipfsCid?: string;
    timestamp?: string;
  };

  if (!patientName || !recordTitle || !ipfsCid) {
    res.status(400).json({ error: "patientName, recordTitle and ipfsCid are required." });
    return;
  }

  let client: Client | null = null;
  try {
    const built = await buildClient(accountId, privateKeyRaw);
    client = built.client;
    const privateKey = built.privateKey;

    const payload = JSON.stringify({ patientName, recordTitle, ipfsCid, timestamp });

    // Freeze → explicitly sign with the matched key → execute
    // Explicit signing avoids any ambiguity with how the SDK uses the operator key
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(payload)
      .freezeWith(client);

    const signedTx = await tx.sign(privateKey);
    const txResponse = await signedTx.execute(client);

    const transactionId = txResponse.transactionId.toString();
    res.json({ transactionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  } finally {
    client?.close();
  }
});

export default router;
