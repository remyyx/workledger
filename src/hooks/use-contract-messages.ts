// ============================================
// useContractMessages — Contract Timeline Hook
// ============================================
// Fetches and subscribes to contract messages.
// Supports Supabase Realtime for live updates.

'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ContractMessage, MessageType } from '@/types';

interface MessagesResponse {
  messages: ContractMessage[];
}

async function fetchMessages(contractId: string, milestoneId?: string): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (milestoneId) params.set('milestone_id', milestoneId);

  const res = await fetch(`/api/contracts/${contractId}/messages?${params}`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export function useContractMessages(contractId: string | null, milestoneId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['contract-messages', contractId, milestoneId || 'all'],
    queryFn: () => fetchMessages(contractId!, milestoneId),
    enabled: !!contractId,
    staleTime: 1000, // 1s — messages are time-sensitive
    refetchInterval: 2 * 1000, // Poll every 2s — matches contract detail for near-instant cross-user updates
    retry: false,
  });

  // Supabase Realtime subscription for instant updates
  useEffect(() => {
    if (!contractId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${contractId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contract_messages',
          filter: `contract_id=eq.${contractId}`,
        },
        () => {
          // Invalidate cache to refetch with sender info
          queryClient.invalidateQueries({
            queryKey: ['contract-messages', contractId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contractId, queryClient]);

  return query;
}

/**
 * Mutation hook for sending messages.
 */
export function useSendMessage(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      type: 'message' | 'revision_request';
      content: string;
      milestone_id?: string | null;
      attachments?: Array<{ name: string; url: string; hash: string | null; size: number; mime_type: string }>;
      metadata?: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/contracts/${contractId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send message');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['contract-messages', contractId],
      });
    },
  });
}
