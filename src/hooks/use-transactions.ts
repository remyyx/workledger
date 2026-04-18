// ============================================
// useTransactions — Transaction Log Hook
// ============================================
// Fetches paginated transaction history.
// Falls back to demo transactions in dev mode.

'use client';

import { useQuery } from '@tanstack/react-query';
import { demoTransactions } from '@/lib/demo-data';
import type { TransactionRecord } from '@/types';

interface TransactionsResponse {
  transactions: TransactionRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchTransactions(page = 1, type?: string): Promise<TransactionsResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  if (type) params.set('type', type);

  const res = await fetch(`/api/wallet/transactions?${params}`);

  if (!res.ok) {
    throw new Error('Failed to fetch transactions');
  }

  return res.json();
}

export function useTransactions(page = 1, type?: string) {
  return useQuery({
    queryKey: ['wallet', 'transactions', page, type || 'all'],
    queryFn: async () => {
      try {
        return await fetchTransactions(page, type);
      } catch {
        // Fallback to demo data
        const filtered = type
          ? demoTransactions.filter(t => t.tx_type === type)
          : demoTransactions;

        return {
          transactions: filtered,
          pagination: { page: 1, limit: 20, total: filtered.length, totalPages: 1 },
        };
      }
    },
    staleTime: 1000,
    retry: false,
  });
}
