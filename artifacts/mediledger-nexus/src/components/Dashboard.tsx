// Dashboard — cyber-medical themed upload interface.
// Flow: Encrypt → IPFS → Hedera HCS. Requires auth via appStore.

import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import logoUrl from "/logo.png";
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
  ArrowLeft,
  Brain,
  ExternalLink,
  Hash,
  Link2,
  LogOut,
  User,
  Wallet,
  CreditCard,
  Fingerprint,
  Sparkles,
} from "lucide-react";
import { encryptFile } from "@/lib/encryption";
import { uploadToPinata } from "@/lib/pinata";
import { submitToHCS } from "@/lib/hedera";
import { useAppStore } from "@/store/appStore";
import { RecordCard, type MedicalRecord } from "@/components/RecordCard";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = "#05070A";
const MINT = "#00FFA3";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const MINT_GLASS = "rgba(0,255,163,0.06)";
const MINT_BORDER = "rgba(0,255,163,0.2)";
const GLASS_BG = "rgba(255,255,255,0.03)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";

interface FormState {
  patientName: string;
  recordTitle: string;
  file: File | null;
}

type Status =
  | { type: "idle" }
  | { type: "encrypting" }
  | { type: "uploading-ipfs" }
  | { type: "sending-hcs" }
  | { type: "success"; ipfsCid: string; hcsTxId: string; keyHex: string; ivHex: string }
  | { type: "error"; message: string };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-1 p-1 rounded transition flex-shrink-0"
      style={{ color: copied ? MINT : MUTED }}
      title="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function GlassCard({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-6 ${className}`}
      style={{
        background: GLASS_BG,
        borderColor: glow ? MINT_BORDER : GLASS_BORDER,
        boxShadow: glow ? "0 0 30px rgba(0,255,163,0.06)" : "none",
        backdropFilter: "blur(12px)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Hedera Identity Card ──────────────────────────────────────────────────────
function IdentityCard() {
  const { hederaIdentity, userEmail, walletAddress } = useAppStore();

  const rows = [
    {
      icon: <User size={13} />,
      label: "Hospital Email",
      value: userEmail ?? "—",
      mono: false,
    },
    {
      icon: <Wallet size={13} />,
      label: "Wallet Address",
      value: walletAddress ? `${walletAddress.slice(0, 10)}…${walletAddress.slice(-8)}` : "—",
      full: walletAddress ?? "",
      mono: true,
    },
    {
      icon: <CreditCard size={13} />,
      label: "Hedera Account ID",
      value: hederaIdentity?.accountId ?? "—",
      full: hederaIdentity?.accountId ?? "",
      mono: true,
      link: hederaIdentity?.accountId
        ? `https://hashscan.io/testnet/account/${hederaIdentity.accountId}`
        : undefined,
    },
    {
      icon: <Fingerprint size={13} />,
      label: "Hedera DID",
      value: hederaIdentity?.did
        ? `${hederaIdentity.did.slice(0, 32)}…`
        : "—",
      full: hederaIdentity?.did ?? "",
      mono: true,
    },
  ];

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: MINT }} />
          <h2 className="font-bold text-sm" style={{ color: SILVER }}>Hospital Identity</h2>
        </div>
        {hederaIdentity && (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: hederaIdentity.status === "New Identity"
                ? "rgba(0,255,163,0.1)"
                : "rgba(100,116,139,0.15)",
              border: `1px solid ${hederaIdentity.status === "New Identity" ? MINT_BORDER : "rgba(100,116,139,0.3)"}`,
              color: hederaIdentity.status === "New Identity" ? MINT : MUTED,
            }}
          >
            {hederaIdentity.status}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {rows.map(({ icon, label, value, full, mono, link }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl px-4 py-2.5 gap-3"
            style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span style={{ color: MINT }}>{icon}</span>
              <span className="text-xs shrink-0" style={{ color: MUTED }}>{label}</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  title={full ?? value}
                >
                  <span className={`text-xs truncate max-w-[200px] ${mono ? "font-mono" : ""}`} style={{ color: SILVER }}>
                    {value}
                  </span>
                </a>
              ) : (
                <span className={`text-xs truncate max-w-[200px] ${mono ? "font-mono" : ""}`} style={{ color: SILVER }} title={full ?? value}>
                  {value}
                </span>
              )}
              {full && <CopyButton value={full} />}
              {link && <a href={link} target="_blank" rel="noopener noreferrer" className="ml-0.5 flex-shrink-0" style={{ color: MINT }}><ExternalLink size={11} /></a>}
            </div>
          </div>
        ))}
      </div>

      {!hederaIdentity && (
        <p className="text-xs mt-3 text-center" style={{ color: MUTED }}>
          Identity will appear after vault initialization.
        </p>
      )}
    </GlassCard>
  );
}

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { hospitalName, walletAddress, logout } = useAppStore();
  const [form, setForm] = useState<FormState>({ patientName: "", recordTitle: "", file: null });
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm((p) => ({ ...p, file }));
    if (status.type !== "idle") setStatus({ type: "idle" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || !form.patientName.trim() || !form.recordTitle.trim()) return;

    try {
      setStatus({ type: "encrypting" });
      const { keyHex, ivHex, encryptedBytes } = await encryptFile(form.file).catch((err) => {
        throw new Error(`Encryption failed: ${err instanceof Error ? err.message : err}`);
      });

      setStatus({ type: "uploading-ipfs" });
      const ipfsCid = await uploadToPinata(encryptedBytes, form.file.name).catch((err) => {
        throw new Error(`IPFS upload failed: ${err instanceof Error ? err.message : err}`);
      });

      setStatus({ type: "sending-hcs" });
      const hcsTxId = await submitToHCS({
        patientName: form.patientName.trim(),
        recordTitle: form.recordTitle.trim(),
        ipfsCid,
        timestamp: new Date().toISOString(),
        ivHex,
        encrypted: true,
      }).catch((err) => {
        throw new Error(`Hedera HCS failed: ${err instanceof Error ? err.message : err}`);
      });

      const newRecord: MedicalRecord = {
        id: crypto.randomUUID(),
        patientName: form.patientName.trim(),
        recordTitle: form.recordTitle.trim(),
        ipfsCid,
        hcsTransactionId: hcsTxId,
        keyHex,
        ivHex,
        createdAt: new Date().toISOString(),
      };
      setRecords((p) => [newRecord, ...p]);
      setStatus({ type: "success", ipfsCid, hcsTxId, keyHex, ivHex });
      setForm({ patientName: "", recordTitle: "", file: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "An unexpected error occurred." });
    }
  };

  const isLoading = ["encrypting", "uploading-ipfs", "sending-hcs"].includes(status.type);

  const loadingLabel = () => {
    if (status.type === "encrypting") return "Encrypting file locally…";
    if (status.type === "uploading-ipfs") return "Uploading ciphertext to IPFS…";
    if (status.type === "sending-hcs") return "Anchoring proof on Hedera HCS…";
    return "";
  };

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const shortAddr = walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : null;

  return (
    <div className="min-h-screen" style={{ background: BG, color: SILVER }}>

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute rounded-full blur-3xl opacity-10"
          style={{ width: 500, height: 500, top: -100, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, #00FFA3 0%, transparent 70%)" }}
        />
      </div>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ background: "rgba(5,7,10,0.9)", borderColor: GLASS_BORDER }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left — logo + hospital */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="p-2 rounded-lg transition"
              style={{ color: MUTED }}
              title="Back to home"
              onMouseEnter={(e) => (e.currentTarget.style.color = MINT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
            >
              <ArrowLeft size={17} />
            </button>
            <img src={logoUrl} alt="MediLedger Nexus" className="h-11 w-auto" style={{ filter: "drop-shadow(0 0 8px rgba(0,255,163,0.3))" }} />
            <div>
              <p className="text-sm font-black leading-tight" style={{ color: SILVER }}>
                {hospitalName ?? "MediLedger Nexus"}
              </p>
              {shortAddr && (
                <p className="font-mono text-xs" style={{ color: MUTED }}>{shortAddr}</p>
              )}
            </div>
          </div>

          {/* Right — Sentinel AI + logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Brain size={14} style={{ color: MINT }} />
              </motion.div>
              <span className="text-xs font-semibold" style={{ color: MINT }}>Sentinel AI: Active</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: MINT, boxShadow: `0 0 5px ${MINT}` }} />
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg transition"
              style={{ color: MUTED }}
              title="Logout"
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FF6B6B")}
              onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Welcome banner */}
        <div
          className="rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4"
          style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: MINT }}>
              Welcome back
            </p>
            <h1 className="text-xl font-black" style={{ color: SILVER }}>
              {hospitalName ?? "Your Vault"}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              Every upload is AES-256-GCM encrypted, IPFS stored, and Hedera-anchored.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} style={{ color: MINT }} />
            <span className="text-xs font-semibold" style={{ color: MINT }}>Vault Active</span>
          </div>
        </div>

        {/* ── Hedera Identity Card ── */}
        <IdentityCard />

        {/* ── Upload Form ── */}
        <GlassCard glow>
          <h2 className="font-bold text-base mb-1" style={{ color: SILVER }}>Upload & Encrypt Medical Record</h2>
          <p className="text-xs mb-6" style={{ color: MUTED }}>
            Files are <span style={{ color: MINT }}>AES-256-GCM encrypted</span> in your browser before upload. Only ciphertext reaches IPFS.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Patient Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: MINT }}>
                Patient Name
              </label>
              <input
                type="text"
                value={form.patientName}
                onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value }))}
                placeholder="e.g. Jane Doe"
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: SILVER, caretColor: MINT }}
                onFocus={(e) => (e.target.style.boxShadow = `0 0 0 2px rgba(0,255,163,0.25)`)}
                onBlur={(e) => (e.target.style.boxShadow = "none")}
              />
            </div>

            {/* Record Title */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: MINT }}>
                Record Title
              </label>
              <input
                type="text"
                value={form.recordTitle}
                onChange={(e) => setForm((p) => ({ ...p, recordTitle: e.target.value }))}
                placeholder="e.g. Blood Test Results 2024"
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: SILVER, caretColor: MINT }}
                onFocus={(e) => (e.target.style.boxShadow = `0 0 0 2px rgba(0,255,163,0.25)`)}
                onBlur={(e) => (e.target.style.boxShadow = "none")}
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: MINT }}>
                File (PDF or Image)
              </label>
              <div
                className="rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
                style={{ borderColor: MINT_BORDER, background: MINT_GLASS }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0] ?? null;
                  if (file) setForm((p) => ({ ...p, file }));
                }}
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
                    <FileUp size={16} style={{ color: MINT }} />
                    <span className="text-sm font-medium" style={{ color: SILVER }}>{form.file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((p) => ({ ...p, file: null }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="transition"
                      style={{ color: MUTED }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#FF6B6B")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={22} className="mb-2" style={{ color: MINT }} />
                    <p className="text-sm" style={{ color: MUTED }}>
                      Click or drag to select a <span style={{ color: MINT }}>PDF or image</span>
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
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading ? MINT_GLASS : MINT,
                color: isLoading ? MINT : BG,
                border: isLoading ? `1px solid ${MINT_BORDER}` : "none",
                boxShadow: isLoading ? "none" : `0 0 28px rgba(0,255,163,0.4)`,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {loadingLabel()}
                </>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  Encrypt, Upload & Secure
                </>
              )}
            </motion.button>
          </form>

          {/* ── Success ── */}
          {status.type === "success" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-2xl p-5 space-y-4"
              style={{ background: "rgba(0,255,163,0.04)", border: `1px solid rgba(0,255,163,0.25)` }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={17} style={{ color: MINT }} />
                <span className="font-bold text-sm" style={{ color: MINT }}>Encrypted & Anchored on-chain</span>
              </div>

              {/* Key */}
              <div className="rounded-xl p-3" style={{ background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.2)" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <KeyRound size={13} style={{ color: "#FFC107" }} />
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#FFC107" }}>Decryption Key — Save This Now</span>
                </div>
                <p className="text-xs mb-1" style={{ color: "#A37F00" }}>Never stored anywhere — this is your only copy.</p>
                <div className="flex items-start gap-1">
                  <p className="font-mono text-xs break-all flex-1" style={{ color: "#FFC107" }}>{status.keyHex}</p>
                  <CopyButton value={status.keyHex} />
                </div>
              </div>

              {/* IPFS CID */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: MUTED }}>IPFS CID</p>
                <div className="flex items-center gap-1">
                  <Hash size={12} style={{ color: MINT }} />
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${status.ipfsCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs break-all flex-1 hover:underline"
                    style={{ color: MINT }}
                  >
                    {status.ipfsCid}
                  </a>
                  <CopyButton value={status.ipfsCid} />
                </div>
              </div>

              {/* HCS Proof of Truth */}
              <div className="rounded-xl p-3" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Link2 size={13} style={{ color: MINT }} />
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: MINT }}>Proof of Truth — Hedera HCS</span>
                </div>
                <div className="flex items-center gap-1">
                  <p className="font-mono text-xs break-all flex-1" style={{ color: SILVER }}>{status.hcsTxId}</p>
                  <CopyButton value={status.hcsTxId} />
                </div>
                <a
                  href={`https://hashscan.io/testnet/transaction/${status.hcsTxId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold hover:opacity-80 transition"
                  style={{ color: MINT }}
                >
                  <ExternalLink size={11} />
                  View on HashScan
                </a>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {status.type === "error" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl p-4" style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.2)" }}>
              <AlertCircle size={16} style={{ color: "#FF6B6B" }} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm" style={{ color: "#FF6B6B" }}>{status.message}</p>
            </div>
          )}
        </GlassCard>

        {/* ── Record History ── */}
        {records.length > 0 && (
          <div>
            <h2 className="font-bold text-sm mb-4 uppercase tracking-widest" style={{ color: MUTED }}>
              Session Records ({records.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {records.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))}
            </div>
          </div>
        )}

        {records.length === 0 && status.type !== "success" && (
          <div className="text-center py-8">
            <ShieldCheck size={36} className="mx-auto mb-2" style={{ color: "rgba(0,255,163,0.15)" }} />
            <p className="text-xs" style={{ color: "#1E293B" }}>
              Encrypted, Hedera-anchored records will appear here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
