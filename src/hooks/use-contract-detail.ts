// ============================================
// useContractDetail — Single Contract Hook
// ============================================
// Fetches a contract with milestones, transactions, and counterparty info.
// Falls back to demo data in dev mode.

'use client';

import { useQuery } from '@tanstack/react-query';
import { demoContracts, demoTransactions, demoClients } from '@/lib/demo-data';
import type { Contract, TransactionRecord } from '@/types';

interface ContractDetailResponse {
  contract: Contract;
  transactions: TransactionRecord[];
  counterparty: { display_name: string; xrpl_address: string } | null;
  userRole: 'creator' | 'marketplace';
  mccs?: Record<string, any>;  // milestone_id → MCCRecord from nft_registry
}

async function fetchContractDetail(id: string): Promise<ContractDetailResponse> {
  const res = await fetch(`/api/contracts/${id}`);

  if (!res.ok) {
    throw new Error('Failed to fetch contract');
  }

  return res.json();
}

export function useContractDetail(id: string) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: async () => {
      try {
        return await fetchContractDetail(id);
      } catch {
        // Fallback to demo data
        const contract = demoContracts.find(c => c.id === id);
        if (!contract) throw new Error('Contract not found');

        const transactions = demoTransactions.filter(t => t.contract_id === id);
        const marketplaceName = contract.marketplace_id ? demoClients[contract.marketplace_id] : 'Unknown Marketplace';

        return {
          contract,
          transactions,
          counterparty: { display_name: marketplaceName, xrpl_address: 'rDemo...' },
          userRole: 'creator' as const,
        };
      }
    },
    staleTime: 1000,
    refetchOnWindowFocus: true,  // Auto-refresh when tab regains focus
    refetchInterval: 2 * 1000,  // Poll every 2s — near-instant cross-user updates (MK1 ↔ CR1)
    retry: false,
    enabled: !!id,
  });
}
