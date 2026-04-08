// ConsultPage — Phase 3 placeholder.

import { MessageSquare, Send, Inbox, ShieldCheck, Clock, Lock, ArrowRight } from "lucide-react";

const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const GLASS_BG = "rgba(255,255,255,0.025)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";
const AMBER = "#F59E0B";

const STEPS = [
  {
    step: "01",
    title: "Hospital A Requests",
    desc: "Fills out a consultation request: patient DID, clinical question, urgency, and requesting physician. Written immutably to Hedera HCS topic 0.0.8554639.",
  },
  {
    step: "02",
    title: "Hospital B Reviews",
    desc: "Sees the incoming request in their dashboard. Reviews the clinical question, the requesting hospital's identity, and the urgency level.",
  },
  {
    step: "03",
    title: "Approval with Time Limit",
    desc: "Hospital B approves with a time window — 1 day, 7 days, 30 days, or custom. Approval is anchored on-chain. Access auto-expires.",
  },
  {
    step: "04",
    title: "ARIA Generates Summary",
    desc: "The AI agent decrypts relevant records, produces a structured clinical summary, and delivers it to Hospital A — raw records never leave Hospital B.",
  },
];

export function ConsultPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: AMBER }}>
          Phase 3 · Consent System
        </p>
        <h1 className="text-2xl font-black" style={{ color: SILVER }}>Hospital Consultation</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          Privacy-preserving record sharing between hospitals — powered by Hedera HCS.
        </p>
      </div>

      {/* Two-panel layout preview */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border p-6"
          style={{ background: "rgba(245,158,11,0.04)", borderColor: "rgba(245,158,11,0.2)" }}>
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent)" }} />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Send size={18} style={{ color: AMBER }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: SILVER }}>Request Consultation</p>
              <p className="text-xs" style={{ color: MUTED }}>Hospital A</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
            Select a patient, enter a clinical question, choose the holding hospital, and submit. The request is timestamped on Hedera HCS.
          </p>
        </div>

        <div className="rounded-2xl border p-6"
          style={{ background: "rgba(245,158,11,0.04)", borderColor: "rgba(245,158,11,0.2)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Inbox size={18} style={{ color: AMBER }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: SILVER }}>Incoming Requests</p>
              <p className="text-xs" style={{ color: MUTED }}>Hospital B</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
            See all requests addressed to your hospital DID. Approve with a time limit or deny. Each decision is permanently on-chain.
          </p>
        </div>
      </div>

      {/* Consent topic */}
      <div className="rounded-2xl border p-5 mb-6"
        style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={14} style={{ color: AMBER }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: AMBER }}>Consent Ledger — Hedera HCS Topic</p>
        </div>
        <code className="font-mono text-sm" style={{ color: SILVER }}>0.0.8554639</code>
        <p className="text-xs mt-1" style={{ color: MUTED }}>
          All consent activity — requests, approvals, denials, revocations, and expiries — is written here permanently.
        </p>
      </div>

      {/* Flow steps */}
      <h2 className="font-bold text-sm mb-4 uppercase tracking-widest" style={{ color: MUTED }}>How It Works</h2>
      <div className="space-y-3 mb-6">
        {STEPS.map((s) => (
          <div key={s.step} className="flex gap-4 rounded-2xl border p-5"
            style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
            <span className="text-2xl font-black flex-shrink-0 leading-none" style={{ color: "rgba(245,158,11,0.2)" }}>{s.step}</span>
            <div>
              <p className="font-bold text-sm mb-1" style={{ color: SILVER }}>{s.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon */}
      <div className="rounded-2xl border p-5 flex items-center gap-4"
        style={{ background: "rgba(245,158,11,0.04)", borderColor: "rgba(245,158,11,0.15)" }}>
        <Lock size={18} style={{ color: AMBER }} className="flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: SILVER }}>Phase 3 — Consent System</p>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>Building after Phase 2 patient registry is complete. Uses Hedera HCS topic 0.0.8554639.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <Clock size={12} style={{ color: AMBER }} />
          <span className="text-xs font-semibold" style={{ color: AMBER }}>Soon</span>
        </div>
      </div>
    </div>
  );
}
