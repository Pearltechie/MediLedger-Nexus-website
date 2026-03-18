// Hedera Consensus Service (HCS) integration
// HCS lets us publish tamper-proof, timestamped messages to a shared topic on the Hedera network.
// Each upload results in a unique transaction ID that proves the record existed at a specific time.

import {
  Client,
  TopicMessageSubmitTransaction,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";

function getHederaClient(): Client {
  const accountId = import.meta.env.VITE_HEDERA_ACCOUNT_ID;
  const privateKey = import.meta.env.VITE_HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error("Hedera credentials not configured. Please set VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY.");
  }

  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromStringDer(privateKey)
  );
  return client;
}

export interface HCSMessage {
  patientName: string;
  recordTitle: string;
  ipfsCid: string;
  timestamp: string;
}

export async function submitToHCS(message: HCSMessage): Promise<string> {
  const topicId = import.meta.env.VITE_HEDERA_TOPIC_ID;

  if (!topicId) {
    throw new Error("VITE_HEDERA_TOPIC_ID is not configured.");
  }

  const client = getHederaClient();

  try {
    // Build the JSON payload to be anchored on HCS
    const payload = JSON.stringify(message);

    const txResponse = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(payload)
      .execute(client);

    const receipt = await txResponse.getReceipt(client);

    // The transaction ID uniquely identifies this HCS message forever
    return txResponse.transactionId.toString();
  } finally {
    client.close();
  }
}
