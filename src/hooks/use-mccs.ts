// ============================================
// useMCCs — Minted Craft Credential Portfolio Hook
// ============================================
// Fetches MCC tokens owned by the current user with optional taxon filter.
// The API handles dev-mode demo data filtered by the active dev user's role.

'use client';

import { useQuery } from '@tanstack/react-query';
import type { MCCRecord, MCCTaxon } from '@/types';

interface MCCsResponse {
  mccs: MCCRecord[];
  grouped: {
    workCredentials: MCCRecord[];
    licenses: MCCRecord[];
    accessPasses: MCCRecord[];
    clientCompletions: MCCRecord[];
  };
  total: number;
}

async function fetchMCCs(taxon?: number): Promise<MCCsResponse> {
  const params = new URLSearchParams();
  if (taxon) params.set('taxon', String(taxon));

  const res = await fetch(`/api/mccs?${params}`);

  if (!res.ok) {
    throw new Error('Failed to fetch credentials');
  }

  return res.json();
}

export function useMCCs(taxon?: MCCTaxon) {
  return useQuery({
    queryKey: ['mccs', taxon || 'all'],
    queryFn: () => fetchMCCs(taxon),
    staleTime: 1000,
    retry: false,
  });
}
