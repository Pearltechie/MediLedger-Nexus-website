// RecordPreviewModal — fetches an encrypted file from Pinata by CID,
// decrypts it with the stored AES-256-GCM key/IV, and renders a preview.
// Supports: images, PDFs, plain text, and generic binary (download).

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  AlertCircle,
  Download,
  FileText,
  Image,
  FileCode,
  ExternalLink,
  KeyRound,
  Hash,
  Link2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { decryptPayload } from "@/lib/encryption";
import type { MedicalRecord } from "@/components/RecordCard";

const BG = "#05070A";
const MINT = "#00FFA3";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const MINT_GLASS = "rgba(0,255,163,0.06)";
const MINT_BORDER = "rgba(0,255,163,0.2)";
const GLASS_BG = "rgba(15,20,28,0.97)";
const GLASS_BORDER = "rgba(255,255,255,0.08)";

// ─── MIME detection from magic bytes ─────────────────────────────────────────
function detectMime(bytes: Uint8Array, storedMime?: string): string {
  if (storedMime && storedMime !== "application/octet-stream") return storedMime;
  const h = bytes;
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return "image/jpeg";
  if (h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47) return "image/png";
  if (h[0] === 0x47 && h[1] === 0x49 && h[2] === 0x46) return "image/gif";
  if (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) return "application/pdf";
  if (h[0] === 0x42 && h[1] === 0x4d) return "image/bmp";
  // Heuristic for plain text: all bytes printable ASCII / common control chars
  const sample = bytes.slice(0, 512);
  const isText = Array.from(sample).every((b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127));
  if (isText) return "text/plain";
  return "application/octet-stream";
}

// ─── Row in the metadata table ────────────────────────────────────────────────
function MetaRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
      <span className="mt-0.5 flex-shrink-0" style={{ color: MINT }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: MUTED }}>{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-xs break-all hover:underline inline-flex items-center gap-1" style={{ color: MINT }}>
            {value} <ExternalLink size={10} />
          </a>
        ) : (
          <p className="font-mono text-xs break-all" style={{ color: SILVER }}>{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Decrypted file preview area ─────────────────────────────────────────────
function FilePreview({ mime, decryptedBuffer, fileName }: { mime: string; decryptedBuffer: ArrayBuffer; fileName?: string }) {
  const blob = new Blob([decryptedBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const name = fileName ?? "decrypted-record";

  if (mime.startsWith("image/")) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5 self-start">
          <Image size={13} style={{ color: MINT }} />
          <span className="text-xs font-semibold" style={{ color: MINT }}>Image Preview</span>
        </div>
        <img src={url} alt={name} className="max-w-full max-h-96 rounded-xl object-contain" style={{ border: `1px solid ${GLASS_BORDER}` }} />
        <a href={url} download={name} className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition" style={{ color: MINT }}>
          <Download size={13} /> Save image
        </a>
      </div>
    );
  }

  if (mime === "application/pdf") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <FileText size={13} style={{ color: MINT }} />
          <span className="text-xs font-semibold" style={{ color: MINT }}>PDF Preview</span>
        </div>
        <iframe src={url} title="PDF Preview" className="w-full rounded-xl" style={{ height: 480, border: `1px solid ${GLASS_BORDER}`, background: "#fff" }} />
        <a href={url} download={`${name}.pdf`} className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition" style={{ color: MINT }}>
          <Download size={13} /> Download PDF
        </a>
      </div>
    );
  }

  if (mime.startsWith("text/")) {
    const text = new TextDecoder().decode(decryptedBuffer);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <FileCode size={13} style={{ color: MINT }} />
          <span className="text-xs font-semibold" style={{ color: MINT }}>Text Preview</span>
        </div>
        <pre className="text-xs rounded-xl p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GLASS_BORDER}`, color: SILVER }}>
          {text}
        </pre>
        <a href={url} download={name} className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition" style={{ color: MINT }}>
          <Download size={13} /> Download text file
        </a>
      </div>
    );
  }

  // Generic binary
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
        <FileText size={28} style={{ color: MINT }} />
      </div>
      <p className="text-sm text-center" style={{ color: MUTED }}>
        File decrypted successfully. Click below to download.
      </p>
      <a
        href={url}
        download={name}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm transition hover:opacity-90"
        style={{ background: MINT, color: BG, boxShadow: `0 0 20px rgba(0,255,163,0.3)` }}
      >
        <Download size={15} /> Download Decrypted File
      </a>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface Props {
  record: MedicalRecord | null;
  onClose: () => void;
}

type PreviewState =
  | { phase: "idle" }
  | { phase: "fetching" }
  | { phase: "decrypting" }
  | { phase: "done"; mime: string; buffer: ArrayBuffer }
  | { phase: "error"; message: string };

