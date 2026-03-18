// Dashboard is the main page of MediLedger Nexus.
// It lets users upload a medical file to IPFS via Pinata,
// then anchors the IPFS CID + patient info to Hedera HCS for tamper-proof auditing.

import React, { useState, useRef } from "react";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
  X,
  ShieldCheck,
} from "lucide-react";
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
  | { type: "uploading-ipfs" }
  | { type: "sending-hcs" }
  | { type: "success"; ipfsCid: string; hcsTxId: string }
  | { type: "error"; message: string };

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
    // Reset status when a new file is chosen
    if (status.type !== "idle") setStatus({ type: "idle" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || !form.patientName.trim() || !form.recordTitle.trim()) return;

    try {
      // Step 1: Upload the file to IPFS through Pinata
      setStatus({ type: "uploading-ipfs" });
      const ipfsCid = await uploadToPinata(form.file);

      // Step 2: Anchor the IPFS CID + metadata to Hedera HCS
      setStatus({ type: "sending-hcs" });
      const hcsTxId = await submitToHCS({
        patientName: form.patientName.trim(),
        recordTitle: form.recordTitle.trim(),
        ipfsCid,
        timestamp: new Date().toISOString(),
      });

      // Step 3: Save to session records list and show success
      const newRecord: MedicalRecord = {
        id: crypto.randomUUID(),
        patientName: form.patientName.trim(),
        recordTitle: form.recordTitle.trim(),
        ipfsCid,
        hcsTransactionId: hcsTxId,
        createdAt: new Date().toISOString(),
      };
      setRecords((prev) => [newRecord, ...prev]);
      setStatus({ type: "success", ipfsCid, hcsTxId });

      // Reset form
      setForm({ patientName: "", recordTitle: "", file: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setStatus({ type: "error", message });
    }
  };

  const isLoading =
    status.type === "uploading-ipfs" || status.type === "sending-hcs";

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
            <p className="text-indigo-200 text-xs">Secure Medical Records on IPFS + Hedera HCS</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Upload Form Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-gray-900 font-semibold text-lg mb-1">Upload Medical Record</h2>
          <p className="text-gray-500 text-sm mb-5">
            Files are stored on IPFS and their hash is anchored to the Hedera testnet.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Patient Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Name
              </label>
              <input
                type="text"
                value={form.patientName}
                onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value }))}
                placeholder="e.g. Jane Doe"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2"
                style={{
                  borderColor: "#6366F1",
                  // @ts-ignore
                  "--tw-ring-color": "#4F46E5",
                }}
              />
            </div>

            {/* Record Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Record Title
              </label>
              <input
                type="text"
                value={form.recordTitle}
                onChange={(e) => setForm((p) => ({ ...p, recordTitle: e.target.value }))}
                placeholder="e.g. Blood Test Results 2024"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2"
                style={{
                  borderColor: "#6366F1",
                }}
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File (PDF or Image)
              </label>
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
                  {status.type === "uploading-ipfs" ? "Uploading to IPFS…" : "Sending to Hedera HCS…"}
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload & Secure
                </>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {status.type === "success" && (
            <div
              className="mt-4 rounded-lg p-4 border space-y-2"
              style={{ backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }}
            >
              <div className="flex items-center gap-2" style={{ color: "#16A34A" }}>
                <CheckCircle2 size={18} />
                <span className="font-semibold text-sm">Verified ✅ — Record secured on IPFS + Hedera</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">IPFS CID</p>
                <p className="font-mono text-xs break-all text-green-700">{status.ipfsCid}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">HCS Transaction ID</p>
                <p className="font-mono text-xs break-all text-green-700">{status.hcsTxId}</p>
              </div>
            </div>
          )}

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
              Recent Records ({records.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {records.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {records.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">
            <ShieldCheck size={32} className="mx-auto mb-2 text-indigo-200" />
            Secured records will appear here after upload.
          </div>
        )}
      </main>
    </div>
  );
}
