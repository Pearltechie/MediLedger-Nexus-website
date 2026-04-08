// PatientProfilePage — Patient-centric view of profile info + linked records timeline.
// Opened when a patient card is clicked from PatientsPage.
// All existing record/patient state is passed as props — no new state logic introduced.

import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Fingerprint,
  Calendar,
  CreditCard,
  Building2,
  ShieldCheck,
  ExternalLink,
  FileText,
  FolderOpen,
  CheckCircle2,
  Hash,
  Link2,
  Copy,
  Check,
  Eye,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { type Patient } from "@/lib/patientStore";
import { type MedicalRecord } from "@/components/RecordCard";

const MINT = "#00FFA3";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const BLUE = "#60A5FA";
const MINT_GLASS = "rgba(0,255,163,0.07)";
const MINT_BORDER = "rgba(0,255,163,0.2)";
const BLUE_GLASS = "rgba(96,165,250,0.07)";
const BLUE_BORDER = "rgba(96,165,250,0.2)";
const GLASS_BG = "rgba(255,255,255,0.025)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 rounded transition flex-shrink-0"
      style={{ color: copied ? MINT : MUTED }}
      title="Copy"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

// ─── Timeline Record Card ─────────────────────────────────────────────────────
function TimelineCard({
  record,
  onPreview,
  index,
}: {
  record: MedicalRecord;
  onPreview: (record: MedicalRecord) => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative pl-6"
    >
      {/* Timeline connector dot */}
      <div
        className="absolute left-0 top-4 w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
        style={{ background: "#05070A", borderColor: MINT }}
      />

      {/* Card */}
      <div
        className="rounded-2xl border p-4 cursor-pointer transition-all duration-200"
        style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}
        onClick={() => onPreview(record)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,255,163,0.35)";
          (e.currentTarget as HTMLDivElement).style.background = "rgba(0,255,163,0.03)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 20px rgba(0,255,163,0.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = GLASS_BORDER;
          (e.currentTarget as HTMLDivElement).style.background = GLASS_BG;
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
            >
              <FileText size={14} style={{ color: MINT }} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: SILVER }}>
                {record.recordTitle}
              </p>
              {record.fileName && (
                <p className="text-xs truncate" style={{ color: MUTED }}>
                  {record.fileName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} style={{ color: MINT }} />
              <span className="text-xs font-semibold" style={{ color: MINT }}>
                Verified
              </span>
            </div>
            <div
              className="flex items-center gap-1 rounded-full px-2 py-0.5"
              style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
            >
              <Eye size={11} style={{ color: MINT }} />
              <span className="text-xs" style={{ color: MINT }}>
                Preview
              </span>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Hash size={10} style={{ color: MUTED }} />
              <span className="text-xs uppercase tracking-wide font-medium" style={{ color: MUTED }}>
                IPFS CID
              </span>
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${record.ipfsCid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs hover:underline"
                style={{ color: MINT }}
                onClick={(e) => e.stopPropagation()}
              >
                {record.ipfsCid.slice(0, 14)}…
              </a>
              <CopyBtn value={record.ipfsCid} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Link2 size={10} style={{ color: MUTED }} />
              <span className="text-xs uppercase tracking-wide font-medium" style={{ color: MUTED }}>
                HCS Proof
              </span>
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <a
                href={`https://hashscan.io/testnet/transaction/${record.hcsTransactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs hover:underline truncate"
                style={{ color: MINT }}
                onClick={(e) => e.stopPropagation()}
              >
                {record.hcsTransactionId.slice(0, 16)}…
              </a>
              <ExternalLink size={10} style={{ color: MINT }} className="flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 mt-2 pt-2 border-t" style={{ borderColor: GLASS_BORDER }}>
          <Clock size={10} style={{ color: MUTED }} />
          <span className="text-xs" style={{ color: MUTED }}>
            {new Date(record.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
interface Props {
  patient: Patient;
  records: MedicalRecord[];
  hospitalDid: string;
  onBack: () => void;
  onPreview: (record: MedicalRecord) => void;
}

export function PatientProfilePage({ patient, records, hospitalDid, onBack, onPreview }: Props) {
  // Filter and sort records for this patient — newest first
  const patientRecords = records
    .filter((r) => r.patientDid === patient.did)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">

      {/* Back nav */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-sm font-semibold transition hover:opacity-80"
        style={{ color: BLUE }}
      >
        <ArrowLeft size={15} />
        Back to Patients
      </motion.button>

      {/* Page title */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: BLUE }}>
          Patient Profile
        </p>
        <h1 className="text-2xl font-black" style={{ color: SILVER }}>
          {patient.fullName}
        </h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          Registered {new Date(patient.registeredAt).toLocaleDateString()} ·{" "}
          {patientRecords.length} record{patientRecords.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left: Info cards (2 cols) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Patient Information */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border p-5"
            style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: BLUE_GLASS, border: `1px solid ${BLUE_BORDER}` }}
              >
                <User size={15} style={{ color: BLUE }} />
              </div>
              <p className="font-bold text-sm" style={{ color: SILVER }}>
                Patient Information
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <User size={11} style={{ color: MUTED }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>
                    Full Name
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: SILVER }}>
                  {patient.fullName}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar size={11} style={{ color: MUTED }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>
                    Date of Birth
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: SILVER }}>
                  {patient.dateOfBirth}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <CreditCard size={11} style={{ color: MUTED }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>
                    Gov. ID Hint
                  </span>
                </div>
                <p className="text-sm font-mono" style={{ color: SILVER }}>
                  {patient.governmentIdHint}
                </p>
              </div>

              {/* Patient DID */}
              <div className="rounded-xl p-3" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Fingerprint size={11} style={{ color: MINT }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: MINT }}>
                    Patient DID
                  </span>
                </div>
                <div className="flex items-start gap-1">
                  <code className="text-xs font-mono break-all flex-1 leading-relaxed" style={{ color: SILVER }}>
                    {patient.did}
                  </code>
                  <CopyBtn value={patient.did} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hospital Information */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border p-5"
            style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
              >
                <Building2 size={15} style={{ color: MINT }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: SILVER }}>
                  Hospital Information
                </p>
                <p className="text-xs" style={{ color: MUTED }}>
                  Read-only
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Fingerprint size={11} style={{ color: MINT }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: MINT }}>
                  Hospital DID
                </span>
              </div>
              <div className="flex items-start gap-1">
                <code className="text-xs font-mono break-all flex-1 leading-relaxed" style={{ color: SILVER }}>
                  {hospitalDid}
                </code>
                <CopyBtn value={hospitalDid} />
              </div>
            </div>
          </motion.div>

          {/* Hedera Proof */}
          {patient.hcsTransactionId && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
              className="rounded-2xl border p-5"
              style={{ background: MINT_GLASS, borderColor: MINT_BORDER }}
            >
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={14} style={{ color: MINT }} />
                <p className="font-bold text-sm" style={{ color: MINT }}>
                  Hedera Proof of Registration
                </p>
              </div>
              <div className="flex items-center gap-1 mb-2">
                <p className="font-mono text-xs break-all flex-1" style={{ color: SILVER }}>
                  {patient.hcsTransactionId}
                </p>
                <CopyBtn value={patient.hcsTransactionId} />
              </div>
              <a
                href={`https://hashscan.io/testnet/transaction/${patient.hcsTransactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: MINT }}
              >
                <ExternalLink size={10} />
                View on HashScan
              </a>
            </motion.div>
          )}
        </div>

        {/* ── Right: Records Timeline (3 cols) ── */}
        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
                >
                  <FolderOpen size={13} style={{ color: MINT }} />
                </div>
                <h2 className="font-bold text-sm" style={{ color: SILVER }}>
                  Record Timeline
                </h2>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: MINT }}
              >
                {patientRecords.length} record{patientRecords.length !== 1 ? "s" : ""}
              </span>
            </div>

            {patientRecords.length === 0 ? (
              <div
                className="rounded-2xl border p-12 flex flex-col items-center justify-center text-center"
                style={{ background: GLASS_BG, borderColor: GLASS_BORDER, borderStyle: "dashed" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
                >
                  <FolderOpen size={22} style={{ color: MINT, opacity: 0.5 }} />
                </div>
                <p className="font-semibold text-sm mb-1" style={{ color: MUTED }}>
                  No records for this patient
                </p>
                <p className="text-xs" style={{ color: "rgba(100,116,139,0.6)" }}>
                  Upload a record in the Records tab and select this patient
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline vertical line */}
                <div
                  className="absolute left-[4px] top-4 bottom-4 w-px"
                  style={{ background: `linear-gradient(to bottom, ${MINT}, transparent)`, opacity: 0.3 }}
                />
                <div className="space-y-3">
                  {patientRecords.map((record, i) => (
                    <TimelineCard
                      key={record.id}
                      record={record}
                      onPreview={onPreview}
                      index={i}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
