// RecordCard displays a single secured medical record entry.
// Shows patient info, IPFS CID, HCS transaction ID, and the decryption key.

import { useState } from "react";
import { CheckCircle2, FileText, Hash, Link2, KeyRound, Copy, Check } from "lucide-react";

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
      className="ml-1 p-0.5 rounded transition hover:bg-black/10 flex-shrink-0"
      title="Copy"
    >
      {copied ? <Check size={11} className="text-green-700" /> : <Copy size={11} className="text-gray-400" />}
    </button>
  );
}

interface RecordCardProps {
  record: MedicalRecord;
}

export function RecordCard({ record }: RecordCardProps) {
  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${record.ipfsCid}`;

  return (
    <div
      className="bg-white rounded-2xl shadow-md p-5 border-l-4 transition-all duration-200 hover:shadow-lg hover:translate-y-[-2px]"
      style={{ borderLeftColor: "#6366F1" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#EEF2FF" }}
          >
            <FileText size={18} style={{ color: "#4F46E5" }} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">{record.patientName}</p>
            <p className="text-gray-500 text-xs">{record.recordTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1" style={{ color: "#16A34A" }}>
          <CheckCircle2 size={16} />
          <span className="text-xs font-semibold">Encrypted & Verified</span>
        </div>
      </div>

      {/* Decryption Key */}
      <div className="mb-2 rounded-lg p-2.5 border" style={{ backgroundColor: "#FEF9C3", borderColor: "#FDE047" }}>
        <div className="flex items-center gap-1 mb-1">
          <KeyRound size={12} className="text-yellow-700" />
          <span className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">Decryption Key</span>
        </div>
        <div className="flex items-start gap-1">
          <p className="font-mono text-xs break-all text-yellow-900 flex-1">{record.keyHex}</p>
          <CopyButton value={record.keyHex} />
        </div>
      </div>

      {/* IPFS CID */}
      <div className="mb-2">
        <div className="flex items-center gap-1 mb-1">
          <Hash size={13} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">IPFS CID (encrypted file)</span>
        </div>
        <div className="flex items-start gap-1">
          <a
            href={ipfsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs break-all rounded px-2 py-1 flex-1 transition-colors hover:opacity-80"
            style={{ backgroundColor: "#EEF2FF", color: "#4F46E5" }}
          >
            {record.ipfsCid}
          </a>
          <CopyButton value={record.ipfsCid} />
        </div>
      </div>

      {/* HCS Transaction */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          <Link2 size={13} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">HCS Transaction</span>
        </div>
        <div className="flex items-start gap-1">
          <a
            href={`https://hashscan.io/testnet/transaction/${record.hcsTransactionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs break-all rounded px-2 py-1 flex-1 transition-colors hover:opacity-80"
            style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}
          >
            {record.hcsTransactionId}
          </a>
          <CopyButton value={record.hcsTransactionId} />
        </div>
      </div>

      <p className="text-gray-400 text-xs text-right">
        {new Date(record.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
