// PatientsPage — Phase 2: full patient registry with deterministic DID generation.
// Patients are persisted to localStorage keyed by hospital DID.
// Registration anchors the patient DID to Hedera HCS as proof of enrollment.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Fingerprint,
  Calendar,
  CreditCard,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Copy,
  Check,
  ExternalLink,
  Search,
  ShieldCheck,
  ChevronDown,
  Link2,
  User,
} from "lucide-react";
import { generatePatientDid, maskGovernmentId } from "@/lib/patientDid";
import { type Patient } from "@/lib/patientStore";
import { submitToHCS } from "@/lib/hedera";

const MINT = "#00FFA3";
const BG = "#05070A";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const MINT_GLASS = "rgba(0,255,163,0.07)";
const MINT_BORDER = "rgba(0,255,163,0.2)";
const GLASS_BG = "rgba(255,255,255,0.025)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";
const BLUE = "#60A5FA";
const BLUE_GLASS = "rgba(96,165,250,0.07)";
const BLUE_BORDER = "rgba(96,165,250,0.2)";

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

// ─── Registration form state ─────────────────────────────────────────────────
interface RegForm {
  fullName: string;
  dateOfBirth: string;
  governmentId: string;
}

type RegStatus =
  | { phase: "idle" }
  | { phase: "generating" }
  | { phase: "anchoring" }
  | { phase: "success"; patient: Patient }
  | { phase: "error"; message: string };

