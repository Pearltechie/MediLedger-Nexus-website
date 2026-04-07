// IPFS upload via Pinata. Only encrypted ciphertext is ever sent.

export async function uploadToPinata(encryptedBytes: Uint8Array<ArrayBuffer>, originalFileName: string): Promise<string> {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  if (!jwt) throw new Error("VITE_PINATA_JWT is not configured.");

  const blob = new Blob([encryptedBytes.buffer], { type: "application/octet-stream" });
  const encryptedFile = new File([blob], `${originalFileName}.enc`);

  const formData = new FormData();
  formData.append("file", encryptedFile);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: encryptedFile.name, keyvalues: { encrypted: "AES-256-GCM" } })
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const data = await response.json();
  return data.IpfsHash as string;
}
