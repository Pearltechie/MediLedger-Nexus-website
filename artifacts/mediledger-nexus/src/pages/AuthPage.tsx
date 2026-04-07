// AuthPage — smart onboarding with returning-user detection.
//
// Flow:
//   Web3Auth login
//     ↓
//   Check localStorage for existing identity
//     ├── FOUND  → restore session → go to /dashboard  (no form shown)
//     └── NEW    → show hospital-name form → create Hedera account → go to /dashboard

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Loader2,
  ArrowLeft,
  Building2,
  Zap,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { getWeb3Auth, getWeb3AuthUser, getConnectedAddress } from "@/lib/web3auth";
import { checkExistingIdentity, createNewHederaIdentity } from "@/lib/hederaIdentity";
import { useAppStore } from "@/store/appStore";
import logoUrl from "/logo.png";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = "#05070A";
const MINT = "#00FFA3";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const GLASS_BG = "rgba(255,255,255,0.03)";
const GLASS_BORDER = "rgba(255,255,255,0.08)";
const MINT_GLASS = "rgba(0,255,163,0.06)";
const MINT_BORDER = "rgba(0,255,163,0.25)";

function MintButton({
  children,
  onClick,
  loading = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.03 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 px-6 font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: MINT, color: BG, boxShadow: `0 0 28px rgba(0,255,163,0.4)` }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : children}
    </motion.button>
  );
}

// ─── Web3Auth user payload ────────────────────────────────────────────────────
interface LoginPayload {
  address: string | null;
  email: string | null;
  verifierId: string | null;
}

// ─── Step 1 — Web3Auth login ──────────────────────────────────────────────────
function LoginStep({ onSuccess }: { onSuccess: (p: LoginPayload) => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setStatus("loading");
    setError("");
    try {
      const web3auth = getWeb3Auth();
      await web3auth.init();
      const provider = await web3auth.connect();
      if (!provider) throw new Error("Login cancelled or popup was closed.");

      const [userInfo, address] = await Promise.all([
        getWeb3AuthUser(web3auth),
        getConnectedAddress(web3auth),
      ]);

      onSuccess({
        address,
        email: userInfo.email ?? null,
        verifierId: userInfo.verifierId ?? null,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-center mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, boxShadow: `0 0 40px rgba(0,255,163,0.12)` }}
        >
          <Fingerprint size={40} style={{ color: MINT }} />
        </div>
      </div>

      <h2 className="text-2xl font-black text-center mb-2" style={{ color: SILVER }}>
        Verify Your Identity
      </h2>
      <p className="text-sm text-center mb-8" style={{ color: MUTED }}>
        Use a passkey or social login to generate your Hedera-compatible identity. No seed phrase required.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: <Fingerprint size={18} />, label: "Passkey", sub: "Touch ID · Face ID" },
          { icon: <Zap size={18} />, label: "Social Login", sub: "Google · GitHub · X" },
        ].map(({ icon, label, sub }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
            <div className="flex justify-center mb-2" style={{ color: MINT }}>{icon}</div>
            <p className="text-xs font-bold" style={{ color: SILVER }}>{label}</p>
            <p className="text-xs" style={{ color: MUTED }}>{sub}</p>
          </div>
        ))}
      </div>

      <MintButton onClick={handleConnect} loading={status === "loading"}>
        <Wallet size={16} />
        Connect with Web3Auth
      </MintButton>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg p-3" style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)" }}>
          <AlertCircle size={15} style={{ color: "#FF6B6B" }} className="flex-shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: "#FF6B6B" }}>{error}</p>
        </div>
      )}

      <p className="text-xs text-center mt-5" style={{ color: MUTED }}>
        Powered by <span style={{ color: MINT }}>Web3Auth Sapphire Devnet</span>
      </p>
    </motion.div>
  );
}

// ─── Checking state — shown while detecting returning user ────────────────────
function CheckingStep() {
  return (
    <motion.div
      key="checking"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-10 gap-4"
    >
      <Loader2 size={36} className="animate-spin" style={{ color: MINT }} />
      <p className="text-sm" style={{ color: MUTED }}>Checking your identity…</p>
    </motion.div>
  );
}

