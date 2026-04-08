// ARIAPage — Phase 4 placeholder. ARIA = Autonomous Record Intelligence Agent.

import { motion } from "framer-motion";
import { Sparkles, Brain, ShieldCheck, FileText, Hash, Lock, Zap } from "lucide-react";

const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const GLASS_BG = "rgba(255,255,255,0.025)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";
const VIOLET = "#A78BFA";

const CAPABILITIES = [
  {
    icon: <ShieldCheck size={16} />,
    title: "Privacy-Preserving",
    desc: "Hospital A never sees raw records. ARIA reads, summarises, and delivers clinical intelligence — not data.",
  },
  {
    icon: <FileText size={16} />,
    title: "Structured Clinical Summary",
    desc: "Patient overview · Direct answer to the clinical question · Relevant history · Medications · Recent investigations.",
  },
  {
    icon: <Hash size={16} />,
    title: "Cryptographic Proof",
    desc: "Every summary is hashed and anchored to Hedera HCS. Hospital A can verify exactly which records were used.",
  },
  {
    icon: <Zap size={16} />,
    title: "Powered by Claude",
    desc: "Anthropic Claude chosen for precision, structured output reliability, and conservative medical safety posture.",
  },
];

export function ARIAPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: VIOLET }}>
          Phase 4 · AI Clinical Intelligence
        </p>
        <h1 className="text-2xl font-black" style={{ color: SILVER }}>ARIA</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          Autonomous Record Intelligence Agent — shares intelligence, not data.
        </p>
      </div>

      {/* Hero */}
      <div className="rounded-2xl border p-8 mb-6 relative overflow-hidden"
        style={{ background: "rgba(167,139,250,0.04)", borderColor: "rgba(167,139,250,0.2)" }}>
        <div className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.5), transparent)" }} />

        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Animated ARIA orb */}
          <div className="relative flex-shrink-0">
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: `radial-gradient(circle, ${VIOLET}40 0%, transparent 70%)` }}
            />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "rgba(167,139,250,0.08)", border: "2px solid rgba(167,139,250,0.25)" }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border"
                style={{ borderColor: "rgba(167,139,250,0.15)", borderTopColor: VIOLET, borderStyle: "dashed" }}
              />
              <Brain size={32} style={{ color: VIOLET }} />
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-xl font-black mb-3" style={{ color: SILVER }}>
              The AI layer that makes interoperability safe
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              When Hospital B approves a consultation request, ARIA decrypts the relevant IPFS records server-side,
              generates a structured clinical summary using Claude, and delivers it to Hospital A with a
              cryptographic proof of what was shared. Raw records never leave Hospital B's encrypted vault.
            </p>
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {CAPABILITIES.map((c) => (
          <div key={c.title} className="rounded-2xl border p-5"
            style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: VIOLET }}>{c.icon}</span>
              <p className="font-bold text-sm" style={{ color: SILVER }}>{c.title}</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Sample summary preview */}
      <div className="rounded-2xl border p-6 mb-6" style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} style={{ color: VIOLET }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: VIOLET }}>Sample ARIA Clinical Summary</p>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: VIOLET }}>
            Preview
          </span>
        </div>

        <div className="space-y-3 opacity-60">
          {[
            { label: "Patient Overview", value: "Male, 58 years. Primary diagnosis: Hypertensive heart disease (I11.0). Known type 2 diabetes mellitus." },
            { label: "Answer to Clinical Question", value: "Patient has one prior cardiac intervention: percutaneous coronary intervention (PCI) of the LAD artery in 2019. No complications on record." },
            { label: "Current Medications", value: "Metformin 500mg BD · Amlodipine 5mg OD · Aspirin 75mg OD · Atorvastatin 40mg ON" },
            { label: "Source Verification", value: "Based on 3 records · CIDs anchored to Hedera HCS · Summary hash: 0x4a2f…" },
          ].map((row) => (
            <div key={row.label} className="rounded-xl p-3" style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.1)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: VIOLET }}>{row.label}</p>
              <p className="text-xs" style={{ color: MUTED }}>{row.value}</p>
            </div>
          ))}
        </div>

        <p className="text-xs mt-3 italic" style={{ color: "rgba(100,116,139,0.5)" }}>
          ⚠ Clinical decision-support only. Does not replace clinical judgment.
        </p>
      </div>

      {/* Coming soon */}
      <div className="rounded-2xl border p-5 flex items-center gap-4"
        style={{ background: "rgba(167,139,250,0.04)", borderColor: "rgba(167,139,250,0.15)" }}>
        <Lock size={18} style={{ color: VIOLET }} className="flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: SILVER }}>Phase 4 — ARIA Clinical Intelligence</p>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            Building after the Phase 3 consent system is complete. Will use Claude (Anthropic) via Replit AI integrations.
          </p>
        </div>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: VIOLET }}
        />
      </div>
    </div>
  );
}
