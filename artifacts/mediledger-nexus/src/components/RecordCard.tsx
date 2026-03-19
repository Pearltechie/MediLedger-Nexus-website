// RecordCard — cyber-medical themed record entry.
import { useState } from "react";
import { CheckCircle2, FileText, Hash, Link2, KeyRound, Copy, Check, ExternalLink } from "lucide-react";

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
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
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

export function RecordCard({ record }: { record: MedicalRecord }) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-3 hover:border-[rgba(0,255,163,0.3)] transition-colors duration-200"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}
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
        <div className="flex items-center gap-1 flex-shrink-0">
          <CheckCircle2 size={13} style={{ color: MINT }} />
          <span className="text-xs font-semibold" style={{ color: MINT }}>Verified</span>
        </div>
      </div>

      {/* Key */}
      <div className="rounded-xl p-3" style={{ background: "rgba(255,193,7,0.05)", border: "1px solid rgba(255,193,7,0.15)" }}>
        <div className="flex items-center gap-1 mb-1">
          <KeyRound size={11} style={{ color: "#FFC107" }} />
          <span className="text-xs font-bold" style={{ color: "#FFC107" }}>Decryption Key</span>
        </div>
        <div className="flex items-start gap-1">
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
        <div className="flex items-center gap-1">
          <a
            href={`https://gateway.pinata.cloud/ipfs/${record.ipfsCid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs break-all flex-1 hover:underline"
            style={{ color: MINT }}
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
        <div className="flex items-center gap-1">
          <p className="font-mono text-xs break-all flex-1" style={{ color: SILVER }}>{record.hcsTransactionId}</p>
          <CopyButton value={record.hcsTransactionId} />
        </div>
        <a
          href={`https://hashscan.io/testnet/transaction/${record.hcsTransactionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-1 text-xs font-semibold hover:opacity-80 transition"
          style={{ color: MINT }}
        >
          <ExternalLink size={10} />
          View Proof of Truth on HashScan
        </a>
      </div>

      <p className="text-xs text-right" style={{ color: "#1E293B" }}>
        {new Date(record.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
