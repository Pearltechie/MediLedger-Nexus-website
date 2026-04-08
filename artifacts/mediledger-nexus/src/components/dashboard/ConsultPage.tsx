// ConsultPage — Phase 3: Hospital-to-Hospital Consent System on Hedera HCS.
// All consent lifecycle events (REQUEST / APPROVE / DENY / REVOKE) are written
// to the fixed consent topic 0.0.8554639 and are permanently on-chain.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Inbox,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Loader2,
  X,
  ExternalLink,
  AlertCircle,
  Plus,
  Copy,
  Check,
  Link2,
  Fingerprint,
  Building2,
  User,
  FileText,
  Zap,
} from "lucide-react";
import { type Patient } from "@/lib/patientStore";
import {
  type ConsentRequest,
  type ConsentStatus,
  loadConsents,
  addConsent,
  updateConsent,
} from "@/lib/consentStore";
import { submitConsentToHCS } from "@/lib/consent";

const AMBER = "#F59E0B";
const MINT = "#00FFA3";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const BG = "#05070A";
const AMBER_GLASS = "rgba(245,158,11,0.07)";
const AMBER_BORDER = "rgba(245,158,11,0.2)";
const GLASS_BG = "rgba(255,255,255,0.025)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";
const MINT_GLASS = "rgba(0,255,163,0.07)";
const MINT_BORDER = "rgba(0,255,163,0.2)";

const CONSENT_TOPIC = "0.0.8554639";

type Tab = "incoming" | "outgoing" | "active";

