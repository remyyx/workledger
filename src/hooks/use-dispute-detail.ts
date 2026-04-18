// ============================================
// useDisputeDetail — Dispute Detail Hook
// ============================================
// Fetches full dispute detail with evidence, events, and related contract/milestone.

'use client';

import { useQuery } from '@tanstack/react-query';

interface DisputeDetail {
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
    status: string;
    currency: string;
    total_amount: number;
  };
  milestones: {
    id: string;
    sequence: number;
    title: string;
    amount: number;
    status: string;
  };
  evidence: Array<{
    id: string;
    dispute_id: string;
    submitted_by: string;
    submitted_by_name: string;
    description: string;
    file_hash: string | null;
    file_url: string | null;
    created_at: string;
  }>;
  events: Array<{
    id: string;
    dispute_id: string;
    actor_id: string | null;
    actor_name: string | null;
    action: string;
    from_status: string | null;
    to_status: string | null;
    notes: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
}

interface DisputeDetailResponse {
  dispute: DisputeDetail;
}

async function fetchDisputeDetail(id: string): Promise<DisputeDetailResponse> {
  const res = await fetch(`/api/disputes/${id}`);

  if (!res.ok) {
    throw new Error('Failed to fetch dispute detail');
  }

  return res.json();
}

export function useDisputeDetail(id: string) {
  return useQuery({
    queryKey: ['dispute', id],
    queryFn: () => fetchDisputeDetail(id),
    staleTime: 1000,
    retry: false,
  });
}
