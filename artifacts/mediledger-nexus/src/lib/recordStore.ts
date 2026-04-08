// Persistent record store — localStorage keyed by hospital DID.
// Records survive logout / refresh / re-login so long as the same DID is used.

import type { MedicalRecord } from "@/components/RecordCard";

const PREFIX = "mediledger_records_";

function lsKey(did: string): string {
  return `${PREFIX}${did}`;
}

/** Load all records for this hospital DID (newest first). */
export function loadRecords(did: string): MedicalRecord[] {
  try {
    const raw = localStorage.getItem(lsKey(did));
    if (!raw) return [];
    return JSON.parse(raw) as MedicalRecord[];
  } catch {
    return [];
  }
}

/** Prepend a new record and persist the list. Returns the full updated list. */
export function addRecord(did: string, record: MedicalRecord): MedicalRecord[] {
  const existing = loadRecords(did);
  // De-duplicate by id in case of double-submit
  const filtered = existing.filter((r) => r.id !== record.id);
  const updated = [record, ...filtered];
  localStorage.setItem(lsKey(did), JSON.stringify(updated));
  return updated;
}