const DURATIONS = [
  { label: "24 hours", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
];

function statusColor(status: ConsentStatus) {
  switch (status) {
    case "pending":  return { bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)",  text: AMBER };
    case "approved": return { bg: "rgba(0,255,163,0.07)",   border: "rgba(0,255,163,0.2)",    text: MINT  };
    case "denied":   return { bg: "rgba(255,107,107,0.07)", border: "rgba(255,107,107,0.2)",  text: "#FF6B6B" };
    case "revoked":  return { bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.2)",  text: MUTED };
    case "expired":  return { bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.2)",  text: MUTED };
  }
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => { e.stopPropagation(); await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded transition flex-shrink-0" style={{ color: copied ? MINT : MUTED }} title="Copy"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

// ─── Consent Card ─────────────────────────────────────────────────────────────
function ConsentCard({
  consent,
  myDid,
  onApprove,
  onDeny,
  onRevoke,
  actionLoading,
}: {
  consent: ConsentRequest;
  myDid: string;
  onApprove: (consent: ConsentRequest, days: number) => void;
  onDeny: (consent: ConsentRequest) => void;
  onRevoke: (consent: ConsentRequest) => void;
  actionLoading: string | null;
}) {
  const [approvingDays, setApprovingDays] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState("14");
  const isLoading = actionLoading === consent.id;
  const sc = statusColor(consent.status);

  const isIncoming = consent.ownerDid === myDid;
  const isPending = consent.status === "pending";
  const isApproved = consent.status === "approved";
  const isExpired = consent.expiresAt && new Date(consent.expiresAt) < new Date();

  const daysLeft = consent.expiresAt
    ? Math.max(0, Math.ceil((new Date(consent.expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: AMBER_GLASS, border: `1px solid ${AMBER_BORDER}` }}>
            <Building2 size={16} style={{ color: AMBER }} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm" style={{ color: SILVER }}>
              {isIncoming ? consent.requesterName : consent.ownerName}
            </p>
            <p className="text-xs truncate" style={{ color: MUTED }}>
              {isIncoming ? "Requesting access" : "Record owner"}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 capitalize"
          style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>
          {isExpired && isApproved ? "expired" : consent.status}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg px-3 py-2" style={{ background: AMBER_GLASS, border: `1px solid ${AMBER_BORDER}` }}>
          <div className="flex items-center gap-1 mb-0.5">
            <User size={10} style={{ color: AMBER }} />
            <span className="font-bold uppercase tracking-widest" style={{ color: AMBER }}>Patient</span>
          </div>
          <p style={{ color: SILVER }}>{consent.patientName}</p>
        </div>
        <div className="rounded-lg px-3 py-2" style={{ background: AMBER_GLASS, border: `1px solid ${AMBER_BORDER}` }}>
          <div className="flex items-center gap-1 mb-0.5">
            <FileText size={10} style={{ color: AMBER }} />
            <span className="font-bold uppercase tracking-widest" style={{ color: AMBER }}>Purpose</span>
          </div>
          <p className="truncate" style={{ color: SILVER }}>{consent.purpose}</p>
        </div>
      </div>

      {/* Expiry / duration */}
      {consent.expiresAt && isApproved && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: daysLeft === 0 ? "rgba(100,116,139,0.07)" : MINT_GLASS, border: `1px solid ${daysLeft === 0 ? "rgba(100,116,139,0.2)" : MINT_BORDER}` }}>
          <Clock size={12} style={{ color: daysLeft === 0 ? MUTED : MINT }} />
          <p className="text-xs" style={{ color: daysLeft === 0 ? MUTED : MINT }}>
            {daysLeft === 0
              ? "Access expired"
              : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining · expires ${new Date(consent.expiresAt).toLocaleDateString()}`}
          </p>
        </div>
      )}
      {isPending && (
        <p className="text-xs" style={{ color: MUTED }}>
          Requested duration: <strong style={{ color: SILVER }}>{consent.accessDurationDays} day{consent.accessDurationDays !== 1 ? "s" : ""}</strong>
        </p>
      )}

      {/* HCS proof */}
      {consent.hcsTransactionId && (
        <div className="flex items-center gap-1.5 rounded-lg px-3 py-2"
          style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
          <Link2 size={10} style={{ color: MINT }} />
          <span className="text-xs font-mono truncate flex-1" style={{ color: MINT }}>
            {consent.hcsTransactionId}
          </span>
          <CopyBtn value={consent.hcsTransactionId} />
          <a href={`https://hashscan.io/testnet/transaction/${consent.hcsTransactionId}`}
            target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <ExternalLink size={10} style={{ color: MINT }} />
          </a>
        </div>
      )}

      <p className="text-xs" style={{ color: MUTED }}>
        {new Date(consent.createdAt).toLocaleString()}
      </p>

      {/* Action area */}
      {isIncoming && isPending && !approvingDays && (
        <div className="flex gap-2 pt-1 border-t" style={{ borderColor: GLASS_BORDER }}>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setApprovingDays(7)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition disabled:opacity-50"
            style={{ background: MINT, color: BG, boxShadow: "0 0 16px rgba(0,255,163,0.25)" }}
          >
            <CheckCircle2 size={13} /> Approve
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => onDeny(consent)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition disabled:opacity-50"
            style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "#FF6B6B" }}
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <><XCircle size={13} /> Deny</>}
          </motion.button>
        </div>
      )}

      {/* Approve duration picker */}
      {isIncoming && isPending && approvingDays !== null && (
        <div className="pt-1 border-t space-y-3" style={{ borderColor: GLASS_BORDER }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: AMBER }}>Set access duration</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button key={d.days}
                onClick={() => setApprovingDays(d.days)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={{
                  background: approvingDays === d.days ? MINT_GLASS : GLASS_BG,
                  border: `1px solid ${approvingDays === d.days ? MINT_BORDER : GLASS_BORDER}`,
                  color: approvingDays === d.days ? MINT : MUTED,
                }}
              >
                {d.label}
              </button>
            ))}
            {/* Custom input */}
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
              style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}>
              <input
                type="number" min={1} max={365}
                value={customDays}
                onChange={(e) => { setCustomDays(e.target.value); setApprovingDays(parseInt(e.target.value) || 1); }}
                className="w-12 text-xs text-center outline-none bg-transparent"
                style={{ color: SILVER, caretColor: AMBER }}
              />
              <span className="text-xs" style={{ color: MUTED }}>days</span>
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => { onApprove(consent, approvingDays); setApprovingDays(null); }}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition disabled:opacity-50"
              style={{ background: MINT, color: BG, boxShadow: "0 0 16px rgba(0,255,163,0.25)" }}
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <><CheckCircle2 size={13} /> Confirm {approvingDays}-Day Access</>}
            </motion.button>
            <button onClick={() => setApprovingDays(null)}
              className="px-4 rounded-xl text-xs transition"
              style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, color: MUTED }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Revoke button for approved consents */}
      {isApproved && !isExpired && (
        <div className="pt-1 border-t" style={{ borderColor: GLASS_BORDER }}>
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => onRevoke(consent)}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition disabled:opacity-50"
            style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)", color: MUTED }}
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <><RotateCcw size={12} /> Revoke Access</>}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

