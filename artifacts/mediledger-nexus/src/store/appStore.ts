// Zustand global store — auth + hospital registration + Hedera identity.
// Persisted to sessionStorage so a page refresh doesn't force re-login.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HederaIdentity } from "@/lib/hederaIdentity";

export interface AppState {
  // ── Auth ─────────────────────────────────────────────────────────────────
  isAuthenticated: boolean;
  walletAddress: string | null;
  userEmail: string | null;

  // ── Registration ──────────────────────────────────────────────────────────
  hospitalName: string | null;
  isRegistered: boolean;

  // ── Hedera Identity ───────────────────────────────────────────────────────
  hederaIdentity: HederaIdentity | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  setAuth: (address: string | null, email?: string | null) => void;
  setHospital: (name: string) => void;
  setHederaIdentity: (identity: HederaIdentity) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      walletAddress: null,
      userEmail: null,
      hospitalName: null,
      isRegistered: false,
      hederaIdentity: null,

      setAuth: (address, email) =>
        set({ isAuthenticated: true, walletAddress: address, userEmail: email ?? null }),

      setHospital: (name) =>
        set({ hospitalName: name, isRegistered: true }),

      setHederaIdentity: (identity) =>
        set({ hederaIdentity: identity }),

      logout: () =>
        set({
          isAuthenticated: false,
          walletAddress: null,
          userEmail: null,
          hospitalName: null,
          isRegistered: false,
          hederaIdentity: null,
        }),
    }),
    {
      name: "mediledger-nexus-session",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
