// Client-side AES-256-GCM encryption using the browser's built-in Web Crypto API.
// Files are encrypted locally before they ever leave the browser.

export interface EncryptedPayload {
  encryptedBytes: Uint8Array<ArrayBuffer>;
  keyHex: string;
  ivHex: string;
}

export async function encryptFile(file: File): Promise<EncryptedPayload> {
  const fileBytes = await file.arrayBuffer();

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  // Explicitly allocate an ArrayBuffer so TypeScript treats iv as Uint8Array<ArrayBuffer>
  const iv = new Uint8Array(new ArrayBuffer(12));
  crypto.getRandomValues(iv);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileBytes
  );

  const rawKey = await crypto.subtle.exportKey("raw", key);

  return {
    encryptedBytes: new Uint8Array(encryptedBuffer) as Uint8Array<ArrayBuffer>,
    keyHex: bufToHex(new Uint8Array(rawKey) as Uint8Array<ArrayBuffer>),
    ivHex: bufToHex(iv),
  };
}

export async function decryptPayload(
  encryptedBytes: Uint8Array<ArrayBuffer>,
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

function bufToHex(buf: Uint8Array<ArrayBuffer>): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
