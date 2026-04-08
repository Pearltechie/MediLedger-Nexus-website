// Consent HCS client — submits consent lifecycle events to the fixed
// consent topic 0.0.8554639 via the backend API.

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

export async function submitConsentToHCS(payload: ConsentHCSPayload): Promise<string> {
  const response = await fetch("/api/hedera/submit-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { transactionId?: string; error?: string };

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Server error: ${response.status}`);
  }

  if (!data.transactionId) {
    throw new Error("No transaction ID returned from consent HCS submission.");
  }

  return data.transactionId;
}