// ─── Step 2 — Hospital registration (first-time users only) ──────────────────
function RegisterStep({
  loginPayload,
  onSuccess,
}: {
  loginPayload: LoginPayload;
  onSuccess: (name: string) => void;
}) {
  const { setHederaIdentity } = useAppStore();
  const [hospitalName, setHospitalName] = useState("");
  const [phase, setPhase] = useState<"idle" | "creating" | "anchoring" | "done" | "error">("idle");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");

  const shortAuth = loginPayload.email ?? (loginPayload.address
    ? `${loginPayload.address.slice(0, 6)}…${loginPayload.address.slice(-4)}`
    : "Connected");

  const handleRegister = async () => {
    if (!hospitalName.trim()) return;
    setError("");
    setPhase("creating");

    try {
      // Step A — Create Hedera account + DID (uses hospital name as on-chain memo)
      const identity = await createNewHederaIdentity(
        { verifierId: loginPayload.verifierId ?? undefined, email: loginPayload.email ?? undefined },
        loginPayload.address,
        hospitalName.trim()
      );
      setHederaIdentity(identity);

      // Step B — Anchor registration on HCS
      setPhase("anchoring");
      const res = await fetch("/api/hedera/submit-hcs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: "SYSTEM",
          recordTitle: "HOSPITAL_REGISTRATION",
          ipfsCid: identity.accountId,
          timestamp: new Date().toISOString(),
          hospitalName: hospitalName.trim(),
          hederaDid: identity.did,
          eventType: "VAULT_INIT",
        }),
      });

      if (!res.ok) {
        const { error: e } = (await res.json()) as { error: string };
        throw new Error(e ?? "HCS anchor failed.");
      }

      const { transactionId } = (await res.json()) as { transactionId: string };
      setTxId(transactionId);
      setPhase("done");
      setTimeout(() => onSuccess(hospitalName.trim()), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  const loading = phase === "creating" || phase === "anchoring";

  return (
    <motion.div
      key="register"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-center mb-6">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, boxShadow: `0 0 40px rgba(0,255,163,0.12)` }}
        >
          <Building2 size={40} style={{ color: MINT }} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="w-2 h-2 rounded-full" style={{ background: MINT, boxShadow: `0 0 6px ${MINT}` }} />
        <span className="font-mono text-xs" style={{ color: MINT }}>{shortAuth}</span>
        <CheckCircle2 size={13} style={{ color: MINT }} />
      </div>

      <h2 className="text-2xl font-black text-center mb-2" style={{ color: SILVER }}>
        Initialize Your Vault
      </h2>
      <p className="text-sm text-center mb-8" style={{ color: MUTED }}>
        Your Hedera account and DID will be created with your hospital name as the on-chain memo.
        All fees are covered.
      </p>

      <div className="mb-4">
        <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: MINT }}>
          Hospital Name
        </label>
        <input
          type="text"
          value={hospitalName}
          onChange={(e) => setHospitalName(e.target.value)}
          placeholder="e.g. Reddington Hospital"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
          style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: SILVER, caretColor: MINT }}
          onFocus={(e) => (e.target.style.boxShadow = `0 0 0 2px rgba(0,255,163,0.3)`)}
          onBlur={(e) => (e.target.style.boxShadow = "none")}
          disabled={loading || phase === "done"}
        />
      </div>

      {loading && (
        <div className="mb-4 rounded-xl p-4 space-y-2.5" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
          {[
            { label: `Creating Hedera account for "${hospitalName}"`, done: (phase as string) === "anchoring" },
            { label: "Generating DID (did:hedera:testnet:…)", done: (phase as string) === "anchoring" },
            { label: "Anchoring vault on Hedera HCS", done: false },
          ].map(({ label, done }, i) => (
            <div key={i} className="flex items-center gap-2">
              {done
                ? <CheckCircle2 size={13} style={{ color: MINT }} />
                : <Loader2 size={13} className="animate-spin" style={{ color: MINT }} />}
              <span className="text-xs" style={{ color: done ? SILVER : MUTED }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {phase === "done" && (
        <div className="mb-4 rounded-xl p-4" style={{ background: "rgba(0,255,163,0.06)", border: `1px solid rgba(0,255,163,0.3)` }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} style={{ color: MINT }} />
            <span className="text-xs font-bold" style={{ color: MINT }}>Vault initialized on-chain!</span>
          </div>
          <a href={`https://hashscan.io/testnet/transaction/${txId}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs break-all hover:underline" style={{ color: MINT }}>
            {txId}
          </a>
          <p className="text-xs mt-1" style={{ color: MUTED }}>Redirecting to dashboard…</p>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl p-3" style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)" }}>
          <AlertCircle size={14} style={{ color: "#FF6B6B" }} className="flex-shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: "#FF6B6B" }}>{error}</p>
        </div>
      )}

      <MintButton onClick={handleRegister} loading={loading} disabled={!hospitalName.trim() || phase === "done"}>
        {loading
          ? (phase === "creating" ? "Creating Hedera Account…" : "Anchoring on Hedera HCS…")
          : <><Zap size={15} />INITIALIZE VAULT</>
        }
      </MintButton>
    </motion.div>
  );
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────
type AuthStep = "login" | "checking" | "register";

export function AuthPage() {
  const [, setLocation] = useLocation();
  const { setAuth, setHospital, setHederaIdentity } = useAppStore();
  const [step, setStep] = useState<AuthStep>("login");
  const [loginPayload, setLoginPayload] = useState<LoginPayload | null>(null);

  const handleLoginSuccess = async (payload: LoginPayload) => {
    setLoginPayload(payload);
    setAuth(payload.address, payload.email);
    setStep("checking");

    // Check if this user already has a Hedera identity in localStorage
    const existing = checkExistingIdentity(
      { verifierId: payload.verifierId ?? undefined, email: payload.email ?? undefined },
      payload.address
    );

    if (existing) {
      // Returning user — restore session and skip form entirely
      setHederaIdentity(existing);
      setHospital(existing.hospitalName);
      setLocation("/dashboard");
    } else {
      // New user — show hospital name registration
      setStep("register");
    }
  };

  const handleRegisterSuccess = (name: string) => {
    setHospital(name);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: BG }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl opacity-15"
          style={{ width: 600, height: 600, top: -150, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, #00FFA3 0%, transparent 70%)" }}
        />
      </div>

      <button
        onClick={() => setLocation("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs transition hover:opacity-80"
        style={{ color: MUTED }}
      >
        <ArrowLeft size={14} />Back
      </button>

      {/* Logo */}
      <div className="mb-10">
        <img src={logoUrl} alt="MediLedger Nexus" className="h-14 w-auto" style={{ filter: "drop-shadow(0 0 12px rgba(0,255,163,0.3))" }} />
      </div>

      {/* Step indicator — only show for login / register */}
      {step !== "checking" && (
        <div className="flex items-center gap-3 mb-8">
          {["Identity", "Vault"].map((label, i) => {
            const active = (i === 0 && step === "login") || (i === 1 && step === "register");
            const done = i === 0 && step === "register";
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: done ? MINT : active ? MINT_GLASS : "transparent",
                    border: `1px solid ${done || active ? MINT : GLASS_BORDER}`,
                    color: done ? BG : active ? MINT : MUTED,
                  }}
                >
                  {done ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <span className="text-xs" style={{ color: active || done ? SILVER : MUTED }}>{label}</span>
                {i === 0 && <div className="w-8 h-px" style={{ background: step === "register" ? MINT : GLASS_BORDER }} />}
              </div>
            );
          })}
        </div>
      )}

      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, backdropFilter: "blur(20px)", boxShadow: "0 0 60px rgba(0,255,163,0.05), 0 25px 50px rgba(0,0,0,0.5)" }}
      >
        <AnimatePresence mode="wait">
          {step === "login" && <LoginStep key="login" onSuccess={handleLoginSuccess} />}
          {step === "checking" && <CheckingStep key="checking" />}
          {step === "register" && <RegisterStep key="register" loginPayload={loginPayload!} onSuccess={handleRegisterSuccess} />}
        </AnimatePresence>
      </div>

      <p className="text-xs mt-8" style={{ color: "#1E293B" }}>
        Hedera Testnet · IPFS · AES-256-GCM · Web3Auth Sapphire Devnet
      </p>
    </div>
  );
}
