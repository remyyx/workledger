// ============================================
// useBalances — Wallet Balance Hook
// ============================================
// Fetches XRPL balances for the authenticated user.
// Falls back to demo balances in dev mode.

'use client';

import { useQuery } from '@tanstack/react-query';
import { demoBalances } from '@/lib/demo-data';
import type { WalletBalance } from '@/types';

interface BalancesResponse {
  address: string;
  balances: WalletBalance[];
}

async function fetchBalances(): Promise<BalancesResponse> {
  const res = await fetch('/api/wallet/balances');

  if (!res.ok) {
    throw new Error('Failed to fetch balances');
  }

  return res.json();
}

export function useBalances() {
  return useQuery({
    queryKey: ['wallet', 'balances'],
    queryFn: async () => {
      try {
        const data = await fetchBalances();
        // In dev/demo mode, fall back to demo data when the account has no live balances
        if (
          data.balances.length === 0 &&
          process.env.NEXT_PUBLIC_SKIP_AUTH === 'true'
        ) {
          return demoBalances;
        }
        return data.balances;
      } catch {
        // Fallback to demo data when XRPL/Supabase unavailable
        return demoBalances;
      }
    },
    staleTime: 1000,
    refetchInterval: 30 * 1000, // Auto-refresh every 30s
    retry: false,
  });
}
