// Consent store — localStorage persistence keyed by hospital DID.
// Tracks all outgoing and incoming consent requests.
// Raw patient data is never written to HCS — only DIDs and metadata.

export type ConsentStatus = "pending" | "approved" | "denied" | "revoked" | "expired";
export type ConsentAction = "REQUEST" | "APPROVE" | "DENY" | "REVOKE";

export interface ConsentRequest {
  id: string;
  /** "outgoing" = this hospital sent the request; "incoming" = this hospital received it */
  direction: "outgoing" | "incoming";
  requesterDid: string;
  requesterName: string;
  ownerDid: string;
  ownerName: string;
  patientDid: string;
  patientName: string;
  purpose: string;
  status: ConsentStatus;
  accessDurationDays: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  /** HCS transaction ID for the most recent status change */
  hcsTransactionId?: string;
}

const PREFIX = "mediledger_consents_";

function lsKey(hospitalDid: string): string {
  return `${PREFIX}${hospitalDid}`;
}

export function loadConsents(hospitalDid: string): ConsentRequest[] {
  try {
    const raw = localStorage.getItem(lsKey(hospitalDid));
    return raw ? (JSON.parse(raw) as ConsentRequest[]) : [];
  } catch {
    return [];
  }
}

export function saveConsents(hospitalDid: string, consents: ConsentRequest[]): void {
  localStorage.setItem(lsKey(hospitalDid), JSON.stringify(consents));
}

export function addConsent(hospitalDid: string, consent: ConsentRequest): ConsentRequest[] {
  const existing = loadConsents(hospitalDid);
  const updated = [consent, ...existing.filter((c) => c.id !== consent.id)];
  saveConsents(hospitalDid, updated);
  return updated;
}

export function updateConsent(
  hospitalDid: string,
  consentId: string,
  changes: Partial<ConsentRequest>
): ConsentRequest[] {
  const existing = loadConsents(hospitalDid);
  const updated = existing.map((c) =>
    c.id === consentId ? { ...c, ...changes, updatedAt: new Date().toISOString() } : c
  );
  saveConsents(hospitalDid, updated);
  return updated;
}
