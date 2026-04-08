// Backend route for Hedera HCS submission.
// We handle this server-side because gRPC (which Hedera uses) can't run
// directly in a browser — it requires Node.js native networking.

import { Router, type IRouter } from "express";
import {
  Client,
  TopicMessageSubmitTransaction,
  TopicCreateTransaction,
  TopicId,
  AccountId,
  PrivateKey,
  AccountCreateTransaction,
  Hbar,
} from "@hashgraph/sdk";

const router: IRouter = Router();

// Cached consent topic ID — created once per server lifetime, reused for all
// consent events (REQUEST / APPROVE / DENY / REVOKE).
let consentTopicId: string | null = null;

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
        const derivedPub = candidate.publicKey.toStringRaw();
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
      throw new Error(
        `The private key you provided does not match account ${accountId}. ` +
        `Please check your VITE_HEDERA_PRIVATE_KEY and VITE_HEDERA_ACCOUNT_ID are from the same account.`
      );
    }
  } else {
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

// Creates a new HCS topic and caches its ID for subsequent consent submissions.
async function ensureConsentTopic(accountId: string, privateKeyRaw: string): Promise<string> {
  if (consentTopicId) return consentTopicId;

  let client: Client | null = null;
  try {
    const built = await buildClient(accountId, privateKeyRaw);
    client = built.client;
    const privateKey = built.privateKey;

    const tx = await new TopicCreateTransaction()
      .setTopicMemo("MediLedger Nexus — Consent Ledger")
      .freezeWith(client);

    const signed = await tx.sign(privateKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    const newTopicId = receipt.topicId?.toString();

    if (!newTopicId) throw new Error("Topic creation returned no topicId.");

    consentTopicId = newTopicId;
    console.log(`[hedera] Created consent topic: ${consentTopicId}`);
    return consentTopicId;
  } finally {
    client?.close();
  }
}

// GET /hedera/consent-topic
// Returns the current consent topic ID, creating one on Hedera if it doesn't
// exist yet. The frontend calls this once when the Consult page mounts.
router.get("/hedera/consent-topic", async (req, res) => {
  const accountId = process.env.VITE_HEDERA_ACCOUNT_ID?.trim();
  const privateKeyRaw = process.env.VITE_HEDERA_PRIVATE_KEY?.trim();

  if (!accountId || !privateKeyRaw) {
    res.status(500).json({ error: "VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY must be set." });
    return;
  }

  try {
    const topicId = await ensureConsentTopic(accountId, privateKeyRaw);
    res.json({ topicId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// POST /hedera/submit-hcs
// Submits a medical record anchor to the configurable records topic.
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

  const { patientName, recordTitle, ipfsCid, timestamp, ivHex, encrypted } = req.body as {
    patientName?: string;
    recordTitle?: string;
    ipfsCid?: string;
    timestamp?: string;
    ivHex?: string;
    encrypted?: boolean;
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

    const payload = JSON.stringify({
      patientName, recordTitle, ipfsCid, timestamp,
      ...(ivHex && { ivHex }),
      ...(encrypted !== undefined && { encrypted }),
    });

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

// POST /hedera/create-account
// Creates a new Hedera testnet account — operator pays, gasless for the user.
router.post("/hedera/create-account", async (req, res) => {
  const operatorId = process.env.VITE_HEDERA_ACCOUNT_ID?.trim();
  const privateKeyRaw = process.env.VITE_HEDERA_PRIVATE_KEY?.trim();

  if (!operatorId || !privateKeyRaw) {
    res.status(500).json({ error: "VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY must be set." });
    return;
  }

  const hospitalName: string = (req.body as { hospitalName?: string }).hospitalName?.trim() || "MediLedger Nexus Hospital";

  let client: Client | null = null;
  try {
    const built = await buildClient(operatorId, privateKeyRaw);
    client = built.client;
    const operatorKey = built.privateKey;

    const newKey = PrivateKey.generateED25519();

    const tx = await new AccountCreateTransaction()
      .setKey(newKey.publicKey)
      .setInitialBalance(new Hbar(0))
      .setAccountMemo(hospitalName)
      .freezeWith(client);

    const signed = await tx.sign(operatorKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    const newAccountId = receipt.accountId?.toString();

    if (!newAccountId) throw new Error("Account creation returned no accountId.");

    res.json({ accountId: newAccountId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  } finally {
    client?.close();
  }
});

// POST /hedera/submit-consent
// Submits a consent lifecycle event to the consent ledger topic.
// Auto-creates the topic on first call if it doesn't exist yet.
router.post("/hedera/submit-consent", async (req, res) => {
  const accountId = process.env.VITE_HEDERA_ACCOUNT_ID?.trim();
  const privateKeyRaw = process.env.VITE_HEDERA_PRIVATE_KEY?.trim();

  if (!accountId || !privateKeyRaw) {
    res.status(500).json({ error: "VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY must be set." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (!body.action || !body.consentId || !body.requesterDid || !body.ownerDid) {
    res.status(400).json({ error: "action, consentId, requesterDid, ownerDid are required." });
    return;
  }

  let client: Client | null = null;
  try {
    const topicId = await ensureConsentTopic(accountId, privateKeyRaw);

    const built = await buildClient(accountId, privateKeyRaw);
    client = built.client;
    const privateKey = built.privateKey;

    const payload = JSON.stringify(body);

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(payload)
      .freezeWith(client);

    const signedTx = await tx.sign(privateKey);
    const txResponse = await signedTx.execute(client);
    const transactionId = txResponse.transactionId.toString();
    res.json({ transactionId, topicId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  } finally {
    client?.close();
  }
});

export default router;
