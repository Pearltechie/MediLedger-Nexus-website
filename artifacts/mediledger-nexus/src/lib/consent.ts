// Consent HCS client — submits consent lifecycle events to the consent topic
// managed by the backend. The topic is created on first use via the API.

export interface ConsentHCSPayload {
  action: "REQUEST" | "APPROVE" | "DENY" | "REVOKE";
  consentId: string;
  requesterDid: string;
  requesterName: string;
  ownerDid: string;
  ownerName: string;
  patientDid: string;
  patientName: string;
  purpose: string;
  timestamp: string;
  accessDurationDays?: number;
  expiresAt?: string;
}

/** Fetches (or auto-creates) the consent ledger topic ID from the backend. */
export async function fetchConsentTopicId(): Promise<string> {
  const response = await fetch("/api/hedera/consent-topic");
  const data = (await response.json()) as { topicId?: string; error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Server error: ${response.status}`);
  }
  if (!data.topicId) throw new Error("No topic ID returned from server.");
  return data.topicId;
}

/** Submits a consent lifecycle event to the HCS consent ledger. */
export async function submitConsentToHCS(payload: ConsentHCSPayload): Promise<{ transactionId: string; topicId: string }> {
  const response = await fetch("/api/hedera/submit-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { transactionId?: string; topicId?: string; error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Server error: ${response.status}`);
  }

  if (!data.transactionId || !data.topicId) {
    throw new Error("Incomplete response from consent HCS endpoint.");
  }

  return { transactionId: data.transactionId, topicId: data.topicId };
}