// ─── New Request Modal ────────────────────────────────────────────────────────
interface NewRequestForm {
  targetHospitalDid: string;
  targetHospitalName: string;
  patientDid: string;
  purpose: string;
  durationDays: number;
}

function NewRequestModal({
  myDid,
  myName,
  patients,
  onClose,
  onCreated,
}: {
  myDid: string;
  myName: string;
  patients: Patient[];
  onClose: () => void;
  onCreated: (consent: ConsentRequest) => void;
}) {
  const [form, setForm] = useState<NewRequestForm>({
    targetHospitalDid: "",
    targetHospitalName: "",
    patientDid: "",
    purpose: "",
    durationDays: 7,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedPatient = patients.find((p) => p.did === form.patientDid);

  const inputStyle = {
    background: AMBER_GLASS,
    border: `1px solid ${AMBER_BORDER}`,
    color: SILVER,
    caretColor: AMBER,
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.currentTarget.style.boxShadow = "0 0 0 2px rgba(245,158,11,0.2)");
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.currentTarget.style.boxShadow = "none");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.targetHospitalDid.trim() || !form.patientDid || !form.purpose.trim()) return;
    if (!selectedPatient) return;

    setSubmitting(true);
    setError("");

    const consentId = crypto.randomUUID();
    const now = new Date().toISOString();
    let hcsTxId: string | undefined;

    try {
      hcsTxId = await submitConsentToHCS({
        action: "REQUEST",
        consentId,
        requesterDid: myDid,
        requesterName: myName,
        ownerDid: form.targetHospitalDid.trim(),
        ownerName: form.targetHospitalName.trim() || "Unknown Hospital",
        patientDid: form.patientDid,
        patientName: selectedPatient.fullName,
        purpose: form.purpose.trim(),
        timestamp: now,
        accessDurationDays: form.durationDays,
      });
    } catch {
      hcsTxId = undefined;
    }

    const consent: ConsentRequest = {
      id: consentId,
      direction: "outgoing",
      requesterDid: myDid,
      requesterName: myName,
      ownerDid: form.targetHospitalDid.trim(),
      ownerName: form.targetHospitalName.trim() || "Unknown Hospital",
      patientDid: form.patientDid,
      patientName: selectedPatient.fullName,
      purpose: form.purpose.trim(),
      status: "pending",
      accessDurationDays: form.durationDays,
      createdAt: now,
      updatedAt: now,
      hcsTransactionId: hcsTxId,
    };

    onCreated(consent);
    setSubmitting(false);
    onClose();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }} transition={{ duration: 0.2 }}
        className="fixed inset-x-4 top-10 bottom-10 z-50 max-w-lg mx-auto rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "#080C11", border: `1px solid ${GLASS_BORDER}`, boxShadow: "0 0 60px rgba(245,158,11,0.07), 0 40px 80px rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: GLASS_BORDER }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: AMBER_GLASS, border: `1px solid ${AMBER_BORDER}` }}>
              <Send size={14} style={{ color: AMBER }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: SILVER }}>New Consultation Request</p>
              <p className="text-xs" style={{ color: MUTED }}>Writes a REQUEST event to HCS topic {CONSENT_TOPIC}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: MUTED }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} id="new-request-form" className="space-y-4">

            {/* Target hospital DID */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: AMBER }}>
                Target Hospital DID *
              </label>
              <input type="text"
                value={form.targetHospitalDid}
                onChange={(e) => setForm((p) => ({ ...p, targetHospitalDid: e.target.value }))}
                placeholder="did:hedera:testnet:0.0.xxxxx"
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur}
              />
              <p className="text-xs mt-1" style={{ color: MUTED }}>
                Paste your own hospital DID to demo the full approve/deny flow.
              </p>
            </div>

            {/* Target hospital name */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: AMBER }}>
                Target Hospital Name
              </label>
              <input type="text"
                value={form.targetHospitalName}
                onChange={(e) => setForm((p) => ({ ...p, targetHospitalName: e.target.value }))}
                placeholder="e.g. Lagos General Hospital"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={inputStyle} onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            {/* Patient */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: AMBER }}>
                Patient *
              </label>
              {patients.length > 0 ? (
                <select
                  value={form.patientDid}
                  onChange={(e) => setForm((p) => ({ ...p, patientDid: e.target.value }))}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none"
                  style={{ ...inputStyle, colorScheme: "dark", color: form.patientDid ? SILVER : MUTED }}
                  onFocus={onFocus} onBlur={onBlur}
                >
                  <option value="" disabled>Select a registered patient…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.did}>{p.fullName} — {p.dateOfBirth}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs rounded-xl px-4 py-3" style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, color: MUTED }}>
                  No patients registered. Register patients first in the Patients tab.
                </p>
              )}
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: AMBER }}>
                Clinical Purpose *
              </label>
              <textarea
                value={form.purpose}
                onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                placeholder="e.g. Requesting prior imaging records for surgical planning"
                required
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                style={{ ...inputStyle }}
                onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: AMBER }}>
                Requested Access Duration
              </label>
              <div className="flex gap-2 flex-wrap">
                {DURATIONS.map((d) => (
                  <button key={d.days} type="button"
                    onClick={() => setForm((p) => ({ ...p, durationDays: d.days }))}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition"
                    style={{
                      background: form.durationDays === d.days ? AMBER_GLASS : GLASS_BG,
                      border: `1px solid ${form.durationDays === d.days ? AMBER_BORDER : GLASS_BORDER}`,
                      color: form.durationDays === d.days ? AMBER : MUTED,
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)" }}>
                <AlertCircle size={13} style={{ color: "#FF6B6B" }} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: "#FF6B6B" }}>{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: GLASS_BORDER }}>
          <motion.button
            form="new-request-form" type="submit"
            disabled={submitting || !form.patientDid || !form.targetHospitalDid.trim() || !form.purpose.trim()}
            whileHover={!submitting ? { scale: 1.01 } : {}}
            whileTap={!submitting ? { scale: 0.98 } : {}}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: submitting ? AMBER_GLASS : AMBER,
              color: submitting ? AMBER : BG,
              border: submitting ? `1px solid ${AMBER_BORDER}` : "none",
              boxShadow: submitting ? "none" : "0 0 24px rgba(245,158,11,0.3)",
            }}
          >
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> Anchoring to Hedera HCS…</>
              : <><Send size={14} /> Submit Request to HCS</>}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
