// Client-side AES-256-GCM encryption using the browser's built-in Web Crypto API.
// The file is encrypted locally before it ever leaves the browser.
// AES-GCM provides both confidentiality and integrity (authenticated encryption).

export interface EncryptedPayload {
  encryptedBytes: Uint8Array;
  keyHex: string;      // 256-bit AES key in hex — user must save this to decrypt
  ivHex: string;       // 96-bit initialization vector (unique per encryption)
}

// Encrypt a File using AES-256-GCM. Returns encrypted bytes + the key material.
export async function encryptFile(file: File): Promise<EncryptedPayload> {
  // Read the file into an ArrayBuffer
  const fileBytes = await file.arrayBuffer();

  // Generate a fresh random 256-bit AES key (never reused)
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,          // extractable — we need to export it so the user can save it
    ["encrypt"]
  );

  // Generate a random 96-bit IV (12 bytes is recommended for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the file bytes
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBytes
  );

  // Export the key as raw bytes so we can display it to the user
  const rawKey = await crypto.subtle.exportKey("raw", key);

  return {
    encryptedBytes: new Uint8Array(encryptedBuffer),
    keyHex: bufToHex(new Uint8Array(rawKey)),
    ivHex: bufToHex(iv),
  };
}

// Decrypt an encrypted payload (for future reference / download feature)
export async function decryptPayload(
  encryptedBytes: Uint8Array,
  keyHex: string,
  ivHex: string
): Promise<ArrayBuffer> {
  const rawKey = hexToBuf(keyHex);
  const iv = hexToBuf(ivHex);

  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedBytes);
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
