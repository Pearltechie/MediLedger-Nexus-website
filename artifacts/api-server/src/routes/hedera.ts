// Backend route for Hedera HCS submission.
// We handle this server-side because gRPC (which Hedera uses) can't run
// directly in a browser — it requires Node.js native networking.

import { Router, type IRouter } from "express";
import {
  AccountCreateTransaction,
  Hbar,
  PrivateKey,
} from "@hashgraph/sdk";
import {
  buildClient,
  ensureTopic,
  submitToTopic,
  getHederaCreds,
  CONSENT_TOPIC_CACHE,
} from "../lib/hederaClient.js";

const router: IRouter = Router();

// GET /hedera/consent-topic
// Returns the current consent topic ID, creating one on Hedera if needed.
// The frontend calls this once when the Consult page mounts.
router.get("/hedera/consent-topic", async (req, res) => {
  try {
    const { accountId, privateKeyRaw } = getHederaCreds();
    const topicId = await ensureTopic(accountId, privateKeyRaw, {
      cacheFile: CONSENT_TOPIC_CACHE,
      envVar: "VITE_HEDERA_CONSENT_TOPIC_ID",
      memo: "MediLedger Nexus — Consent Ledger",
      logLabel: "Consent topic",
    });
    res.json({ topicId });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /hedera/submit-hcs
// Submits a medical record anchor to the configurable records topic.
router.post("/hedera/submit-hcs", async (req, res) => {
  const topicId = process.env.VITE_HEDERA_TOPIC_ID?.trim();
  if (!topicId) {
    res.status(500).json({ error: "VITE_HEDERA_TOPIC_ID is not configured." });
    return;
  }

  try {
    const { accountId, privateKeyRaw } = getHederaCreds();

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

    const payload = JSON.stringify({
      patientName, recordTitle, ipfsCid, timestamp,
      ...(ivHex && { ivHex }),
      ...(encrypted !== undefined && { encrypted }),
    });

    const transactionId = await submitToTopic(accountId, privateKeyRaw, topicId, payload);
    res.json({ transactionId });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /hedera/create-account
// Creates a new Hedera testnet account — operator pays, gasless for the user.
router.post("/hedera/create-account", async (req, res) => {
  try {
    const { accountId: operatorId, privateKeyRaw } = getHederaCreds();
    const hospitalName: string =
      (req.body as { hospitalName?: string }).hospitalName?.trim() || "MediLedger Nexus Hospital";

    let client = null;
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
    } finally {
      client?.close();
    }
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /hedera/submit-consent
// Submits a consent lifecycle event to the consent ledger topic.
router.post("/hedera/submit-consent", async (req, res) => {
  try {
    const { accountId, privateKeyRaw } = getHederaCreds();

    const body = req.body as Record<string, unknown>;
    if (!body.action || !body.consentId || !body.requesterDid || !body.ownerDid) {
      res.status(400).json({ error: "action, consentId, requesterDid, ownerDid are required." });
      return;
    }

    const topicId = await ensureTopic(accountId, privateKeyRaw, {
      cacheFile: CONSENT_TOPIC_CACHE,
      envVar: "VITE_HEDERA_CONSENT_TOPIC_ID",
      memo: "MediLedger Nexus — Consent Ledger",
      logLabel: "Consent topic",
    });

    const transactionId = await submitToTopic(accountId, privateKeyRaw, topicId, JSON.stringify(body));
    res.json({ transactionId, topicId });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
