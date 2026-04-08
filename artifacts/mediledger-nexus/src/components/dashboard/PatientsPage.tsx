// PatientsPage — Phase 2 placeholder.

import { Users, Fingerprint, ArrowRight, Lock } from "lucide-react";

const MINT = "#00FFA3";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const GLASS_BG = "rgba(255,255,255,0.025)";
const GLASS_BORDER = "rgba(255,255,255,0.07)";

const FEATURES = [
  { title: "Deterministic Patient DID", desc: "SHA-256 hash of name + DOB + government ID generates a consistent cross-hospital identity — no central database required." },
  { title: "Patient Registry", desc: "Search, filter, and manage your hospital's full patient list with instant DID lookup." },
  { title: "Cross-Hospital Matching", desc: "The same patient DID is produced at any MediLedger Nexus hospital — enabling instant record matching without manual reconciliation." },
  { title: "Biometric Fallback", desc: "Fingerprint or facial scan hash serves as a secondary pathway to the same DID — for emergency patients who cannot provide ID." },
];

export function PatientsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#60A5FA" }}>
          Phase 2 · Coming Next
        </p>
        <h1 className="text-2xl font-black" style={{ color: SILVER }}>Patient Registry</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>
          Deterministic patient identity — no universal ID required.
        </p>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border p-8 mb-6 relative overflow-hidden"
        style={{ background: "rgba(96,165,250,0.04)", borderColor: "rgba(96,165,250,0.2)" }}>
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.4), transparent)" }} />
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
            <Users size={36} style={{ color: "#60A5FA" }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black mb-2" style={{ color: SILVER }}>Universal Patient Identity</h2>
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
              MediLedger Nexus solves the patient identity problem without a government-mandated universal ID.
              A deterministic DID is generated from the patient's name, date of birth, and government document —
              producing the same identifier at every hospital that uses the platform.
            </p>
          </div>
        </div>

        {/* DID preview */}
        <div className="mt-6 rounded-xl p-4" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${GLASS_BORDER}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Example Patient DID</p>
          <code className="text-xs font-mono break-all" style={{ color: "#60A5FA" }}>
            did:mediledger:patient:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
          </code>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border p-5"
            style={{ background: GLASS_BG, borderColor: GLASS_BORDER }}>
            <div className="flex items-center gap-2 mb-2">
              <Fingerprint size={15} style={{ color: "#60A5FA" }} />
              <p className="font-bold text-sm" style={{ color: SILVER }}>{f.title}</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Coming soon banner */}
      <div className="rounded-2xl border p-5 flex items-center gap-4"
        style={{ background: "rgba(96,165,250,0.04)", borderColor: "rgba(96,165,250,0.15)" }}>
        <Lock size={18} style={{ color: "#60A5FA" }} className="flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: SILVER }}>Phase 2 — Patient Registry</p>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            Register patients, generate DIDs, and link records to identities. Building after Phase 1 dashboard is complete.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
          style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
          <ArrowRight size={12} style={{ color: "#60A5FA" }} />
          <span className="text-xs font-semibold" style={{ color: "#60A5FA" }}>Next</span>
        </div>
      </div>
    </div>
  );
}
