// RecordsPage — upload form + full record list.
// All encryption / IPFS / HCS logic lives in Dashboard.tsx and is passed as props.

import React, { useRef } from "react";
import { motion } from "framer-motion";
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
  Hash,
  Link2,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { RecordCard, type MedicalRecord } from "@/components/RecordCard";

const MINT = "#00FFA3";
const BG = "#05070A";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const MINT_GLASS = "rgba(0,255,163,0.06)";
const MINT_BORDER = "rgba(0,255,163,0.18)";
const GLASS_BG = "rgba(255,255,255,0.025)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-1 p-1 rounded transition flex-shrink-0"
      style={{ color: copied ? MINT : MUTED }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

export interface FormState {
  patientName: string;
  recordTitle: string;
  file: File | null;
}

export type UploadStatus =
  | { type: "idle" }
  | { type: "encrypting" }
  | { type: "uploading-ipfs" }
  | { type: "sending-hcs" }
  | { type: "success"; ipfsCid: string; hcsTxId: string; keyHex: string; ivHex: string }
  | { type: "error"; message: string };

interface Props {
  records: MedicalRecord[];
  form: FormState;
  status: UploadStatus;
  isLoading: boolean;
  loadingLabel: string;
  onFormChange: (changes: Partial<FormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onPreview: (record: MedicalRecord) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function RecordsPage({ records, form, status, isLoading, loadingLabel, onFormChange, onSubmit, onPreview, fileInputRef }: Props) {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: MINT }}>Medical Records</p>
        <h1 className="text-2xl font-black" style={{ color: SILVER }}>Hospital Records Vault</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          Files are AES-256-GCM encrypted in your browser before upload. Only ciphertext reaches IPFS.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Upload Form (2 cols) ── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border p-6 sticky top-6" style={{ background: GLASS_BG, borderColor: `rgba(0,255,163,0.15)`, boxShadow: "0 0 30px rgba(0,255,163,0.04)" }}>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                <Upload size={13} style={{ color: MINT }} />
              </div>
              <h2 className="font-bold text-sm" style={{ color: SILVER }}>Upload & Encrypt</h2>
            </div>
            <p className="text-xs mb-6" style={{ color: MUTED }}>
              <span style={{ color: MINT }}>AES-256-GCM</span> encrypted locally · Pinata IPFS · Hedera HCS
            </p>

            <form onSubmit={onSubmit} className="space-y-4">

              {/* Patient Name */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: MINT }}>
                  Patient Name
                </label>
                <input
                  type="text"
                  value={form.patientName}
                  onChange={(e) => onFormChange({ patientName: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: SILVER, caretColor: MINT }}
                  onFocus={(e) => (e.target.style.boxShadow = `0 0 0 2px rgba(0,255,163,0.2)`)}
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                />
              </div>

              {/* Record Title */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: MINT }}>
                  Record Title
                </label>
                <input
                  type="text"
                  value={form.recordTitle}
                  onChange={(e) => onFormChange({ recordTitle: e.target.value })}
                  placeholder="e.g. Blood Test Results 2024"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: SILVER, caretColor: MINT }}
                  onFocus={(e) => (e.target.style.boxShadow = `0 0 0 2px rgba(0,255,163,0.2)`)}
                  onBlur={(e) => (e.target.style.boxShadow = "none")}
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: MINT }}>
                  File
                </label>
                <div
                  className="rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center cursor-pointer transition-all"
                  style={{ borderColor: MINT_BORDER, background: MINT_GLASS }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0] ?? null;
                    if (file) onFormChange({ file });
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*,.txt,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      onFormChange({ file });
                    }}
                    className="hidden"
                  />
                  {form.file ? (
                    <div className="flex items-center gap-2 w-full">
                      <FileUp size={15} style={{ color: MINT }} className="flex-shrink-0" />
                      <span className="text-xs font-medium flex-1 truncate" style={{ color: SILVER }}>{form.file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFormChange({ file: null });
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="flex-shrink-0 transition"
                        style={{ color: MUTED }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#FF6B6B")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="mb-2" style={{ color: MINT, opacity: 0.7 }} />
                      <p className="text-xs text-center" style={{ color: MUTED }}>
                        Click or drag · <span style={{ color: MINT }}>PDF, image, or document</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading || !form.file}
                whileHover={!isLoading && form.file ? { scale: 1.01 } : {}}
                whileTap={!isLoading && form.file ? { scale: 0.98 } : {}}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isLoading ? MINT_GLASS : MINT,
                  color: isLoading ? MINT : BG,
                  border: isLoading ? `1px solid ${MINT_BORDER}` : "none",
                  boxShadow: isLoading || !form.file ? "none" : `0 0 24px rgba(0,255,163,0.35)`,
                }}
              >
                {isLoading ? (
                  <><Loader2 size={14} className="animate-spin" /> {loadingLabel}</>
                ) : (
                  <><ShieldCheck size={14} /> Encrypt, Upload & Anchor</>
                )}
              </motion.button>
            </form>

            {/* Success result */}
            {status.type === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-2xl p-4 space-y-3"
                style={{ background: "rgba(0,255,163,0.04)", border: `1px solid rgba(0,255,163,0.2)` }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} style={{ color: MINT }} />
                  <span className="font-bold text-xs" style={{ color: MINT }}>Encrypted & Anchored</span>
                </div>

                <div className="rounded-xl p-3" style={{ background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.18)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <KeyRound size={11} style={{ color: "#FFC107" }} />
                    <span className="text-xs font-bold" style={{ color: "#FFC107" }}>Save This Key Now</span>
                  </div>
                  <p className="text-xs mb-1" style={{ color: "#A37F00" }}>Never stored anywhere.</p>
                  <div className="flex items-start gap-1">
                    <p className="font-mono text-xs break-all flex-1" style={{ color: "#FFC107" }}>{status.keyHex}</p>
                    <CopyButton value={status.keyHex} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: MUTED }}>IPFS CID</p>
                  <div className="flex items-center gap-1">
                    <Hash size={11} style={{ color: MINT }} />
                    <a href={`https://gateway.pinata.cloud/ipfs/${status.ipfsCid}`} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs break-all flex-1 hover:underline" style={{ color: MINT }}>
                      {status.ipfsCid.slice(0, 24)}…
                    </a>
                    <CopyButton value={status.ipfsCid} />
                  </div>
                </div>

                <div className="rounded-xl p-3" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Link2 size={11} style={{ color: MINT }} />
                    <span className="text-xs font-bold" style={{ color: MINT }}>Hedera Proof of Truth</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-xs break-all flex-1" style={{ color: SILVER }}>{status.hcsTxId}</p>
                    <CopyButton value={status.hcsTxId} />
                  </div>
                  <a href={`https://hashscan.io/testnet/transaction/${status.hcsTxId}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold hover:underline" style={{ color: MINT }}>
                    <ExternalLink size={10} /> View on HashScan
                  </a>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {status.type === "error" && (
              <div className="mt-4 flex items-start gap-2 rounded-xl p-4" style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)" }}>
                <AlertCircle size={14} style={{ color: "#FF6B6B" }} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: "#FF6B6B" }}>{status.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Records List (3 cols) ── */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                <FolderOpen size={13} style={{ color: MINT }} />
              </div>
              <h2 className="font-bold text-sm" style={{ color: SILVER }}>Hospital Records</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: MINT }}>
              {records.length} record{records.length !== 1 ? "s" : ""}
            </span>
          </div>

          {records.length === 0 ? (
            <div className="rounded-2xl border p-12 flex flex-col items-center justify-center text-center"
              style={{ background: GLASS_BG, borderColor: GLASS_BORDER, borderStyle: "dashed" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                <FolderOpen size={26} style={{ color: MINT, opacity: 0.5 }} />
              </div>
              <p className="font-semibold text-sm mb-1" style={{ color: MUTED }}>No records uploaded yet</p>
              <p className="text-xs" style={{ color: "rgba(100,116,139,0.6)" }}>
                Upload your first record using the form on the left
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <RecordCard key={record.id} record={record} onPreview={onPreview} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
