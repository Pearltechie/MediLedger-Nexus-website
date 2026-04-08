// OverviewPage — stats, identity, and recent activity.

import { motion } from "framer-motion";
import {
  FolderOpen,
  Users,
  MessageSquare,
  ShieldCheck,
  Fingerprint,
  Wallet,
  User,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { HederaIdentity } from "@/lib/hederaIdentity";
import type { MedicalRecord } from "@/components/RecordCard";
import type { DashboardPage } from "@/components/DashboardLayout";

const MINT = "#00FFA3";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const MINT_GLASS = "rgba(0,255,163,0.06)";
const MINT_BORDER = "rgba(0,255,163,0.18)";
const GLASS_BG = "rgba(255,255,255,0.025)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 rounded transition flex-shrink-0"
      style={{ color: copied ? MINT : MUTED }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  onClick?: () => void;
}

function StatCard({ icon, label, value, sub, color = MINT, onClick }: StatCardProps) {
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.015 } : {}}
      onClick={onClick}
      className="rounded-2xl border p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{
        background: GLASS_BG,
        borderColor: GLASS_BORDER,
        cursor: onClick ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        (e.currentTarget as HTMLDivElement).style.borderColor = `${color}33`;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px ${color}0A`;
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        (e.currentTarget as HTMLDivElement).style.borderColor = GLASS_BORDER;
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}33, transparent)` }}
      />
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}12`, border: `1px solid ${color}25` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        {onClick && <ArrowRight size={14} style={{ color: MUTED, opacity: 0.5 }} />}
      </div>
      <div>
        <p className="text-2xl font-black" style={{ color: SILVER }}>{value}</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: MUTED }}>{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color: `${color}99` }}>{sub}</p>}
      </div>
    </motion.div>
  );
}

interface Props {
  records: MedicalRecord[];
  hederaIdentity: HederaIdentity | null;
  hospitalName: string | null;
  userEmail: string | null;
  walletAddress: string | null;
  onNavigate: (page: DashboardPage) => void;
}

export function OverviewPage({ records, hederaIdentity, hospitalName, userEmail, walletAddress, onNavigate }: Props) {
  const identityRows = [
    {
      icon: <User size={12} />,
      label: "Email",
      value: userEmail ?? "—",
      full: userEmail ?? "",
      mono: false,
    },
    {
      icon: <Wallet size={12} />,
      label: "Wallet",
      value: walletAddress ? `${walletAddress.slice(0, 10)}…${walletAddress.slice(-8)}` : "—",
      full: walletAddress ?? "",
      mono: true,
    },
    {
      icon: <CreditCard size={12} />,
      label: "Hedera ID",
      value: hederaIdentity?.accountId ?? "—",
      full: hederaIdentity?.accountId ?? "",
      mono: true,
      link: hederaIdentity?.accountId
        ? `https://hashscan.io/testnet/account/${hederaIdentity.accountId}`
        : undefined,
    },
    {
      icon: <Fingerprint size={12} />,
      label: "DID",
      value: hederaIdentity?.did ? `${hederaIdentity.did.slice(0, 28)}…` : "—",
      full: hederaIdentity?.did ?? "",
      mono: true,
    },
  ];

  const recentRecords = records.slice(0, 4);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: MINT }}>
          Dashboard
        </p>
        <h1 className="text-2xl font-black" style={{ color: SILVER }}>
          {hospitalName ?? "Your Vault"}
        </h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          Every record is AES-256-GCM encrypted, IPFS-stored, and Hedera-anchored.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Total Records"
          value={records.length}
          sub={records.length > 0 ? "Hedera-verified" : "No records yet"}
          color={MINT}
          onClick={() => onNavigate("records")}
        />
        <StatCard
          icon={<Users size={18} />}
          label="Patients"
          value={0}
          sub="Registry coming soon"
          color="#60A5FA"
          onClick={() => onNavigate("patients")}
        />
        <StatCard
          icon={<MessageSquare size={18} />}
          label="Active Consults"
          value={0}
          sub="Consent system Phase 3"
          color="#F59E0B"
          onClick={() => onNavigate("consult")}
        />
        <StatCard
          icon={<ShieldCheck size={18} />}
          label="On-chain Proofs"
          value={records.length}
          sub={records.length > 0 ? "Immutable · Hashscan" : "Upload to generate"}
          color="#A78BFA"
        />
      </div>

      {/* Lower grid: identity + recent activity */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Hospital Identity */}
        <div className="rounded-2xl border p-6" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
              <Sparkles size={13} style={{ color: MINT }} />
            </div>
            <h2 className="font-bold text-sm" style={{ color: SILVER }}>Hospital Identity</h2>
            {hederaIdentity && (
              <span
                className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: hederaIdentity.status === "New Identity" ? MINT_GLASS : "rgba(100,116,139,0.12)",
                  border: `1px solid ${hederaIdentity.status === "New Identity" ? MINT_BORDER : "rgba(100,116,139,0.2)"}`,
                  color: hederaIdentity.status === "New Identity" ? MINT : MUTED,
                }}
              >
                {hederaIdentity.status}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {identityRows.map(({ icon, label, value, full, mono, link }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 gap-2"
                style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
              >
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span style={{ color: MINT }}>{icon}</span>
                  <span className="text-xs" style={{ color: MUTED }}>{label}</span>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs truncate max-w-[160px] hover:underline ${mono ? "font-mono" : ""}`}
                      style={{ color: SILVER }}
                      title={full ?? value}
                    >
                      {value}
                    </a>
                  ) : (
                    <span
                      className={`text-xs truncate max-w-[160px] ${mono ? "font-mono" : ""}`}
                      style={{ color: SILVER }}
                      title={full ?? value}
                    >
                      {value}
                    </span>
                  )}
                  {full && <CopyBtn value={full} />}
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: MINT }}>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border p-6" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
                <TrendingUp size={13} style={{ color: "#60A5FA" }} />
              </div>
              <h2 className="font-bold text-sm" style={{ color: SILVER }}>Recent Activity</h2>
            </div>
            {records.length > 0 && (
              <button
                onClick={() => onNavigate("records")}
                className="text-xs font-semibold flex items-center gap-1 hover:underline"
                style={{ color: MINT }}
              >
                View all <ArrowRight size={11} />
              </button>
            )}
          </div>

          {recentRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
              >
                <FileText size={22} style={{ color: MINT, opacity: 0.5 }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: MUTED }}>No records yet</p>
              <p className="text-xs mt-1 mb-4" style={{ color: "rgba(100,116,139,0.6)" }}>
                Upload your first encrypted medical record
              </p>
              <button
                onClick={() => onNavigate("records")}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition"
                style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: MINT }}
              >
                Go to Records <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GLASS_BORDER}` }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
                  >
                    <FileText size={13} style={{ color: MINT }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" style={{ color: SILVER }}>{r.patientName}</p>
                    <p className="text-xs truncate" style={{ color: MUTED }}>{r.recordTitle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: MUTED }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <ShieldCheck size={10} style={{ color: MINT }} />
                      <span className="text-xs" style={{ color: MINT }}>Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
