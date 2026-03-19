// Zustand global store — holds authentication state and hospital registration.
// Persisted to sessionStorage so a page refresh doesn't force re-login.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AppState {
  // ── Auth ─────────────────────────────────────────────────────────────────
  isAuthenticated: boolean;
  walletAddress: string | null;

  // ── Registration ──────────────────────────────────────────────────────────
  hospitalName: string | null;
  isRegistered: boolean;

  // ── Actions ───────────────────────────────────────────────────────────────
  setAuth: (address: string) => void;
  setHospital: (name: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      walletAddress: null,
      hospitalName: null,
      isRegistered: false,

      setAuth: (address) =>
        set({ isAuthenticated: true, walletAddress: address }),

      setHospital: (name) =>
        set({ hospitalName: name, isRegistered: true }),

      logout: () =>
        set({
          isAuthenticated: false,
          walletAddress: null,
          hospitalName: null,
          isRegistered: false,
        }),
    }),
    {
      name: "mediledger-nexus-session",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
