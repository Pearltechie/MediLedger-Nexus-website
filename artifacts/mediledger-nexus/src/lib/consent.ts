// Consent HCS client — submits consent lifecycle events to the consent topic
// managed by the backend. The topic is created on first use via the API.
// Also provides mirror-node sync so Hospital B sees Hospital A's requests.

import {
  type ConsentRequest,
  type ConsentStatus,
  loadConsents,
  addConsent,
  updateConsent,
} from "@/lib/consentStore";

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
export async function submitConsentToHCS(
  payload: ConsentHCSPayload
): Promise<{ transactionId: string; topicId: string }> {
  const response = await fetch("/api/hedera/submit-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    transactionId?: string;
    topicId?: string;
    error?: string;
  };

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Server error: ${response.status}`);
  }

  if (!data.transactionId || !data.topicId) {
    throw new Error("Incomplete response from consent HCS endpoint.");
  }

  return { transactionId: data.transactionId, topicId: data.topicId };
}

/**
 * Polls the Hedera mirror node for all messages on the consent topic and
 * reconciles them with the local hospital's localStorage.
 *
 * This solves the cross-browser problem: when Hospital A writes a REQUEST
 * to HCS, Hospital B polls here and sees it as an incoming pending consent,
 * even though Hospital B's localStorage was previously empty.
 *
 * Also updates the status of outgoing consents when the other hospital
 * has approved, denied, or revoked on-chain.
 */
export async function syncConsentsFromHCS(
  topicId: string,
  myHospitalDid: string
): Promise<void> {
  const res = await fetch(
    `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?order=asc&limit=100`
  );
  if (!res.ok) throw new Error(`Mirror node error: ${res.status}`);

  const data = (await res.json()) as {
    messages?: Array<{
      message: string;
      sequence_number: number;
      consensus_timestamp: string;
    }>;
  };

  if (!data.messages?.length) return;

  // Decode and parse every message on the topic
  interface ParsedMsg extends ConsentHCSPayload {
    seq: number;
    consensusTime: string;
  }
  const parsed: ParsedMsg[] = [];

  for (const raw of data.messages) {
    try {
      const json = atob(raw.message);
      const payload = JSON.parse(json) as ConsentHCSPayload;
      if (payload.consentId && payload.action) {
        parsed.push({ ...payload, seq: raw.sequence_number, consensusTime: raw.consensus_timestamp });
      }
    } catch {
      // skip malformed messages
    }
  }

  // Group all messages by consentId — preserving insertion order (already asc)
  const byId = new Map<string, ParsedMsg[]>();
  for (const msg of parsed) {
    const bucket = byId.get(msg.consentId) ?? [];
    bucket.push(msg);
    byId.set(msg.consentId, bucket);
  }

  // For each unique consent, determine its current state from HCS
  for (const [consentId, messages] of byId) {
    const first = messages[0]; // the original REQUEST
    const last = messages[messages.length - 1]; // most recent action

    // Only process consents that involve this hospital
    const isIncoming = first.ownerDid === myHospitalDid;
    const isOutgoing = first.requesterDid === myHospitalDid;
    if (!isIncoming && !isOutgoing) continue;

    // Map HCS action → ConsentStatus
    const actionToStatus: Record<string, ConsentStatus> = {
      REQUEST: "pending",
      APPROVE: "approved",
      DENY: "denied",
      REVOKE: "revoked",
    };
    const hcsStatus = actionToStatus[last.action];
    if (!hcsStatus) continue;

    const existing = loadConsents(myHospitalDid).find((c) => c.id === consentId);

    if (!existing) {
      // Consent exists on-chain but not in our localStorage yet → add it
      const consent: ConsentRequest = {
        id: consentId,
        direction: isIncoming ? "incoming" : "outgoing",
        requesterDid: first.requesterDid,
        requesterName: first.requesterName,
        ownerDid: first.ownerDid,
        ownerName: first.ownerName,
        patientDid: first.patientDid,
        patientName: first.patientName,
        purpose: first.purpose,
        status: hcsStatus,
        accessDurationDays: first.accessDurationDays ?? 7,
        createdAt: first.timestamp,
        updatedAt: last.consensusTime,
        expiresAt: last.expiresAt,
      };
      addConsent(myHospitalDid, consent);
    } else if (existing.status !== hcsStatus) {
      // Status has changed on-chain since our last view — sync it
      updateConsent(myHospitalDid, consentId, {
        status: hcsStatus,
        expiresAt: last.expiresAt ?? existing.expiresAt,
        updatedAt: last.consensusTime,
      });
    }
  }
}
