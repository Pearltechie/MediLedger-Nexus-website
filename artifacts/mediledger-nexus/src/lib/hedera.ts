// Hedera Consensus Service (HCS) integration — via backend API
// gRPC (which Hedera uses) cannot run directly in browsers, so we delegate
// transaction submission to the Express backend which uses the Node.js SDK.
// The backend signs and submits the transaction, returning the HCS transaction ID.

export interface HCSMessage {
  patientName: string;
  recordTitle: string;
  ipfsCid: string;
  timestamp: string;
  ivHex?: string;       // AES-GCM IV — public, needed alongside the key to decrypt
  encrypted?: boolean;  // signals the file on IPFS is AES-256-GCM encrypted
}

export async function submitToHCS(message: HCSMessage): Promise<string> {
  const response = await fetch("/api/hedera/submit-hcs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  const data = await response.json() as { transactionId?: string; error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Server error: ${response.status}`);
  }

  if (!data.transactionId) {
    throw new Error("No transaction ID returned from server.");
  }

  // This transaction ID can be looked up on HashScan: https://hashscan.io/testnet/transaction/<id>
  return data.transactionId;
}
