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
  AccountCreateTransaction,
  Hbar,
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

    const payload = JSON.stringify({ patientName, recordTitle, ipfsCid, timestamp, ...(ivHex && { ivHex }), ...(encrypted !== undefined && { encrypted }) });

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

// Creates a new Hedera testnet account — operator pays, so it's gasless for the user.
// Returns { accountId } — the DID is constructed client-side as did:hedera:testnet:<accountId>
router.post("/hedera/create-account", async (req, res) => {
  const operatorId = process.env.VITE_HEDERA_ACCOUNT_ID?.trim();
  const privateKeyRaw = process.env.VITE_HEDERA_PRIVATE_KEY?.trim();

  if (!operatorId || !privateKeyRaw) {
    res.status(500).json({ error: "VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY must be set." });
    return;
  }

  // Use the hospital's real name as the on-chain account memo
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

    if (!newAccountId) {
      throw new Error("Account creation returned no accountId.");
    }

    res.json({ accountId: newAccountId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  } finally {
    client?.close();
  }
});

// Consent HCS submission — always writes to the fixed consent topic 0.0.8554639.
// Consent actions: REQUEST | APPROVE | DENY | REVOKE
router.post("/hedera/submit-consent", async (req, res) => {
  const CONSENT_TOPIC = "0.0.8554639";
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
    const built = await buildClient(accountId, privateKeyRaw);
    client = built.client;
    const privateKey = built.privateKey;

    const payload = JSON.stringify(body);

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(CONSENT_TOPIC))
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