// ─── Live DID preview ────────────────────────────────────────────────────────
function DidPreview({ form }: { form: RegForm }) {
  const [did, setDid] = useState("");
  const ready = form.fullName.trim() && form.dateOfBirth && form.governmentId.trim();

  useEffect(() => {
    if (!ready) { setDid(""); return; }
    generatePatientDid(form.fullName, form.dateOfBirth, form.governmentId)
      .then(setDid);
  }, [form.fullName, form.dateOfBirth, form.governmentId, ready]);

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: did ? MINT_GLASS : "rgba(255,255,255,0.01)",
        border: `1px solid ${did ? MINT_BORDER : GLASS_BORDER}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Fingerprint size={13} style={{ color: did ? MINT : MUTED }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: did ? MINT : MUTED }}>
          Patient DID Preview
        </span>
        {did && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto"
          >
            <CheckCircle2 size={13} style={{ color: MINT }} />
          </motion.span>
        )}
      </div>
      {did ? (
        <div className="flex items-start gap-1">
          <code className="text-xs font-mono break-all flex-1" style={{ color: MINT }}>
            {did}
          </code>
          <CopyBtn value={did} />
        </div>
      ) : (
        <p className="text-xs" style={{ color: "rgba(100,116,139,0.5)" }}>
          Fill all three fields to generate the deterministic DID in real-time
        </p>
      )}
    </div>
  );
}

// ─── Registration Modal ───────────────────────────────────────────────────────
interface RegModalProps {
  onClose: () => void;
  onSuccess: (patient: Patient) => void;
}

function RegisterModal({ onClose, onSuccess }: RegModalProps) {
  const [form, setForm] = useState<RegForm>({ fullName: "", dateOfBirth: "", governmentId: "" });
  const [status, setStatus] = useState<RegStatus>({ phase: "idle" });

  const isLoading = status.phase === "generating" || status.phase === "anchoring";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    try {
      setStatus({ phase: "generating" });
      const did = await generatePatientDid(form.fullName, form.dateOfBirth, form.governmentId);

      setStatus({ phase: "anchoring" });
      let hcsTxId: string | undefined;
      try {
        hcsTxId = await submitToHCS({
          patientName: form.fullName.trim(),
          recordTitle: "PATIENT_REGISTRATION",
          ipfsCid: did,
          timestamp: new Date().toISOString(),
          ivHex: "0".repeat(48),
          encrypted: false,
        });
      } catch {
        // HCS anchoring is best-effort — patient is still registered locally
        hcsTxId = undefined;
      }

      const patient: Patient = {
        id: crypto.randomUUID(),
        did,
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth,
        governmentIdHint: maskGovernmentId(form.governmentId),
        registeredAt: new Date().toISOString(),
        hcsTransactionId: hcsTxId,
      };

      setStatus({ phase: "success", patient });
      onSuccess(patient);
    } catch (err: unknown) {
      setStatus({ phase: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };

  const inputStyle = {
    background: MINT_GLASS,
    border: `1px solid ${MINT_BORDER}`,
    color: SILVER,
    caretColor: MINT,
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.boxShadow = "0 0 0 2px rgba(0,255,163,0.2)");
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.boxShadow = "none");

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-x-4 top-12 bottom-12 z-50 max-w-lg mx-auto rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: "#080C11",
          border: `1px solid ${GLASS_BORDER}`,
          boxShadow: "0 0 60px rgba(0,255,163,0.07), 0 40px 80px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: GLASS_BORDER }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: BLUE_GLASS, border: `1px solid ${BLUE_BORDER}` }}>
              <UserPlus size={15} style={{ color: BLUE }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: SILVER }}>Register New Patient</p>
              <p className="text-xs" style={{ color: MUTED }}>Generates a deterministic Hedera DID</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: MUTED }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {status.phase !== "success" ? (
            <form onSubmit={handleSubmit} id="reg-form" className="space-y-4">

              {/* Privacy note */}
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "rgba(96,165,250,0.05)", border: `1px solid ${BLUE_BORDER}` }}>
                <ShieldCheck size={13} style={{ color: BLUE }} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                  The government ID is used <strong style={{ color: BLUE }}>only</strong> to generate the DID hash — it is never stored. Only a masked hint is kept for display.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: MINT }}>
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="e.g. John Adebayo Smith"
                  required
                  disabled={isLoading}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all disabled:opacity-50"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: MINT }}>
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  required
                  disabled={isLoading}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all disabled:opacity-50"
                  style={{ ...inputStyle, colorScheme: "dark" }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              {/* Government ID */}
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: MINT }}>
                  Government ID Number *
                </label>
                <input
                  type="text"
                  value={form.governmentId}
                  onChange={(e) => setForm((p) => ({ ...p, governmentId: e.target.value }))}
                  placeholder="Passport · National ID · SSN"
                  required
                  disabled={isLoading}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all disabled:opacity-50"
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              {/* Live DID preview */}
              <DidPreview form={form} />

              {/* Error */}
              {status.phase === "error" && (
                <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)" }}>
                  <AlertCircle size={13} style={{ color: "#FF6B6B" }} className="flex-shrink-0 mt-0.5" />
                  <p className="text-xs" style={{ color: "#FF6B6B" }}>{status.message}</p>
                </div>
              )}
            </form>
          ) : (
            // ─── Success ──────────────────────────────────────────────────────
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center py-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
                >
                  <CheckCircle2 size={28} style={{ color: MINT }} />
                </motion.div>
                <p className="font-black text-base" style={{ color: SILVER }}>Patient Registered</p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>
                  {status.patient.hcsTransactionId ? "DID anchored to Hedera HCS" : "Registered locally"}
                </p>
              </div>

              <div className="rounded-xl p-4 space-y-3" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: MINT }}>Patient DID</p>
                  <div className="flex items-start gap-1">
                    <code className="text-xs font-mono break-all flex-1" style={{ color: SILVER }}>{status.patient.did}</code>
                    <CopyBtn value={status.patient.did} />
                  </div>
                </div>
                {status.patient.hcsTransactionId && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: MINT }}>Hedera Proof</p>
                    <div className="flex items-center gap-1">
                      <p className="font-mono text-xs truncate flex-1" style={{ color: SILVER }}>{status.patient.hcsTransactionId}</p>
                      <CopyBtn value={status.patient.hcsTransactionId} />
                    </div>
                    <a
                      href={`https://hashscan.io/testnet/transaction/${status.patient.hcsTransactionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-xs font-semibold hover:underline"
                      style={{ color: MINT }}
                    >
                      <ExternalLink size={10} /> View on HashScan
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: GLASS_BORDER }}>
          {status.phase !== "success" ? (
            <motion.button
              form="reg-form"
              type="submit"
              disabled={isLoading}
              whileHover={!isLoading ? { scale: 1.01 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading ? MINT_GLASS : MINT,
                color: isLoading ? MINT : BG,
                border: isLoading ? `1px solid ${MINT_BORDER}` : "none",
                boxShadow: isLoading ? "none" : "0 0 24px rgba(0,255,163,0.35)",
              }}
            >
              {status.phase === "generating" && <><Loader2 size={14} className="animate-spin" /> Generating DID…</>}
              {status.phase === "anchoring" && <><Loader2 size={14} className="animate-spin" /> Anchoring to Hedera HCS…</>}
              {(status.phase === "idle" || status.phase === "error") && <><ShieldCheck size={14} /> Register & Anchor to Hedera</>}
            </motion.button>
          ) : (
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition hover:opacity-90"
              style={{ background: MINT, color: BG, boxShadow: "0 0 20px rgba(0,255,163,0.3)" }}
            >
              Done
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Patient Card ─────────────────────────────────────────────────────────────
function PatientCard({ patient, recordCount }: { patient: Patient; recordCount: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer"
      style={{ background: GLASS_BG, borderColor: expanded ? BLUE_BORDER : GLASS_BORDER }}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: BLUE_GLASS, border: `1px solid ${BLUE_BORDER}` }}
        >
          <User size={18} style={{ color: BLUE }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: SILVER }}>{patient.fullName}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs" style={{ color: MUTED }}>{patient.dateOfBirth}</span>
            <span className="text-xs" style={{ color: MUTED }}>ID: {patient.governmentIdHint}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: MINT }}>
            {recordCount} record{recordCount !== 1 ? "s" : ""}
          </span>
          {patient.hcsTransactionId && (
            <ShieldCheck size={14} style={{ color: MINT }} aria-label="Anchored to Hedera" />
          )}
          <ChevronDown
            size={14}
            style={{ color: MUTED, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pb-4 space-y-3 border-t pt-3" style={{ borderColor: GLASS_BORDER }}>

              {/* DID */}
              <div className="rounded-xl px-3 py-2.5" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Fingerprint size={11} style={{ color: MINT }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: MINT }}>Patient DID</span>
                </div>
                <div className="flex items-start gap-1">
                  <code className="text-xs font-mono break-all flex-1" style={{ color: SILVER }}>{patient.did}</code>
                  <CopyBtn value={patient.did} />
                </div>
              </div>

              {/* Hedera proof */}
              {patient.hcsTransactionId && (
                <div className="rounded-xl px-3 py-2.5" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Link2 size={11} style={{ color: MINT }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: MINT }}>Hedera Proof of Registration</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="font-mono text-xs truncate flex-1" style={{ color: SILVER }}>{patient.hcsTransactionId}</p>
                    <CopyBtn value={patient.hcsTransactionId} />
                  </div>
                  <a
                    href={`https://hashscan.io/testnet/transaction/${patient.hcsTransactionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-xs font-semibold hover:underline"
                    style={{ color: MINT }}
                  >
                    <ExternalLink size={10} /> View on HashScan
                  </a>
                </div>
              )}

              <p className="text-xs text-right" style={{ color: MUTED }}>
                Registered {new Date(patient.registeredAt).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
interface Props {
  patients: Patient[];
  records: { patientDid?: string }[];
  onAddPatient: (patient: Patient) => void;
}

export function PatientsPage({ patients, records, onAddPatient }: Props) {
  const [showRegModal, setShowRegModal] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = patients.filter((p) =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.dateOfBirth.includes(search) ||
    p.governmentIdHint.includes(search)
  );

  const getRecordCount = (patientDid: string) =>
    records.filter((r) => r.patientDid === patientDid).length;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: BLUE }}>
            Phase 2 · Patient Registry
          </p>
          <h1 className="text-2xl font-black" style={{ color: SILVER }}>Patients</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            Deterministic identity — same DID at every MediLedger Nexus hospital.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowRegModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition flex-shrink-0"
          style={{ background: MINT, color: BG, boxShadow: "0 0 20px rgba(0,255,163,0.25)" }}
        >
          <UserPlus size={15} />
          Register Patient
        </motion.button>
      </div>

      {/* Search */}
      {patients.length > 0 && (
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, date of birth, or ID hint…"
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, color: SILVER, caretColor: MINT }}
            onFocus={(e) => (e.target.style.borderColor = MINT_BORDER)}
            onBlur={(e) => (e.target.style.borderColor = GLASS_BORDER)}
          />
        </div>
      )}

      {/* Stats strip */}
      {patients.length > 0 && (
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
            <Users size={13} style={{ color: BLUE }} />
            <span><strong style={{ color: SILVER }}>{patients.length}</strong> patient{patients.length !== 1 ? "s" : ""} registered</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
            <ShieldCheck size={13} style={{ color: MINT }} />
            <span><strong style={{ color: SILVER }}>{patients.filter(p => p.hcsTransactionId).length}</strong> anchored to Hedera</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
            <Calendar size={13} style={{ color: MUTED }} />
            <span>Last registered {new Date(patients[0]?.registeredAt ?? "").toLocaleDateString()}</span>
          </div>
        </div>
      )}

      {/* Patient list */}
      {patients.length === 0 ? (
        <div
          className="rounded-2xl border p-14 flex flex-col items-center justify-center text-center"
          style={{ background: GLASS_BG, borderColor: GLASS_BORDER, borderStyle: "dashed" }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: BLUE_GLASS, border: `1px solid ${BLUE_BORDER}` }}>
            <Users size={26} style={{ color: BLUE, opacity: 0.6 }} />
          </div>
          <p className="font-semibold text-sm mb-1" style={{ color: MUTED }}>No patients registered yet</p>
          <p className="text-xs mb-5 max-w-xs" style={{ color: "rgba(100,116,139,0.6)" }}>
            Register a patient to generate their deterministic DID — consistent across every hospital on the platform.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRegModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ background: MINT, color: BG, boxShadow: "0 0 20px rgba(0,255,163,0.25)" }}
          >
            <UserPlus size={14} />
            Register First Patient
          </motion.button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: MUTED }}>No patients match "{search}"</p>
          <button onClick={() => setSearch("")} className="text-xs mt-2 underline" style={{ color: MINT }}>Clear search</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PatientCard key={p.id} patient={p} recordCount={getRecordCount(p.did)} />
          ))}
        </div>
      )}

      {/* DID explanation */}
      {patients.length > 0 && (
        <div className="mt-6 rounded-2xl border p-5" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
          <div className="flex items-center gap-2 mb-2">
            <Fingerprint size={14} style={{ color: BLUE }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: BLUE }}>How Patient DIDs Work</p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
            <code className="font-mono" style={{ color: SILVER }}>SHA-256(name · date_of_birth · government_id)</code> →{" "}
            <code className="font-mono" style={{ color: BLUE }}>did:mediledger:patient:[hash]</code>.{" "}
            Any MediLedger Nexus hospital entering the same inputs produces the same DID — enabling instant cross-hospital patient matching without a central registry.
          </p>
        </div>
      )}

      {/* Registration modal */}
      <AnimatePresence>
        {showRegModal && (
          <RegisterModal
            onClose={() => setShowRegModal(false)}
            onSuccess={(patient) => {
              onAddPatient(patient);
              setTimeout(() => setShowRegModal(false), 1800);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
