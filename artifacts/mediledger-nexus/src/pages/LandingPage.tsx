import { useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";
import { useLocation } from "wouter";
import {
  ShieldCheck,
  Fingerprint,
  Lock,
  Globe2,
  Database,
  ChevronRight,
  ArrowRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

// ─── Animation helpers ────────────────────────────────────────────────────────
// Cubic bezier typed as a 4-tuple so framer-motion accepts it as Easing.
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: EASE_OUT },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.6, delay: i * 0.1 },
  }),
};

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Reusable pill badge ──────────────────────────────────────────────────────
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest"
      style={{ borderColor: "#00FFA3", color: "#00FFA3", background: "rgba(0,255,163,0.06)" }}
    >
      {children}
    </span>
  );
}

// ─── Glow button ─────────────────────────────────────────────────────────────
function MintButton({
  children,
  onClick,
  outline = false,
  large = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  outline?: boolean;
  large?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-lg font-semibold transition-all duration-200 ${
        large ? "px-8 py-4 text-base" : "px-5 py-2.5 text-sm"
      }`}
      style={
        outline
          ? {
              border: "1px solid #00FFA3",
              color: "#00FFA3",
              background: "transparent",
              boxShadow: "0 0 12px rgba(0,255,163,0.15)",
            }
          : {
              background: "#00FFA3",
              color: "#05070A",
              boxShadow: "0 0 24px rgba(0,255,163,0.45), 0 0 60px rgba(0,255,163,0.15)",
            }
      }
    >
      {children}
    </motion.button>
  );
}

// ─── Glass card ───────────────────────────────────────────────────────────────
function GlassCard({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-6 backdrop-blur-md ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        borderColor: glow ? "rgba(0,255,163,0.3)" : "rgba(255,255,255,0.07)",
        boxShadow: glow ? "0 0 40px rgba(0,255,163,0.08), inset 0 0 0 1px rgba(0,255,163,0.1)" : "inset 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Stat block ───────────────────────────────────────────────────────────────
function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <GlassCard className="flex flex-col items-center text-center p-8" glow>
      <span
        className="text-4xl font-black tracking-tight mb-1"
        style={{ color: "#00FFA3", textShadow: "0 0 20px rgba(0,255,163,0.5)" }}
      >
        {value}
      </span>
      <span className="text-sm font-semibold" style={{ color: "#E2E8F0" }}>{label}</span>
      {sub && <span className="text-xs mt-1" style={{ color: "#94A3B8" }}>{sub}</span>}
    </GlassCard>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  body,
  index,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  index: number;
}) {
  return (
    <motion.div variants={fadeUp} custom={index}>
      <GlassCard className="h-full group hover:border-[rgba(0,255,163,0.3)] transition-colors duration-300">
        <div
          className="mb-4 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(0,255,163,0.1)", border: "1px solid rgba(0,255,163,0.2)" }}
        >
          <Icon size={22} style={{ color: "#00FFA3" }} />
        </div>
        <h3 className="text-base font-bold mb-2" style={{ color: "#E2E8F0" }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{body}</p>
      </GlassCard>
    </motion.div>
  );
}

// ─── How it works step ────────────────────────────────────────────────────────
function Step({ num, title, body, index }: { num: string; title: string; body: string; index: number }) {
  return (
    <motion.div variants={fadeUp} custom={index} className="flex gap-5">
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{
            background: "rgba(0,255,163,0.1)",
            border: "1px solid rgba(0,255,163,0.4)",
            color: "#00FFA3",
            boxShadow: "0 0 16px rgba(0,255,163,0.2)",
          }}
        >
          {num}
        </div>
        {index < 3 && (
          <div className="w-px flex-1 mt-2" style={{ background: "linear-gradient(to bottom, rgba(0,255,163,0.3), transparent)" }} />
        )}
      </div>
      <div className="pb-10">
        <h4 className="font-bold text-base mb-1" style={{ color: "#E2E8F0" }}>{title}</h4>
        <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{body}</p>
      </div>
    </motion.div>
  );
}

// ─── Problem card ─────────────────────────────────────────────────────────────
function ProblemCard({ stat, label, body, icon: Icon, index }: { stat: string; label: string; body: string; icon: React.ElementType; index: number }) {
  return (
    <motion.div variants={fadeUp} custom={index}>
      <div
        className="rounded-2xl border p-6 h-full"
        style={{
          background: "rgba(255,59,48,0.04)",
          borderColor: "rgba(255,59,48,0.2)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Icon size={18} style={{ color: "#FF6B6B" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#FF6B6B" }}>{label}</span>
        </div>
        <p className="text-3xl font-black mb-2" style={{ color: "#FF6B6B" }}>{stat}</p>
        <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>{body}</p>
      </div>
    </motion.div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export function LandingPage() {
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans" style={{ background: "#05070A", color: "#E2E8F0" }}>

      {/* ── Ambient background glow ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-20"
          style={{ width: 700, height: 700, top: -200, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, #00FFA3 0%, transparent 70%)" }}
        />
        <div
          className="absolute rounded-full blur-3xl opacity-10"
          style={{ width: 500, height: 500, bottom: "20%", right: -100, background: "radial-gradient(circle, #00FFA3 0%, transparent 70%)" }}
        />
      </div>

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-xl" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(5,7,10,0.85)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(0,255,163,0.15)", border: "1px solid rgba(0,255,163,0.3)" }}
            >
              <ShieldCheck size={16} style={{ color: "#00FFA3" }} />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: "#E2E8F0" }}>MediLedger <span style={{ color: "#00FFA3" }}>Nexus</span></span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {["Problem", "Solution", "How It Works", "Features"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-sm transition-colors hover:text-[#00FFA3]"
                style={{ color: "#94A3B8" }}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:block">
            <MintButton onClick={() => setLocation("/auth")}>
              Get Started <ArrowRight size={14} />
            </MintButton>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden" onClick={() => setMenuOpen((o) => !o)} style={{ color: "#E2E8F0" }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t px-6 py-4 flex flex-col gap-4" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(5,7,10,0.97)" }}>
            {["Problem", "Solution", "How It Works", "Features"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setMenuOpen(false)}
                className="text-sm"
                style={{ color: "#94A3B8" }}
              >
                {label}
              </a>
            ))}
            <MintButton onClick={() => setLocation("/auth")}>Get Started <ArrowRight size={14} /></MintButton>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 pt-36 pb-28 px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUp} custom={0} className="mb-6">
            <Pill><Zap size={10} /> Web3 Medical Infrastructure</Pill>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6"
            style={{ color: "#E2E8F0" }}
          >
            Your Health Records.{" "}
            <span
              style={{
                color: "#00FFA3",
                textShadow: "0 0 40px rgba(0,255,163,0.4)",
              }}
            >
              Unbreakable.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-lg md:text-xl leading-relaxed mx-auto max-w-2xl mb-10"
            style={{ color: "#94A3B8" }}
          >
            MediLedger Nexus replaces fragile hospital IDs and vulnerable databases with
            biometric identity, AES-256 encryption, IPFS storage, and Hedera blockchain
            anchoring — creating a patient identity that can't be lost, faked, or stolen.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap items-center justify-center gap-4">
            <MintButton large onClick={() => setLocation("/auth")}>
              Get Started <ArrowRight size={16} />
            </MintButton>
            <MintButton large outline onClick={() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" })}>
              Learn More <ChevronRight size={16} />
            </MintButton>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={fadeIn} custom={5} className="mt-12 flex flex-wrap items-center justify-center gap-6">
            {[
              { label: "IPFS Encrypted Storage" },
              { label: "Hedera HCS Anchored" },
              { label: "AES-256-GCM" },
              { label: "Biometric Ready" },
            ].map(({ label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "#64748B" }}>
                <CheckCircle2 size={13} style={{ color: "#00FFA3" }} />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Hero visual — glowing grid card */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 max-w-3xl mx-auto"
        >
          <GlassCard glow className="p-8 md:p-12">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {["Patient Identity", "IPFS CID", "HCS Timestamp"].map((label, i) => (
                <div
                  key={label}
                  className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(0,255,163,0.05)", border: "1px solid rgba(0,255,163,0.12)" }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: "rgba(0,255,163,0.15)" }}>
                    {i === 0 ? <Fingerprint size={16} style={{ color: "#00FFA3" }} /> : i === 1 ? <Database size={16} style={{ color: "#00FFA3" }} /> : <Lock size={16} style={{ color: "#00FFA3" }} />}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "#00FFA3" }}>{label}</p>
                </div>
              ))}
            </div>
            <div className="h-px w-full mb-6" style={{ background: "linear-gradient(to right, transparent, rgba(0,255,163,0.3), transparent)" }} />
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(0,255,163,0.12)", border: "1px solid rgba(0,255,163,0.3)" }}>
                <ShieldCheck size={18} style={{ color: "#00FFA3" }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "#E2E8F0" }}>Tamper-proof audit trail</p>
                <p className="text-xs" style={{ color: "#64748B" }}>Every record change is timestamped on Hedera consensus — immutable, verifiable, global.</p>
              </div>
              <span
                className="ml-auto text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: "rgba(0,255,163,0.15)", color: "#00FFA3", border: "1px solid rgba(0,255,163,0.3)" }}
              >
                LIVE
              </span>
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* ── Problem ── */}
      <Section id="problem" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} custom={0} className="text-center mb-4">
            <Pill><AlertTriangle size={10} /> The Crisis</Pill>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-black text-center mb-4" style={{ color: "#E2E8F0" }}>
            Healthcare is Broken at its Core
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-center text-base max-w-2xl mx-auto mb-14" style={{ color: "#64748B" }}>
            Two catastrophic failures in modern healthcare cost billions of dollars and endanger millions of lives every year.
          </motion.p>
          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCard
              index={0}
              stat="10–30%"
              label="Identity Crisis"
              icon={AlertTriangle}
              body="Hospitals report duplicate patient records caused by lost cards, name mismatches, or system migrations. Each duplicate risks the wrong treatment, billing errors, and denied insurance claims."
            />
            <ProblemCard
              index={1}
              stat="$7.4M"
              label="Security Crisis"
              icon={Lock}
              body="The average cost of a healthcare data breach in 2024–2025. Healthcare has been the most expensive industry for breaches for over a decade — centralized databases are catastrophic single points of failure."
            />
          </div>
        </div>
      </Section>

      {/* ── Solution ── */}
      <Section id="solution" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} custom={0} className="text-center mb-4">
            <Pill><ShieldCheck size={10} /> The Solution</Pill>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-black text-center mb-4" style={{ color: "#E2E8F0" }}>
            One Infrastructure. <span style={{ color: "#00FFA3" }}>Zero Compromise.</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-center text-base max-w-2xl mx-auto mb-16" style={{ color: "#64748B" }}>
            MediLedger Nexus replaces the two weakest links in healthcare — identity and storage — with cryptographic guarantees that cannot be faked, lost, or stolen.
          </motion.p>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <Stat value="0" label="Duplicate Records" sub="Biometric identity is unique" />
            <Stat value="256-bit" label="AES Encryption" sub="Military-grade, client-side" />
            <Stat value="IPFS" label="Decentralized Storage" sub="No single point of failure" />
            <Stat value="HCS" label="Immutable Audit Log" sub="Hedera consensus timestamping" />
          </div>
        </div>
      </Section>

      {/* ── How it works ── */}
      <Section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} custom={0} className="text-center mb-4">
            <Pill><Zap size={10} /> How It Works</Pill>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-black text-center mb-16" style={{ color: "#E2E8F0" }}>
            From Upload to <span style={{ color: "#00FFA3" }}>Immutable Proof</span>
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <Step index={0} num="01" title="Biometric Patient Identification"
                body="Patient identity is anchored to fingerprint or palm vein scans — not cards, not passwords. One scan links to one permanent record, eliminating duplicates entirely." />
              <Step index={1} num="02" title="Client-Side AES-256-GCM Encryption"
                body="Files are encrypted directly in the browser before leaving the device. The encryption key never touches any server — only ciphertext reaches IPFS. Your data is meaningless to anyone without your key." />
              <Step index={2} num="03" title="Decentralized IPFS Storage"
                body="Encrypted files are pinned to IPFS via a content-addressable hash (CID). There is no central database to breach — the file exists across a distributed network of nodes." />
              <Step index={3} num="04" title="Hedera HCS Timestamping"
                body="The IPFS CID, patient metadata, and initialization vector are anchored to Hedera Consensus Service — providing a cryptographic, tamper-proof timestamp that proves the record existed at that exact moment." />
            </div>

            <motion.div variants={fadeUp} custom={2}>
              <GlassCard glow className="p-6 space-y-3">
                {[
                  { label: "File Selected", done: true },
                  { label: "Encrypted locally (AES-256-GCM)", done: true },
                  { label: "Uploaded to IPFS → CID generated", done: true },
                  { label: "CID anchored on Hedera HCS", done: true },
                  { label: "Audit trail complete", done: true },
                ].map(({ label, done }, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: "rgba(0,255,163,0.04)", border: "1px solid rgba(0,255,163,0.08)" }}>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: done ? "rgba(0,255,163,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${done ? "#00FFA3" : "rgba(255,255,255,0.1)"}` }}
                    >
                      {done && <CheckCircle2 size={12} style={{ color: "#00FFA3" }} />}
                    </div>
                    <span className="text-sm" style={{ color: done ? "#E2E8F0" : "#475569" }}>{label}</span>
                    {i === 4 && (
                      <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,255,163,0.15)", color: "#00FFA3" }}>✓ Verified</span>
                    )}
                  </div>
                ))}
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ── Features ── */}
      <Section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} custom={0} className="text-center mb-4">
            <Pill><Zap size={10} /> Core Capabilities</Pill>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl md:text-5xl font-black text-center mb-16" style={{ color: "#E2E8F0" }}>
            Built for the <span style={{ color: "#00FFA3" }}>Next Era</span> of Healthcare
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard index={0} icon={Fingerprint} title="Biometric Patient Identity"
              body="Fingerprint and palm vein biometrics tie every record to a unique physical identity. No cards, no passwords, no duplicates — ever." />
            <FeatureCard index={1} icon={Lock} title="End-to-End Encryption"
              body="AES-256-GCM encryption runs in the browser before upload. Keys never leave the patient's device. IPFS stores only unreadable ciphertext." />
            <FeatureCard index={2} icon={Database} title="IPFS Decentralized Storage"
              body="Content-addressed storage across a global distributed network. No single server, no single breach surface, no central point of failure." />
            <FeatureCard index={3} icon={ShieldCheck} title="Hedera HCS Audit Trail"
              body="Every record event is anchored to Hedera Consensus Service — a cryptographic, immutable, globally-timestamped proof that cannot be altered." />
            <FeatureCard index={4} icon={Globe2} title="Cross-Hospital Interoperability"
              body="A patient's verified identity works across hospital systems. Authorized providers can access the same secure record without re-registering or guessing." />
            <FeatureCard index={5} icon={Zap} title="Tamper-Proof History"
              body="Every update, access, and change is logged on-chain. Records cannot be silently altered — any modification is immediately detectable and auditable." />
          </div>
        </div>
      </Section>

      {/* ── CTA ── */}
      <Section className="relative z-10 py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div variants={fadeUp} custom={0}>
            <GlassCard glow className="p-12 md:p-16">
              <Pill><ShieldCheck size={10} /> Live on Hedera Testnet</Pill>
              <h2
                className="text-3xl md:text-5xl font-black mt-6 mb-4 leading-tight"
                style={{ color: "#E2E8F0" }}
              >
                Secure Your First Record{" "}
                <span style={{ color: "#00FFA3" }}>Today</span>
              </h2>
              <p className="text-base mb-10" style={{ color: "#64748B" }}>
                Try the live dashboard — encrypt a file, upload to IPFS, and anchor it to Hedera in under 60 seconds. No account required.
              </p>
              <MintButton large onClick={() => setLocation("/auth")}>
                Get Started <ArrowRight size={16} />
              </MintButton>
            </GlassCard>
          </motion.div>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t py-8 px-6" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: "#00FFA3" }} />
            <span className="text-sm font-semibold" style={{ color: "#E2E8F0" }}>MediLedger Nexus</span>
          </div>
          <p className="text-xs" style={{ color: "#334155" }}>
            Built on Hedera HCS + IPFS · AES-256-GCM Encrypted · Web3 Medical Infrastructure
          </p>
          <div className="flex items-center gap-2 text-xs" style={{ color: "#334155" }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#00FFA3", boxShadow: "0 0 6px #00FFA3" }} />
            Testnet Live
          </div>
        </div>
      </footer>
    </div>
  );
}
