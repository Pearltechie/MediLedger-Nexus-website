// RecordCard displays a single secured medical record entry.
// Each card shows patient info, the IPFS CID (proof of file storage),
// and the HCS transaction ID (proof of blockchain anchoring).

import React from "react";
import { CheckCircle2, FileText, Hash, Link2 } from "lucide-react";

export interface MedicalRecord {
  id: string;
  patientName: string;
  recordTitle: string;
  ipfsCid: string;
  hcsTransactionId: string;
  createdAt: string;
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
          <span className="text-xs font-semibold">Verified</span>
        </div>
      </div>

      {/* IPFS Hash */}
      <div className="mb-2">
        <div className="flex items-center gap-1 mb-1">
          <Hash size={13} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">IPFS CID</span>
        </div>
        <a
          href={ipfsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs break-all rounded px-2 py-1 block transition-colors hover:opacity-80"
          style={{ backgroundColor: "#EEF2FF", color: "#4F46E5" }}
          title="View file on IPFS"
        >
          {record.ipfsCid}
        </a>
      </div>

      {/* HCS Transaction ID */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          <Link2 size={13} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">HCS Transaction</span>
        </div>
        <p
          className="font-mono text-xs break-all rounded px-2 py-1"
          style={{ backgroundColor: "#F0FDF4", color: "#15803D" }}
        >
          {record.hcsTransactionId}
        </p>
      </div>

      {/* Timestamp */}
      <p className="text-gray-400 text-xs text-right">
        {new Date(record.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
