// ============================================
// Wallet Store — Global State for Wallet
// ============================================
// Zustand is a lightweight state manager.
// Think of a "store" as a shared container that any
// component in the app can read from and write to.

import { create } from 'zustand';
import type { WalletBalance } from '@/types';

type WalletProvider = 'none' | 'xaman' | 'generated';

interface WalletState {
  // State
  address: string | null;
  balances: WalletBalance[];
  isLoading: boolean;
  error: string | null;
  displayCurrency: string; // What currency the user sees prices in
  provider: WalletProvider; // How the wallet was connected

  // Actions
  setAddress: (address: string) => void;
  setBalances: (balances: WalletBalance[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDisplayCurrency: (currency: string) => void;
  setProvider: (provider: WalletProvider) => void;
  connectXaman: (address: string) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  // Initial state
  address: null,
  balances: [],
  isLoading: false,
  error: null,
  displayCurrency: 'RLUSD', // Default display currency
  provider: 'none',

  // Actions (functions that update state)
  setAddress: (address) => set({ address }),
  setBalances: (balances) => set({ balances }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
  setProvider: (provider) => set({ provider }),
  connectXaman: (address) => set({ address, provider: 'xaman', error: null }),
  reset: () => set({
    address: null,
    balances: [],
    isLoading: false,
    error: null,
    provider: 'none',
  }),
}));
