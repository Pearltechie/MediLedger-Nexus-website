// RecordCard — cyber-medical themed record entry.
// Clickable: pass onPreview to open the decrypt+preview modal.

import { useState } from "react";
import { CheckCircle2, FileText, Hash, Link2, KeyRound, Copy, Check, ExternalLink, Eye } from "lucide-react";

const MINT = "#00FFA3";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const MINT_GLASS = "rgba(0,255,163,0.05)";
const MINT_BORDER = "rgba(0,255,163,0.18)";

export interface MedicalRecord {
  id: string;
  patientName: string;
  recordTitle: string;
  ipfsCid: string;
  hcsTransactionId: string;
  keyHex: string;
  ivHex: string;
  createdAt: string;
  /** Original file name — used for download and MIME detection fallback */
  fileName?: string;
  /** Original MIME type from File.type — aids preview rendering */
  mimeType?: string;
  /** Linked patient DID from the patient registry (Phase 2+) */
  patientDid?: string;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-1 p-0.5 rounded flex-shrink-0 transition"
      style={{ color: copied ? MINT : MUTED }}
      title="Copy"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

interface RecordCardProps {
  record: MedicalRecord;
  /** If provided the card becomes clickable and shows a preview button */
  onPreview?: (record: MedicalRecord) => void;
}

export function RecordCard({ record, onPreview }: RecordCardProps) {
  const clickable = Boolean(onPreview);

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.07)",
        cursor: clickable ? "pointer" : "default",
      }}
      onClick={() => onPreview?.(record)}
      onMouseEnter={(e) => {
        if (!clickable) return;
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,255,163,0.35)";
        (e.currentTarget as HTMLDivElement).style.background = "rgba(0,255,163,0.03)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 20px rgba(0,255,163,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
          >
            <FileText size={15} style={{ color: MINT }} />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: SILVER }}>{record.patientName}</p>
            <p className="text-xs" style={{ color: MUTED }}>{record.recordTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <CheckCircle2 size={13} style={{ color: MINT }} />
            <span className="text-xs font-semibold" style={{ color: MINT }}>Verified</span>
          </div>
          {clickable && (
            <div
              className="flex items-center gap-1 rounded-full px-2 py-0.5"
              style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
            >
              <Eye size={11} style={{ color: MINT }} />
              <span className="text-xs" style={{ color: MINT }}>Preview</span>
            </div>
          )}
        </div>
      </div>

      {/* Key (truncated) */}
      <div className="rounded-xl p-3" style={{ background: "rgba(255,193,7,0.05)", border: "1px solid rgba(255,193,7,0.15)" }}>
        <div className="flex items-center gap-1 mb-1">
          <KeyRound size={11} style={{ color: "#FFC107" }} />
          <span className="text-xs font-bold" style={{ color: "#FFC107" }}>Decryption Key</span>
        </div>
        <div className="flex items-start gap-1" onClick={(e) => e.stopPropagation()}>
          <p className="font-mono text-xs break-all flex-1" style={{ color: "#A37F00" }}>{record.keyHex.slice(0, 32)}…</p>
          <CopyButton value={record.keyHex} />
        </div>
      </div>

      {/* CID */}
      <div>
        <div className="flex items-center gap-1 mb-0.5">
          <Hash size={11} style={{ color: MUTED }} />
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>IPFS CID</span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <a
            href={`https://gateway.pinata.cloud/ipfs/${record.ipfsCid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs break-all flex-1 hover:underline"
            style={{ color: MINT }}
            onClick={(e) => e.stopPropagation()}
          >
            {record.ipfsCid.slice(0, 20)}…
          </a>
          <CopyButton value={record.ipfsCid} />
        </div>
      </div>

      {/* HCS */}
      <div>
        <div className="flex items-center gap-1 mb-0.5">
          <Link2 size={11} style={{ color: MUTED }} />
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>HCS Transaction</span>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <p className="font-mono text-xs break-all flex-1" style={{ color: SILVER }}>{record.hcsTransactionId}</p>
          <CopyButton value={record.hcsTransactionId} />
        </div>
        <a
          href={`https://hashscan.io/testnet/transaction/${record.hcsTransactionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-1 text-xs font-semibold hover:opacity-80 transition"
          style={{ color: MINT }}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={10} />
          View Proof of Truth on HashScan
        </a>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "#1E293B" }}>
          {new Date(record.createdAt).toLocaleString()}
        </p>
        {record.fileName && (
          <p className="text-xs" style={{ color: "#1E293B" }}>{record.fileName}</p>
        )}
      </div>
    </div>
  );
}
