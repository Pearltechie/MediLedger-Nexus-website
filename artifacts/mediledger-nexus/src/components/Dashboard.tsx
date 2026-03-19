// Dashboard — main page of MediLedger Nexus.
// Flow: Encrypt file locally → Upload ciphertext to IPFS → Anchor CID + IV on Hedera HCS.
// The decryption key is generated client-side and never leaves the browser.

import React, { useState, useRef } from "react";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
  X,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { encryptFile } from "@/lib/encryption";
import { uploadToPinata } from "@/lib/pinata";
import { submitToHCS } from "@/lib/hedera";
import { RecordCard, type MedicalRecord } from "@/components/RecordCard";

interface FormState {
  patientName: string;
  recordTitle: string;
  file: File | null;
}

type Status =
  | { type: "idle" }
  | { type: "encrypting" }
  | { type: "uploading-ipfs" }
  | { type: "sending-hcs" }
  | { type: "success"; ipfsCid: string; hcsTxId: string; keyHex: string; ivHex: string }
  | { type: "error"; message: string };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-2 flex-shrink-0 p-1 rounded transition hover:bg-black/10"
      title="Copy to clipboard"
    >
      {copied ? <Check size={13} className="text-green-700" /> : <Copy size={13} className="text-gray-400" />}
    </button>
  );
}