interface Props {
  patients: Patient[];
  hospitalDid: string;
  hospitalName: string;
}

export function ConsultPage({ patients, hospitalDid, hospitalName }: Props) {
  const [consents, setConsents] = useState<ConsentRequest[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("incoming");
  const [showNewModal, setShowNewModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (hospitalDid) setConsents(loadConsents(hospitalDid));
  }, [hospitalDid]);

  const incoming = consents.filter((c) => c.ownerDid === hospitalDid && c.status === "pending");
  const outgoing = consents.filter((c) => c.requesterDid === hospitalDid);
  const activeGrants = consents.filter(
    (c) => c.status === "approved" && c.expiresAt && new Date(c.expiresAt) > new Date()
  );

  const handleCreated = (consent: ConsentRequest) => {
    const updated = addConsent(hospitalDid, consent);
    setConsents(updated);
    // If the request is directed at own hospital, also appear as incoming
    if (consent.ownerDid === hospitalDid) {
      const incoming: ConsentRequest = {
        ...consent,
        id: crypto.randomUUID(),
        direction: "incoming",
      };
      const withIncoming = addConsent(hospitalDid, incoming);
      setConsents(withIncoming);
    }
    setActiveTab("outgoing");
  };

  const handleApprove = async (consent: ConsentRequest, days: number) => {
    setActionLoading(consent.id);
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    let hcsTxId: string | undefined;
    try {
      hcsTxId = await submitConsentToHCS({
        action: "APPROVE",
        consentId: consent.id,
        requesterDid: consent.requesterDid,
        requesterName: consent.requesterName,
        ownerDid: consent.ownerDid,
        ownerName: consent.ownerName,
        patientDid: consent.patientDid,
        patientName: consent.patientName,
        purpose: consent.purpose,
        timestamp: new Date().toISOString(),
        accessDurationDays: days,
        expiresAt,
      });
    } catch { hcsTxId = undefined; }

    const updated = updateConsent(hospitalDid, consent.id, {
      status: "approved",
      expiresAt,
      accessDurationDays: days,
      hcsTransactionId: hcsTxId ?? consent.hcsTransactionId,
    });
    setConsents(updated);
    setActionLoading(null);
    setActiveTab("active");
  };

  const handleDeny = async (consent: ConsentRequest) => {
    setActionLoading(consent.id);
    let hcsTxId: string | undefined;
    try {
      hcsTxId = await submitConsentToHCS({
        action: "DENY",
        consentId: consent.id,
        requesterDid: consent.requesterDid,
        requesterName: consent.requesterName,
        ownerDid: consent.ownerDid,
        ownerName: consent.ownerName,
        patientDid: consent.patientDid,
        patientName: consent.patientName,
        purpose: consent.purpose,
        timestamp: new Date().toISOString(),
      });
    } catch { hcsTxId = undefined; }

    const updated = updateConsent(hospitalDid, consent.id, {
      status: "denied",
      hcsTransactionId: hcsTxId ?? consent.hcsTransactionId,
    });
    setConsents(updated);
    setActionLoading(null);
  };

  const handleRevoke = async (consent: ConsentRequest) => {
    setActionLoading(consent.id);
    let hcsTxId: string | undefined;
    try {
      hcsTxId = await submitConsentToHCS({
        action: "REVOKE",
        consentId: consent.id,
        requesterDid: consent.requesterDid,
        requesterName: consent.requesterName,
        ownerDid: consent.ownerDid,
        ownerName: consent.ownerName,
        patientDid: consent.patientDid,
        patientName: consent.patientName,
        purpose: consent.purpose,
        timestamp: new Date().toISOString(),
      });
    } catch { hcsTxId = undefined; }

    const updated = updateConsent(hospitalDid, consent.id, {
      status: "revoked",
      hcsTransactionId: hcsTxId ?? consent.hcsTransactionId,
    });
    setConsents(updated);
    setActionLoading(null);
  };

  const tabs: { id: Tab; label: string; icon: typeof Inbox; count?: number }[] = [
    { id: "incoming", label: "Incoming", icon: Inbox, count: incoming.length },
    { id: "outgoing", label: "Outgoing", icon: Send, count: outgoing.length },
    { id: "active",   label: "Active Grants", icon: ShieldCheck, count: activeGrants.length },
  ];

  const tabContent = {
    incoming,
    outgoing,
    active: activeGrants,
  }[activeTab];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: AMBER }}>
            Phase 3 · Consent System
          </p>
          <h1 className="text-2xl font-black" style={{ color: SILVER }}>Hospital Consultation</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            Privacy-preserving record sharing — all decisions anchored on Hedera HCS.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition flex-shrink-0"
          style={{ background: AMBER, color: BG, boxShadow: "0 0 20px rgba(245,158,11,0.25)" }}
        >
          <Plus size={15} /> New Request
        </motion.button>
      </div>

      {/* Consent topic strip */}
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
        style={{ background: AMBER_GLASS, border: `1px solid ${AMBER_BORDER}` }}>
        <ShieldCheck size={14} style={{ color: AMBER }} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold uppercase tracking-widest mr-2" style={{ color: AMBER }}>Consent Ledger</span>
          <code className="font-mono text-xs" style={{ color: SILVER }}>HCS Topic {CONSENT_TOPIC}</code>
        </div>
        <a href={`https://hashscan.io/testnet/topic/${CONSENT_TOPIC}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold hover:underline flex-shrink-0" style={{ color: AMBER }}>
          <ExternalLink size={11} /> HashScan
        </a>
      </div>

      {/* Hospital DID info */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-6"
        style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}>
        <Fingerprint size={13} style={{ color: MUTED }} className="flex-shrink-0" />
        <p className="text-xs" style={{ color: MUTED }}>
          Your hospital DID:{" "}
          <code className="font-mono" style={{ color: SILVER }}>{hospitalDid || "Not set — authenticate first"}</code>
        </p>
        {hospitalDid && <CopyBtn value={hospitalDid} />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: active ? AMBER_GLASS : "transparent",
                border: `1px solid ${active ? AMBER_BORDER : "transparent"}`,
                color: active ? AMBER : MUTED,
              }}
            >
              <Icon size={13} />
              {tab.label}
              {(tab.count ?? 0) > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: active ? AMBER : "rgba(100,116,139,0.3)", color: active ? BG : MUTED, fontSize: "10px" }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {tabContent.length === 0 ? (
            <div className="rounded-2xl border p-12 flex flex-col items-center justify-center text-center"
              style={{ background: GLASS_BG, borderColor: GLASS_BORDER, borderStyle: "dashed" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: AMBER_GLASS, border: `1px solid ${AMBER_BORDER}` }}>
                {activeTab === "incoming" && <Inbox size={22} style={{ color: AMBER, opacity: 0.5 }} />}
                {activeTab === "outgoing" && <Send size={22} style={{ color: AMBER, opacity: 0.5 }} />}
                {activeTab === "active"   && <ShieldCheck size={22} style={{ color: AMBER, opacity: 0.5 }} />}
              </div>
              {activeTab === "incoming" && (
                <>
                  <p className="font-semibold text-sm mb-1" style={{ color: MUTED }}>No incoming requests</p>
                  <p className="text-xs mb-5 max-w-xs" style={{ color: "rgba(100,116,139,0.6)" }}>
                    To demo the full flow, create a new request using <strong style={{ color: AMBER }}>your own hospital DID</strong> as the target — it will appear here for you to approve or deny.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
                    style={{ background: AMBER, color: BG }}
                  >
                    <Zap size={14} /> Demo Full Flow
                  </motion.button>
                </>
              )}
              {activeTab === "outgoing" && (
                <>
                  <p className="font-semibold text-sm mb-1" style={{ color: MUTED }}>No outgoing requests</p>
                  <p className="text-xs mb-5" style={{ color: "rgba(100,116,139,0.6)" }}>Send a consultation request to another hospital.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
                    style={{ background: AMBER, color: BG }}
                  >
                    <Plus size={14} /> New Request
                  </motion.button>
                </>
              )}
              {activeTab === "active" && (
                <>
                  <p className="font-semibold text-sm mb-1" style={{ color: MUTED }}>No active grants</p>
                  <p className="text-xs" style={{ color: "rgba(100,116,139,0.6)" }}>Approved consents that haven't expired will appear here.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {tabContent.map((consent) => (
                <ConsentCard
                  key={consent.id}
                  consent={consent}
                  myDid={hospitalDid}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                  onRevoke={handleRevoke}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* New Request Modal */}
      <AnimatePresence>
        {showNewModal && (
          <NewRequestModal
            myDid={hospitalDid}
            myName={hospitalName}
            patients={patients}
            onClose={() => setShowNewModal(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
