// IPFS upload via Pinata
// Pinata pins files to IPFS and returns a Content Identifier (CID) — a unique fingerprint
// of the file content. The same file always produces the same CID, making it tamper-evident.

export async function uploadToPinata(file: File): Promise<string> {
  const jwt = import.meta.env.VITE_PINATA_JWT;

  if (!jwt) {
    throw new Error("VITE_PINATA_JWT is not configured.");
  }

  const formData = new FormData();
  formData.append("file", file);

  // Optional metadata so records are easy to find in the Pinata dashboard
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: file.name })
  );

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const data = await response.json();

  // IpfsHash is the CID — use it to retrieve the file from any IPFS gateway
  return data.IpfsHash as string;
}