export function Dashboard() {
  const [form, setForm] = useState<FormState>({
    patientName: "",
    recordTitle: "",
    file: null,
  });
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, file }));
    if (status.type !== "idle") setStatus({ type: "idle" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || !form.patientName.trim() || !form.recordTitle.trim()) return;

    try {
      // Step 1: Encrypt the file locally (AES-256-GCM, key never leaves the browser)
      setStatus({ type: "encrypting" });
      let keyHex: string;
      let ivHex: string;
      let encryptedBytes: Uint8Array;
      try {
        const result = await encryptFile(form.file);
        keyHex = result.keyHex;
        ivHex = result.ivHex;
        encryptedBytes = result.encryptedBytes;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Encryption failed: ${msg}`);
      }

      // Step 2: Upload the encrypted ciphertext to IPFS via Pinata
      setStatus({ type: "uploading-ipfs" });
      let ipfsCid: string;
      try {
        ipfsCid = await uploadToPinata(encryptedBytes, form.file.name);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`IPFS upload failed: ${msg}`);
      }

      // Step 3: Anchor the IPFS CID + IV on Hedera HCS (key is NOT stored here)
      setStatus({ type: "sending-hcs" });
      let hcsTxId: string;
      try {
        hcsTxId = await submitToHCS({
          patientName: form.patientName.trim(),
          recordTitle: form.recordTitle.trim(),
          ipfsCid,
          timestamp: new Date().toISOString(),
          ivHex,           // IV is public — needed to decrypt along with the key
          encrypted: true,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Hedera HCS submission failed: ${msg}`);
      }

      // Step 4: Show success — user must save their decryption key
      const newRecord: MedicalRecord = {
        id: crypto.randomUUID(),
        patientName: form.patientName.trim(),
        recordTitle: form.recordTitle.trim(),
        ipfsCid,
        hcsTransactionId: hcsTxId,
        keyHex,
        ivHex,
        createdAt: new Date().toISOString(),
      };
      setRecords((prev) => [newRecord, ...prev]);
      setStatus({ type: "success", ipfsCid, hcsTxId, keyHex, ivHex });

      setForm({ patientName: "", recordTitle: "", file: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setStatus({ type: "error", message });
    }
  };

  const isLoading =
    status.type === "encrypting" ||
    status.type === "uploading-ipfs" ||
    status.type === "sending-hcs";

  const loadingLabel = () => {
    if (status.type === "encrypting") return "Encrypting file…";
    if (status.type === "uploading-ipfs") return "Uploading to IPFS…";
    if (status.type === "sending-hcs") return "Anchoring on Hedera HCS…";
    return "";
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F3F4F6" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#4F46E5" }} className="shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">MediLedger Nexus</h1>
            <p className="text-indigo-200 text-xs">Encrypted Medical Records on IPFS + Hedera HCS</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Upload Form Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-gray-900 font-semibold text-lg mb-1">Upload & Encrypt Medical Record</h2>
          <p className="text-gray-500 text-sm mb-5">
            Files are <span className="font-medium text-indigo-600">AES-256-GCM encrypted</span> in your browser before upload. Only ciphertext reaches IPFS — your key never leaves your device.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Patient Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
              <input
                type="text"
                value={form.patientName}
                onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value }))}
                placeholder="e.g. Jane Doe"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2"
                style={{ borderColor: "#6366F1" }}
              />
            </div>

            {/* Record Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Record Title</label>
              <input
                type="text"
                value={form.recordTitle}
                onChange={(e) => setForm((p) => ({ ...p, recordTitle: e.target.value }))}
                placeholder="e.g. Blood Test Results 2024"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2"
                style={{ borderColor: "#6366F1" }}
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF or Image)</label>
              <div
                className="relative rounded-lg border-2 border-dashed p-4 flex flex-col items-center justify-center cursor-pointer transition hover:bg-indigo-50"
                style={{ borderColor: "#6366F1" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
                {form.file ? (
                  <div className="flex items-center gap-2">
                    <FileUp size={18} style={{ color: "#4F46E5" }} />
                    <span className="text-sm font-medium text-gray-700">{form.file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((p) => ({ ...p, file: null }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="ml-1 text-gray-400 hover:text-red-500 transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-indigo-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      Click to select a <span className="font-medium text-indigo-600">PDF or image</span>
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !form.file}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: isLoading ? "#6366F1" : "#4F46E5" }}
              onMouseEnter={(e) => { if (!isLoading) (e.currentTarget.style.backgroundColor = "#4338CA"); }}
              onMouseLeave={(e) => { if (!isLoading) (e.currentTarget.style.backgroundColor = "#4F46E5"); }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {loadingLabel()}
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Encrypt, Upload & Secure
                </>
              )}
            </button>
          </form>

          {/* Success */}
          {status.type === "success" && (
            <div
              className="mt-5 rounded-xl p-4 border space-y-3"
              style={{ backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }}
            >
              <div className="flex items-center gap-2" style={{ color: "#16A34A" }}>
                <CheckCircle2 size={18} />
                <span className="font-semibold text-sm">Encrypted & Verified ✅</span>
              </div>

              {/* Decryption Key — most important */}
              <div className="rounded-lg border p-3" style={{ backgroundColor: "#FEF9C3", borderColor: "#FDE047" }}>
                <div className="flex items-center gap-1 mb-1">
                  <KeyRound size={14} className="text-yellow-700" />
                  <span className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">Decryption Key — Save This Now!</span>
                </div>
                <p className="text-xs text-yellow-700 mb-1">This key is the only way to decrypt your file. It is not stored anywhere.</p>
                <div className="flex items-start gap-1">
                  <p className="font-mono text-xs break-all text-yellow-900 flex-1">{status.keyHex}</p>
                  <CopyButton value={status.keyHex} />
                </div>
              </div>

              {/* IV */}
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">IV (Initialization Vector)</p>
                <div className="flex items-center gap-1">
                  <p className="font-mono text-xs break-all text-gray-600 flex-1">{status.ivHex}</p>
                  <CopyButton value={status.ivHex} />
                </div>
              </div>

              {/* IPFS CID */}
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">IPFS CID (encrypted file)</p>
                <div className="flex items-center gap-1">
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${status.ipfsCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs break-all text-green-700 hover:underline flex-1"
                  >
                    {status.ipfsCid}
                  </a>
                  <CopyButton value={status.ipfsCid} />
                </div>
              </div>

              {/* HCS TX */}
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">HCS Transaction ID</p>
                <div className="flex items-center gap-1">
                  <a
                    href={`https://hashscan.io/testnet/transaction/${status.hcsTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs break-all text-green-700 hover:underline flex-1"
                  >
                    {status.hcsTxId}
                  </a>
                  <CopyButton value={status.hcsTxId} />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {status.type === "error" && (
            <div
              className="mt-4 rounded-lg p-4 border flex items-start gap-2"
              style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA" }}
            >
              <AlertCircle size={18} style={{ color: "#DC2626" }} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm" style={{ color: "#DC2626" }}>{status.message}</p>
            </div>
          )}
        </div>

        {/* Recent Records */}
        {records.length > 0 && (
          <div>
            <h2 className="text-gray-900 font-semibold text-lg mb-4">
              Session Records ({records.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {records.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          </div>
        )}

        {records.length === 0 && status.type !== "success" && (
          <div className="text-center text-gray-400 text-sm py-4">
            <ShieldCheck size={32} className="mx-auto mb-2 text-indigo-200" />
            Encrypted, secured records will appear here after upload.
          </div>
        )}
      </main>
    </div>
  );
}
