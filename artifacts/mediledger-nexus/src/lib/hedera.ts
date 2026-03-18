// Hedera Consensus Service (HCS) integration
// HCS lets us publish tamper-proof, timestamped messages to a shared topic on the Hedera network.
// Each upload results in a unique transaction ID that proves the record existed at a specific time.

import {
  Client,
  TopicMessageSubmitTransaction,
  TopicId,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";

function parsePrivateKey(raw: string): PrivateKey {
  // Try each format in order: auto-detect, then hex, then DER
  const attempts: Array<() => PrivateKey> = [
    () => PrivateKey.fromString(raw),
    () => PrivateKey.fromStringED25519(raw),
    () => PrivateKey.fromStringECDSA(raw),
    () => PrivateKey.fromStringDer(raw),
  ];

  for (const attempt of attempts) {
    try {
      return attempt();
    } catch {
      // try next format
    }
  }

  throw new Error(
    "Could not parse VITE_HEDERA_PRIVATE_KEY. Make sure it is the HEX Encoded Private Key from the Hedera portal."
  );
}

function getHederaClient(): Client {
  const accountId = import.meta.env.VITE_HEDERA_ACCOUNT_ID?.trim();
  const privateKey = import.meta.env.VITE_HEDERA_PRIVATE_KEY?.trim();

  if (!accountId || !privateKey) {
    throw new Error(
      "Hedera credentials not configured. Please set VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY."
    );
  }

  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(accountId), parsePrivateKey(privateKey));
  return client;
}

export interface HCSMessage {
  patientName: string;
  recordTitle: string;
  ipfsCid: string;
  timestamp: string;
}

export async function submitToHCS(message: HCSMessage): Promise<string> {
  const rawTopicId = import.meta.env.VITE_HEDERA_TOPIC_ID?.trim();

  if (!rawTopicId) {
    throw new Error("VITE_HEDERA_TOPIC_ID is not configured.");
  }

  const client = getHederaClient();

  try {
    // Build the JSON payload to be anchored on HCS
    const payload = JSON.stringify(message);

    const txResponse = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(rawTopicId))
      .setMessage(payload)
      .execute(client);

    // The transaction ID uniquely identifies this HCS message forever
    return txResponse.transactionId.toString();
  } finally {
    client.close();
  }
}