export function RecordPreviewModal({ record, onClose }: Props) {
  const [preview, setPreview] = useState<PreviewState>({ phase: "idle" });

  // Reset state when a different record is opened
  useEffect(() => {
    setPreview({ phase: "idle" });
  }, [record?.id]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDecrypt = useCallback(async () => {
    if (!record) return;
    setPreview({ phase: "fetching" });
    try {
      // Fetch the encrypted ciphertext from IPFS via Pinata's public gateway
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${record.ipfsCid}`);
      if (!res.ok) throw new Error(`IPFS gateway returned ${res.status}. Try again in a moment.`);
      const encryptedBuffer = await res.arrayBuffer();

      setPreview({ phase: "decrypting" });
      const encryptedBytes = new Uint8Array(encryptedBuffer) as Uint8Array<ArrayBuffer>;
      const decryptedBuffer = await decryptPayload(encryptedBytes, record.keyHex, record.ivHex);

      const bytes = new Uint8Array(decryptedBuffer);
      const mime = detectMime(bytes, record.mimeType);
      setPreview({ phase: "done", mime, buffer: decryptedBuffer });
    } catch (err: unknown) {
      setPreview({ phase: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, [record]);

  return (
    <AnimatePresence>
      {record && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-4 top-8 bottom-8 z-50 max-w-2xl mx-auto rounded-2xl flex flex-col overflow-hidden"
            style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, boxShadow: "0 0 60px rgba(0,255,163,0.08), 0 40px 80px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: GLASS_BORDER }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                  <ShieldCheck size={15} style={{ color: MINT }} />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight" style={{ color: SILVER }}>{record.patientName}</p>
                  <p className="text-xs" style={{ color: MUTED }}>{record.recordTitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition hover:opacity-70"
                style={{ color: MUTED }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Verified badge */}
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: "rgba(0,255,163,0.05)", border: `1px solid rgba(0,255,163,0.2)` }}>
                <CheckCircle2 size={14} style={{ color: MINT }} />
                <span className="text-xs font-semibold" style={{ color: MINT }}>Hedera-Verified · AES-256-GCM Encrypted</span>
                <span className="ml-auto text-xs" style={{ color: MUTED }}>{new Date(record.createdAt).toLocaleString()}</span>
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <MetaRow icon={<Hash size={12} />} label="IPFS CID" value={record.ipfsCid} href={`https://gateway.pinata.cloud/ipfs/${record.ipfsCid}`} />
                <MetaRow icon={<Link2 size={12} />} label="HCS Transaction" value={record.hcsTransactionId} href={`https://hashscan.io/testnet/transaction/${record.hcsTransactionId}`} />
                <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,193,7,0.05)", border: "1px solid rgba(255,193,7,0.15)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <KeyRound size={12} style={{ color: "#FFC107" }} />
                    <span className="text-xs font-bold" style={{ color: "#FFC107" }}>Decryption Key (AES-256-GCM)</span>
                  </div>
                  <p className="font-mono text-xs break-all" style={{ color: "#A37F00" }}>{record.keyHex}</p>
                </div>
              </div>

              {/* Decrypt & Preview section */}
              <div className="rounded-2xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: GLASS_BORDER }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MINT }}>Decrypt & Preview</p>

                {preview.phase === "idle" && (
                  <div className="text-center space-y-4">
                    <p className="text-sm" style={{ color: MUTED }}>
                      Fetches the encrypted file from IPFS and decrypts it locally using the stored AES key. Nothing is sent to any server.
                    </p>
                    <button
                      onClick={handleDecrypt}
                      className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold text-sm transition hover:opacity-90"
                      style={{ background: MINT, color: BG, boxShadow: `0 0 20px rgba(0,255,163,0.3)` }}
                    >
                      <ShieldCheck size={15} />
                      Decrypt & View File
                    </button>
                  </div>
                )}

                {(preview.phase === "fetching" || preview.phase === "decrypting") && (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <Loader2 size={28} className="animate-spin" style={{ color: MINT }} />
                    <p className="text-sm" style={{ color: MUTED }}>
                      {preview.phase === "fetching" ? "Fetching encrypted file from IPFS…" : "Decrypting with AES-256-GCM…"}
                    </p>
                  </div>
                )}

                {preview.phase === "error" && (
                  <div className="flex items-start gap-2 rounded-xl p-4" style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)" }}>
                    <AlertCircle size={15} style={{ color: "#FF6B6B" }} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: "#FF6B6B" }}>Decryption failed</p>
                      <p className="text-xs" style={{ color: "#FF6B6B" }}>{preview.message}</p>
                      <button onClick={() => setPreview({ phase: "idle" })} className="text-xs mt-2 underline" style={{ color: MUTED }}>Try again</button>
                    </div>
                  </div>
                )}

                {preview.phase === "done" && (
                  <FilePreview mime={preview.mime} decryptedBuffer={preview.buffer} fileName={record.fileName} />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
