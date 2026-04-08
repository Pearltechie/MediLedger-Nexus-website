// Deterministic Patient DID generation.
// Produces did:mediledger:patient:<sha256_hex> from name + DOB + government ID.
// Same inputs → same DID at every MediLedger Nexus hospital, globally.
// Raw inputs are never stored; only the generated DID is persisted.

/**
 * Generate a deterministic patient DID from three identifying inputs.
 * Uses SHA-256 via the Web Crypto API (available in all modern browsers).
 * The DID is consistent regardless of which hospital generates it.
 */
export async function generatePatientDid(
  fullName: string,
  dateOfBirth: string,
  governmentId: string
): Promise<string> {
  // Normalize to eliminate trivial mismatches (case, whitespace)
  const normalized = [
    fullName.trim().toLowerCase(),
    dateOfBirth.trim(),
    governmentId.trim().toUpperCase(),
  ].join("|");

  const encoded = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `did:mediledger:patient:${hashHex}`;
}

/** Returns a display-safe masked version: first char + *** + last 4 chars */
export function maskGovernmentId(govId: string): string {
  const clean = govId.trim();
  if (clean.length <= 4) return "****";
  return `${clean[0]}${"*".repeat(Math.max(0, clean.length - 5))}${clean.slice(-4)}`;
}
