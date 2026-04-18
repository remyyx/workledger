// ============================================
// useContracts — Contract List Hook
// ============================================
// Fetches paginated contracts with optional status filter.
// Falls back to demo contracts in dev mode.

'use client';

import { useQuery } from '@tanstack/react-query';
import { demoContracts } from '@/lib/demo-data';
import type { Contract, ContractStatus } from '@/types';

interface ContractsResponse {
  contracts: Contract[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchContracts(status?: string, page = 1): Promise<ContractsResponse> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  params.set('page', String(page));

  const res = await fetch(`/api/contracts?${params}`);

  if (!res.ok) {
    throw new Error('Failed to fetch contracts');
  }

  return res.json();
}

export function useContracts(status?: string, page = 1) {
  return useQuery({
    queryKey: ['contracts', status || 'all', page],
    queryFn: async () => {
      try {
        const data = await fetchContracts(status, page);
        return data;
      } catch {
        // Fallback: filter demo data client-side
        const filtered = status && status !== 'all'
          ? demoContracts.filter(c => c.status === status)
          : demoContracts;

        return {
          contracts: filtered,
          pagination: { page: 1, limit: 20, total: filtered.length, totalPages: 1 },
        };
      }
    },
    staleTime: 1000,
    retry: false,
  });
}
