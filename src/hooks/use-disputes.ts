// ============================================
// useDisputes — Dispute List Hook
// ============================================
// Fetches disputes for the authenticated user or all disputes if admin.
// Supports optional status filter.

'use client';

import { useQuery } from '@tanstack/react-query';

interface Dispute {
  id: string;
  contract_id: string;
  milestone_id: string;
  raised_by: string;
  raised_by_name: string;
  reason: string;
  status: 'open' | 'evidence' | 'review' | 'resolved';
  resolution: 'creator_wins' | 'marketplace_wins' | 'compromise' | null;
  arbitrator_id: string | null;
  created_at: string;
  resolved_at: string | null;
  contracts: {
    id: string;
    title: string;
    creator_id: string;
    marketplace_id: string;
  };
  milestones: {
    id: string;
    title: string;
  };
}

interface DisputesResponse {
  disputes: Dispute[];
  pagination: {
    total: number;
  };
}

async function fetchDisputes(status?: string): Promise<DisputesResponse> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);

  const res = await fetch(`/api/disputes?${params}`);

  if (!res.ok) {
    throw new Error('Failed to fetch disputes');
  }

  return res.json();
}

export function useDisputes(status?: string) {
  return useQuery({
    queryKey: ['disputes', status || 'all'],
    queryFn: () => fetchDisputes(status),
    staleTime: 1000,
    retry: false,
  });
}
