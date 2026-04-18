// ============================================
// useDashboardStats — Aggregated Stats Hook
// ============================================
// Fetches dashboard summary statistics.
// Falls back to demo stats in dev mode.

'use client';

import { useQuery } from '@tanstack/react-query';
import { demoStats } from '@/lib/demo-data';

interface DashboardStats {
  totalEarned: string;
  activeContracts: number;
  completedContracts: number;
  totalContracts: number;
  escrowHeld: string;
  mccs: {
    total: number;
    workCredentials: number;
    licenses: number;
    accessPasses: number;
  };
  completedJobs: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats');

  if (!res.ok) {
    throw new Error('Failed to fetch stats');
  }

  const data = await res.json();
  return data.stats;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      try {
        return await fetchDashboardStats();
      } catch {
        // Fallback to demo stats
        return {
          totalEarned: demoStats.totalEarned,
          activeContracts: demoStats.activeContracts,
          completedContracts: demoStats.completedJobs,
          totalContracts: 4,
          escrowHeld: demoStats.escrowHeld,
          mccs: { total: demoStats.workCredentials, workCredentials: 2, licenses: 1, accessPasses: 1 },
          completedJobs: demoStats.completedJobs,
        };
      }
    },
    staleTime: 1000,
    retry: false,
  });
}
