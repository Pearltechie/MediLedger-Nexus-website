// AuthPage — two-step onboarding:
//   Step 1: Web3Auth login (passkey / social)
//   Step 2: Hospital registration (first-time users only)
// After login: createOrLoadHederaIdentity runs automatically.

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
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
import { createOrLoadHederaIdentity } from "@/lib/hederaIdentity";
import { useAppStore } from "@/store/appStore";

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

// ─── Step 1 — Web3Auth login ──────────────────────────────────────────────────
interface LoginSuccessPayload {
  address: string | null;
  email: string | null;
  verifierId: string | null;
}

function LoginStep({ onSuccess }: { onSuccess: (payload: LoginSuccessPayload) => void }) {
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
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
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
          { icon: <Fingerprint size={18} />, label: "Passkey", sub: "Touch ID / Face ID" },
          { icon: <Zap size={18} />, label: "Social Login", sub: "Google · GitHub · X" },
        ].map(({ icon, label, sub }) => (
          <div
            key={label}
            className="rounded-xl p-4 text-center"
            style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
          >
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

// ─── Step 2 — Hospital registration + identity creation ───────────────────────
function RegisterStep({
  loginPayload,
  onSuccess,
}: {
  loginPayload: LoginSuccessPayload;
  onSuccess: (name: string) => void;
}) {
  const { setHederaIdentity } = useAppStore();
  const [hospitalName, setHospitalName] = useState("");
  const [txStatus, setTxStatus] = useState<"idle" | "signing" | "submitting" | "done" | "error">("idle");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");

  const shortAddr = loginPayload.address
    ? `${loginPayload.address.slice(0, 6)}…${loginPayload.address.slice(-4)}`
    : loginPayload.email ?? "Connected";

  const handleRegister = async () => {
    if (!hospitalName.trim()) return;
    setTxStatus("signing");
    setError("");

    try {
      // Step A — Create/load Hedera identity
      setTxStatus("submitting");
      const identity = await createOrLoadHederaIdentity(
        { verifierId: loginPayload.verifierId ?? undefined, email: loginPayload.email ?? undefined },
        loginPayload.address
      );
      setHederaIdentity(identity);

      // Step B — Anchor registration on HCS
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
        const { error: e } = await res.json() as { error: string };
        throw new Error(e ?? "Registration anchor failed.");
      }

      const { transactionId } = await res.json() as { transactionId: string };
      setTxId(transactionId);
      setTxStatus("done");
      setTimeout(() => onSuccess(hospitalName.trim()), 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setTxStatus("error");
    }
  };

  const loading = txStatus === "signing" || txStatus === "submitting";

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
        <span className="font-mono text-xs" style={{ color: MINT }}>{shortAddr} connected</span>
        <CheckCircle2 size={13} style={{ color: MINT }} />
      </div>

      <h2 className="text-2xl font-black text-center mb-2" style={{ color: SILVER }}>
        Initialize Your Vault
      </h2>
      <p className="text-sm text-center mb-8" style={{ color: MUTED }}>
        Your Hedera account and DID will be created and anchored on-chain. Transaction fees are fully covered.
      </p>

      <div className="mb-4">
        <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: MINT }}>
          Hospital Name
        </label>
        <input
          type="text"
          value={hospitalName}
          onChange={(e) => setHospitalName(e.target.value)}
          placeholder="e.g. St. Nicholas Hospital"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
          style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}`, color: SILVER, caretColor: MINT }}
          onFocus={(e) => (e.target.style.boxShadow = `0 0 0 2px rgba(0,255,163,0.3)`)}
          onBlur={(e) => (e.target.style.boxShadow = "none")}
          disabled={loading || txStatus === "done"}
        />
      </div>

      {loading && (
        <div className="mb-4 rounded-xl p-4 space-y-2" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
          {[
            { label: "Generating Hedera account", done: txStatus === "submitting" },
            { label: "Creating DID (did:hedera:testnet:…)", done: txStatus === "submitting" },
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

      {txStatus === "done" && (
        <div className="mb-4 rounded-xl p-4" style={{ background: "rgba(0,255,163,0.06)", border: `1px solid rgba(0,255,163,0.3)` }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} style={{ color: MINT }} />
            <span className="text-xs font-bold" style={{ color: MINT }}>Vault initialized on-chain!</span>
          </div>
          <a
            href={`https://hashscan.io/testnet/transaction/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs break-all hover:underline"
            style={{ color: MINT }}
          >
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

      <MintButton
        onClick={handleRegister}
        loading={loading}
        disabled={!hospitalName.trim() || txStatus === "done"}
      >
        {loading ? (txStatus === "signing" ? "Generating Hedera Account…" : "Anchoring on Hedera HCS…") : (
          <><Zap size={15} />INITIALIZE VAULT</>
        )}
      </MintButton>
    </motion.div>
  );
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────
export function AuthPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isRegistered, setAuth, setHospital } = useAppStore();
  const [step, setStep] = useState<"login" | "register">("login");
  const [loginPayload, setLoginPayload] = useState<LoginSuccessPayload | null>(null);

  useEffect(() => {
    if (isAuthenticated && isRegistered) setLocation("/dashboard");
    else if (isAuthenticated && !isRegistered && loginPayload) setStep("register");
  }, [isAuthenticated, isRegistered, loginPayload]);

  const handleLoginSuccess = (payload: LoginSuccessPayload) => {
    setAuth(payload.address, payload.email);
    setLoginPayload(payload);
    setStep("register");
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

      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}>
          <ShieldCheck size={18} style={{ color: MINT }} />
        </div>
        <span className="font-black text-base" style={{ color: SILVER }}>
          MediLedger <span style={{ color: MINT }}>Nexus</span>
        </span>
      </div>

      {/* Step indicator */}
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

      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}`, backdropFilter: "blur(20px)", boxShadow: "0 0 60px rgba(0,255,163,0.05), 0 25px 50px rgba(0,0,0,0.5)" }}
      >
        <AnimatePresence mode="wait">
          {step === "login"
            ? <LoginStep key="login" onSuccess={handleLoginSuccess} />
            : <RegisterStep key="register" loginPayload={loginPayload!} onSuccess={handleRegisterSuccess} />
          }
        </AnimatePresence>
      </div>

      <p className="text-xs mt-8" style={{ color: "#1E293B" }}>
        Hedera Testnet · IPFS · AES-256-GCM · Web3Auth Sapphire Devnet
      </p>
    </div>
  );
}
