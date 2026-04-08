// Patient registry — localStorage persistence keyed by hospital DID.
// Raw government ID is never stored; only a masked hint is kept for display.

export interface Patient {
  id: string;
  did: string;                 // did:mediledger:patient:<sha256_hex>
  fullName: string;
  dateOfBirth: string;         // YYYY-MM-DD
  governmentIdHint: string;    // masked display value — e.g. "A***4567"
  registeredAt: string;        // ISO timestamp
  hcsTransactionId?: string;   // Hedera proof of registration (if anchored)
}

const PREFIX = "mediledger_patients_";

function lsKey(hospitalDid: string): string {
  return `${PREFIX}${hospitalDid}`;
}

export function loadPatients(hospitalDid: string): Patient[] {
  try {
    const raw = localStorage.getItem(lsKey(hospitalDid));
    return raw ? (JSON.parse(raw) as Patient[]) : [];
  } catch {
    return [];
  }
}

export function addPatient(hospitalDid: string, patient: Patient): Patient[] {
  const existing = loadPatients(hospitalDid);
  // De-duplicate by DID
  const filtered = existing.filter((p) => p.did !== patient.did);
  const updated = [patient, ...filtered];
  localStorage.setItem(lsKey(hospitalDid), JSON.stringify(updated));
  return updated;
}

export function findPatientByDid(hospitalDid: string, patientDid: string): Patient | null {
  return loadPatients(hospitalDid).find((p) => p.did === patientDid) ?? null;
}
