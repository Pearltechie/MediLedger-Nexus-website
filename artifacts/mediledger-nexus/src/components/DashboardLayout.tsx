// DashboardLayout — persistent sidebar + top-bar shell for all dashboard pages.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoUrl from "/logo.png";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  MessageSquare,
  Sparkles,
  LogOut,
  Menu,
  X,
  Fingerprint,
  Wallet,
  ChevronRight,
  Zap,
} from "lucide-react";
import type { HederaIdentity } from "@/lib/hederaIdentity";

export type DashboardPage = "overview" | "patients" | "records" | "consult" | "aria";

const BG = "#05070A";
const SIDEBAR_BG = "#070A0E";
const MINT = "#00FFA3";
const SILVER = "#E2E8F0";
const MUTED = "#64748B";
const MINT_GLASS = "rgba(0,255,163,0.07)";
const MINT_BORDER = "rgba(0,255,163,0.2)";
const GLASS_BORDER = "rgba(255,255,255,0.06)";
const ACTIVE_BG = "rgba(0,255,163,0.1)";

interface NavItem {
  id: DashboardPage;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview",  label: "Overview",  icon: <LayoutDashboard size={17} /> },
  { id: "patients",  label: "Patients",  icon: <Users size={17} /> },
  { id: "records",   label: "Records",   icon: <FolderOpen size={17} /> },
  { id: "consult",   label: "Consult",   icon: <MessageSquare size={17} />, badge: "Phase 3" },
  { id: "aria",      label: "ARIA",      icon: <Sparkles size={17} />,     badge: "Phase 4" },
];

interface Props {
  activePage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
  hospitalName: string | null;
  hederaIdentity: HederaIdentity | null;
  walletAddress: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative"
      style={{
        background: active ? ACTIVE_BG : "transparent",
        color: active ? MINT : MUTED,
        border: active ? `1px solid ${MINT_BORDER}` : "1px solid transparent",
        boxShadow: active ? "0 0 16px rgba(0,255,163,0.06)" : "none",
      }}
    >
      <span
        className="flex-shrink-0 transition-colors duration-200"
        style={{ color: active ? MINT : MUTED }}
      >
        {item.icon}
      </span>
      <span className="flex-1 text-left text-sm">{item.label}</span>
      {item.badge && !active && (
        <span
          className="text-xs px-1.5 py-0.5 rounded-md font-medium"
          style={{ background: "rgba(100,116,139,0.12)", color: MUTED, fontSize: 10 }}
        >
          {item.badge}
        </span>
      )}
      {active && (
        <ChevronRight size={13} style={{ color: MINT, opacity: 0.7 }} />
      )}
    </button>
  );
}

export function DashboardLayout({ activePage, onNavigate, hospitalName, hederaIdentity, walletAddress, onLogout, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + hospital */}
      <div className="px-4 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: GLASS_BORDER }}>
        <div className="flex items-center gap-3 mb-4">
          <img
            src={logoUrl}
            alt="MediLedger Nexus"
            className="h-9 w-auto flex-shrink-0"
            style={{ filter: "drop-shadow(0 0 8px rgba(0,255,163,0.4))" }}
          />
          <div className="min-w-0">
            <p className="text-xs font-black leading-tight truncate" style={{ color: SILVER }}>
              {hospitalName ?? "MediLedger Nexus"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>Hospital Dashboard</p>
          </div>
        </div>

        {/* Status pill */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: MINT_GLASS, border: `1px solid ${MINT_BORDER}` }}
        >
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: MINT, boxShadow: `0 0 6px ${MINT}` }}
          />
          <span className="text-xs font-semibold" style={{ color: MINT }}>Vault Active</span>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="ml-auto"
          >
            <Zap size={11} style={{ color: MINT }} />
          </motion.div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs uppercase tracking-widest font-semibold px-3 mb-3" style={{ color: "rgba(100,116,139,0.5)" }}>
          Navigation
        </p>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={activePage === item.id}
            onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
          />
        ))}
      </nav>

      {/* ARIA status */}
      <div className="px-3 pb-3">
        <div
          className="rounded-xl p-3 flex items-center gap-2.5 mb-3"
          style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}
        >
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles size={13} style={{ color: "#A78BFA" }} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold" style={{ color: "#A78BFA" }}>ARIA</p>
            <p className="text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>AI Agent · Standby</p>
          </div>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#A78BFA" }} />
        </div>
      </div>

      {/* Identity + Logout */}
      <div className="px-3 pb-4 border-t pt-3 flex-shrink-0" style={{ borderColor: GLASS_BORDER }}>
        {(shortWallet || hederaIdentity) && (
          <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GLASS_BORDER}` }}>
            {hederaIdentity?.accountId && (
              <div className="flex items-center gap-2 mb-1.5">
                <Fingerprint size={11} style={{ color: MINT }} />
                <span className="font-mono text-xs" style={{ color: SILVER }}>{hederaIdentity.accountId}</span>
              </div>
            )}
            {shortWallet && (
              <div className="flex items-center gap-2">
                <Wallet size={11} style={{ color: MUTED }} />
                <span className="font-mono text-xs" style={{ color: MUTED }}>{shortWallet}</span>
              </div>
            )}
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group"
          style={{ color: MUTED, border: "1px solid transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FF6B6B";
            e.currentTarget.style.background = "rgba(255,107,107,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,107,107,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = MUTED;
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG, color: SILVER }}>

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 600,
            height: 600,
            top: -200,
            left: "20%",
            background: "radial-gradient(circle, rgba(0,255,163,0.04) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 400,
            height: 400,
            bottom: -100,
            right: "10%",
            background: "radial-gradient(circle, rgba(139,92,246,0.03) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r relative z-10"
        style={{ background: SIDEBAR_BG, borderColor: GLASS_BORDER }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col border-r lg:hidden"
              style={{ background: SIDEBAR_BG, borderColor: GLASS_BORDER }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg transition"
                style={{ color: MUTED }}
              >
                <X size={16} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">

        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: "rgba(7,10,14,0.95)", borderColor: GLASS_BORDER, backdropFilter: "blur(12px)" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg transition"
            style={{ color: MUTED }}
          >
            <Menu size={18} />
          </button>
          <img src={logoUrl} alt="MediLedger" className="h-7 w-auto" />
          <span className="text-sm font-bold truncate" style={{ color: SILVER }}>
            {hospitalName ?? "MediLedger Nexus"}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
