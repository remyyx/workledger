'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Loader2, AlertCircle, CheckCircle, FileText, Image, Shield, ClipboardCopy, Printer } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import MilestoneRow from '@/components/ui/MilestoneRow';
import MCCMiniPreview from '@/components/ui/MCCMiniPreview';
import type { MCCRecord } from '@/types';
import DeliverableUpload from '@/components/ui/DeliverableUpload';
import { XamanSignModal } from '@/components/xaman/sign-modal';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { useContractDetail, useUser } from '@/hooks';
import { useContractMessages, useSendMessage } from '@/hooks/use-contract-messages';
import ContractTimeline from '@/components/contracts/ContractTimeline';
import MessageComposer from '@/components/contracts/MessageComposer';
import DeliverableReviewPanel from '@/components/contracts/DeliverableReviewPanel';
import RevisionRequestForm from '@/components/contracts/RevisionRequestForm';
import LicenseTermsEditor from '@/components/contracts/LicenseTermsEditor';
import { formatAmount, formatDate, truncateAddress, cn } from '@/lib/utils';
import { PLATFORM } from '@/config/constants';
import { calcFeeBreakdown } from '@/lib/math';
import { useQueryClient } from '@tanstack/react-query';
import type { XamanSignStatus } from '@/hooks/use-xaman-sign';
import type { Milestone } from '@/types';
import { FundEscrowModal } from '@/components/ui/FundEscrowModal';
import { ReleaseConfirmModal } from '@/components/ui/ReleaseConfirmModal';

/** Inline preview for media URL when possible; otherwise link. */
function DeliverablePreview({ url }: { url: string }) {
  const lower = url.toLowerCase();
  const isImage = /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(lower);
  const isAudio = /\.(mp3|m4a|wav|ogg|webm)(\?|$)/i.test(lower);
  const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(lower);
  if (isImage) {
    return (
      <div className="rounded-lg overflow-hidden bg-black/20 max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Deliverable preview" className="max-h-64 w-auto object-contain" />
      </div>
    );
  }
  if (isAudio) {
    return (
      <audio src={url} controls className="w-full max-w-md h-10 rounded-lg" />
    );
  }
  if (isVideo) {
    return (
      <video src={url} controls className="rounded-lg max-w-full max-h-72" />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-brand-400 hover:underline flex items-center gap-1"
    >
      Open media <ExternalLink className="w-3 h-3" />
    </a>
  );
}

/** Persistent display of an uploaded license document in the metadata card. */
function SourceDocBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const lines = text.split('\n').length;

  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });

  const print = () => {
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>License Document</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Courier New',monospace;font-size:11pt;line-height:1.8;color:#111;padding:2.5cm 3cm}
  h1{font-family:Georgia,serif;font-size:14pt;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;margin-bottom:.4cm;padding-bottom:.3cm;border-bottom:1px solid #aaa}
  .meta{font-size:9pt;color:#666;margin-bottom:.8cm}
  pre{white-space:pre-wrap;word-break:break-word;font-size:10.5pt}
  @media print{body{padding:1.5cm 2cm}@page{margin:1.5cm 2cm}}
</style></head><body>
<h1>License Document</h1>
<p class="meta">Printed ${new Date().toLocaleString()}</p>
<pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
<script>window.onload=()=>window.print()<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
          style={{ color: 'var(--text-muted)' }}>
          <FileText size={11} /> License Document
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-normal"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
            {lines} lines
          </span>
        </p>
        <div className="flex items-center gap-2">
          <button onClick={copy}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded hover:opacity-90"
            style={{ color: copied ? '#86efac' : 'var(--accent-blue)', border: '1px solid currentColor', opacity: 0.8 }}>
            <ClipboardCopy size={10} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={print}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded hover:opacity-90"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', opacity: 0.8 }}>
            <Printer size={10} />
            Print
          </button>
        </div>
      </div>

      {/* License text — 600px cap with inner scroll */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <pre className="w-full font-mono text-[11px] px-4 py-4 whitespace-pre-wrap break-words select-text overflow-y-auto"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.75, maxHeight: '589px' }}>
          {text}
        </pre>
      </div>
    </div>
  );
}

function DocumentContentPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lower = url.toLowerCase();
  const isRtf = /\.rtf(\?|$)/i.test(lower);
  const isText =
    /\.(txt|md|markdown|csv|json|log|text)(\?|$)/i.test(lower) ||
    // Some direct endpoints return as text without obvious extension.
    lower.includes('text/plain');

  const isPdf = /\.(pdf)(\?|$)/i.test(lower);

  function rtfToPlainText(rtf: string): string {
    // Best-effort conversion for MVP: remove control words & groups, keep readable text.
    // This is intentionally not a full RTF parser.
    let s = rtf;

    // Normalize common RTF line breaks/tabs
    s = s.replace(/\\par[d]?/gi, '\n');
    s = s.replace(/\\line/gi, '\n');
    s = s.replace(/\\tab/gi, '\t');

    // Unescape braces
    s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');

    // Remove RTF control words (e.g. \b, \i0, \fs24, \u8217?, etc.)
    // Note: This may remove some unicode escape sequences; it's still "do what you can".
    s = s.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');

    // Remove remaining braces used for groups
    s = s.replace(/[{}]/g, '');

    // Drop non-text artifacts
    s = s.replace(/\r/g, '');
    s = s.replace(/[ \t]+\n/g, '\n');

    // Collapse excessive blank lines
    s = s.replace(/\n{4,}/g, '\n\n\n');

    return s.trim();
  }

  useEffect(() => {
    // Best-effort: fetch text files so we can display their "content" in a Courier/monospace card.
    if (!isText && !isRtf) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setText(null);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const body = await res.text();
        if (cancelled) return;

        const contentType = res.headers.get('content-type') || '';
        if (isText) {
          // Only trust/attempt the "render as text" path if it really looks like text.
          if (!contentType.includes('text')) {
            throw new Error(`Not a text response (content-type: ${contentType || 'unknown'})`);
          }
        }

        // Avoid blowing up the UI with huge documents.
        const MAX_CHARS = 20000;
        const trimmed =
          body.length > MAX_CHARS
            ? body.slice(0, MAX_CHARS) + '\n\n[truncated]'
            : body;

        setText(isRtf ? rtfToPlainText(trimmed) : trimmed);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load document text.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, isText]);

  if (isText) {
    if (loading) {
      return (
        <div className="rounded-lg bg-black/20 border border-border p-3">
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            Loading document…
          </p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="rounded-lg bg-black/20 border border-border p-3">
          <p className="text-xs text-red-400">Could not load document content: {error}</p>
          <p className="text-xs text-gray-400 mt-1">Use “Open document” for full view.</p>
        </div>
      );
    }
    if (!text) return null;

    return (
      <div className="rounded-lg bg-black/20 border border-border p-3">
        <pre className="font-mono text-xs text-gray-200 whitespace-pre-wrap break-words max-h-56 overflow-auto">
          {text}
        </pre>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="rounded-lg overflow-hidden border border-border bg-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <iframe src={url} className="w-full h-72" />
      </div>
    );
  }

  // DOC/DOCX and other office formats frequently cannot be rendered directly by browsers.
  // We still show an iframe as best-effort; user can always open the link.
  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden border border-border bg-black/20">
        <iframe src={url} className="w-full h-72" />
      </div>
      <p className="text-xs text-gray-500">
        If the inline preview doesn’t render, use the external link to view the document.
      </p>
    </div>
  );
}

export default function ContractDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useContractDetail(params.id);
  const { data: currentUser } = useUser();
  const { data: messagesData, isLoading: isMessagesLoading } = useContractMessages(params.id);
  const { mutate: sendMessage, isPending: isSendingMessage } = useSendMessage(params.id);
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Xaman modal state for fund/release actions
  const [xamanOpen, setXamanOpen] = useState(false);
  const [xamanStatus, setXamanStatus] = useState<XamanSignStatus>('idle');
  const [xamanQr, setXamanQr] = useState<string | null>(null);
  const [xamanDeeplink, setXamanDeeplink] = useState<string | null>(null);
  const [xamanError, setXamanError] = useState<string | null>(null);
  const [xamanExpires, setXamanExpires] = useState<number | null>(null);
  const [xamanInstruction, setXamanInstruction] = useState('');

  // Deliverable upload modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitMilestoneId, setSubmitMilestoneId] = useState<string | null>(null);

  // Funding choice modal (card / bank / wallet / test)
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [fundMilestone, setFundMilestone] = useState<Milestone | null>(null);

  // Active milestone for review panel
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);

  // Revision request form state
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);

  // Release confirmation modal (marketplace)
  const [releaseModal, setReleaseModal] = useState<{ open: boolean; milestone: any } | null>(null);

  const resetXaman = useCallback(() => {
    setXamanOpen(false);
    setXamanStatus('idle');
    setXamanQr(null);
    setXamanDeeplink(null);
    setXamanError(null);
    setXamanExpires(null);
    setXamanInstruction('');
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['contracts', params.id] }),
      queryClient.refetchQueries({ queryKey: ['contracts'] }),
      queryClient.refetchQueries({ queryKey: ['contract-messages', params.id] }),
    ]);
  }, [queryClient, params.id]);

  /**
   * Handle Xaman-signed actions (fund, release).
   * Flow: POST to get payload → show QR → wait for sign → PATCH with UUID.
   */
  const handleXamanAction = useCallback(async (
    action: 'fund' | 'release',
    milestoneId: string,
    sequence: number
  ) => {
    setActionLoading(`${action}-${milestoneId}`);
    setActionError(null);
    setActionSuccess(null);

    try {
      // 1. Create Xaman payload via POST
      const payloadRes = await fetch(`/api/contracts/${params.id}/milestones/${sequence}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payloadData = await payloadRes.json();

      if (!payloadRes.ok) {
        setActionError(payloadData.error || `Failed to create ${action} payload.`);
        setActionLoading(null);
        return;
      }

      // 2. Show Xaman modal with QR
      setXamanQr(payloadData.qr_png);
      setXamanDeeplink(payloadData.deeplink);
      setXamanInstruction(
        action === 'fund'
          ? `Fund milestone ${sequence}`
          : `Release milestone ${sequence} funds to creator`
      );
      setXamanStatus('pending');
      setXamanOpen(true);

      // 3. Listen for sign via WebSocket
      const ws = new WebSocket(payloadData.websocket);

      ws.onmessage = async (event) => {
        try {
          const wsData = JSON.parse(event.data);

          if (wsData.expires_in_seconds !== undefined) {
            setXamanExpires(wsData.expires_in_seconds);
          }

          if (wsData.signed !== undefined) {
            ws.close();

            if (wsData.signed === true) {
              setXamanStatus('signed');

              // 4. Finalize via PATCH with the signed payload UUID
              const finalRes = await fetch(`/api/contracts/${params.id}/milestones/${sequence}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action,
                  xamanPayloadUuid: payloadData.payloadUuid,
                }),
              });
              const finalData = await finalRes.json();

              if (finalRes.ok) {
                setXamanStatus('success');
                const labels: Record<string, string> = {
                  fund: 'Milestone funded on XRPL',
                  release: 'Funds released to creator',
                };
                setActionSuccess(labels[action] || 'Action completed');
                refreshData();
                setTimeout(() => {
                  setActionSuccess(null);
                  resetXaman();
                }, 2500);
              } else {
                setXamanError(finalData.error || 'Transaction verification failed.');
                setXamanStatus('error');
              }
            } else {
              setXamanStatus('rejected');
            }
          }

          if (wsData.expired) {
            ws.close();
            setXamanStatus('expired');
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        setXamanError('Connection failed. Please try again.');
        setXamanStatus('error');
      };
    } catch (err: any) {
      setActionError(err.message || 'Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [params.id, refreshData, resetXaman]);

  /**
   * Handle non-Xaman actions (submit, approve, dispute).
   * These are simple PATCH calls.
   */
  const handleSimpleAction = useCallback(async (
    action: string,
    milestoneId: string,
    sequence: number,
    extra?: Record<string, any>
  ) => {
    setActionLoading(`${action}-${milestoneId}`);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/contracts/${params.id}/milestones/${sequence}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await res.json();

      if (!res.ok) {
        const detail = result.details ? ` (${result.details})` : '';
        setActionError((result.error || `Failed to ${action} milestone.`) + detail);
        return;
      }

      const labels: Record<string, string> = {
        submit: 'Work submitted for review',
        approve: 'Work approved — ready for release',
        request_changes: 'Modifications requested — please resubmit',
        dispute: 'Dispute opened',
      };
      setActionSuccess(labels[action] || 'Action completed');
      refreshData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch {
      setActionError('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [params.id, refreshData]);

  /**
   * Main action router — decides whether to use Xaman flow or simple PATCH.
   */
  const handleMilestoneAction = useCallback(async (action: string, milestoneId: string) => {
    if (!data?.contract) return;
    const milestone = data.contract.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    // Fund now opens the payment choice modal (card / bank / wallet / test)
    if (action === 'fund') {
      setFundMilestone(milestone as Milestone);
      setFundModalOpen(true);
      return;
    }

    // Release: test-funded milestones use test release API; real escrow uses Xaman
    if (action === 'release') {
      const isTestFunded =
        milestone.escrow_tx_hash && String(milestone.escrow_tx_hash).startsWith('TEST_TX_');
      if (isTestFunded) {
        setActionLoading(`release-${milestoneId}`);
        setActionError(null);
        setActionSuccess(null);
        try {
          const res = await fetch('/api/test/milestones/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contractId: params.id, milestoneId }),
          });
          const json = await res.json();
          if (!res.ok) {
            setActionError(json.error || 'Test release failed.');
            setActionLoading(null);
            return;
          }
          setActionSuccess(json.message || 'Milestone released.');
          refreshData();
        } catch (e: any) {
          setActionError(e?.message || 'Test release failed.');
        } finally {
          setActionLoading(null);
        }
        return;
      }
      handleXamanAction('release', milestoneId, milestone.sequence);
      return;
    }

    // Submit opens the deliverable upload modal
    if (action === 'submit') {
      setSubmitMilestoneId(milestoneId);
      setSubmitModalOpen(true);
      return;
    }

    // Approve and dispute are simple server-side actions
    handleSimpleAction(action, milestoneId, milestone.sequence);
  }, [data?.contract, handleXamanAction, handleSimpleAction, params.id, refreshData]);

  /**
   * Called after files are hashed in the DeliverableUpload modal.
   */
  const handleDeliverableSubmit = useCallback(async (payload: {
    mediaHash: string;
    mediaFileName: string;
    docHash?: string;
    docFileName?: string;
    notes?: string;
    mediaUrl?: string;
    docUrl?: string;
  }) => {
    if (!data?.contract || !submitMilestoneId) return;
    const milestone = data.contract.milestones.find((m) => m.id === submitMilestoneId);
    if (!milestone) return;

    setSubmitModalOpen(false);
    await handleSimpleAction('submit', submitMilestoneId, milestone.sequence, {
      deliverableHash: payload.mediaHash,
      docHash: payload.docHash,
      deliverableNotes: payload.notes || undefined,
      deliverableMediaUrl: payload.mediaUrl || undefined,
      deliverableDocUrl: payload.docUrl || undefined,
    });
    setSubmitMilestoneId(null);
  }, [data?.contract, submitMilestoneId, handleSimpleAction]);

  /**
   * Send a message to the timeline
   */
  const handleSendMessage = useCallback((content: string) => {
    if (!currentUser) return;
    const milestoneId = activeMilestoneId || null;
    sendMessage({
      type: 'message',
      content,
      milestone_id: milestoneId,
    });
  }, [currentUser, activeMilestoneId, sendMessage]);

  /**
   * Handle revision request form submission
   */
  const handleRevisionSubmit = useCallback(async (revisionData: {
    content: string;
    issues: string[];
    severity: 'minor' | 'major' | 'critical';
  }) => {
    if (!currentUser || !activeMilestoneId || !data?.contract) return;
    const milestone = data.contract.milestones.find((m) => m.id === activeMilestoneId);
    if (!milestone) return;

    setRevisionSubmitting(true);
    try {
      // Send revision request as a message
      sendMessage({
        type: 'revision_request',
        content: revisionData.content,
        milestone_id: activeMilestoneId,
        metadata: {
          severity: revisionData.severity,
          issues: revisionData.issues,
          requested_changes: revisionData.content,
        },
      });

      // Also PATCH the milestone to mark changes_requested_at
      await handleSimpleAction('request_changes', activeMilestoneId, milestone.sequence);
      setShowRevisionForm(false);
    } finally {
      setRevisionSubmitting(false);
    }
  }, [currentUser, activeMilestoneId, data?.contract, sendMessage, handleSimpleAction]);

  /**
   * Auto-advance: always track the first non-released milestone.
   * When the current milestone is released, advance to the next one.
   */
  useEffect(() => {
    if (!data?.contract) return;
    const sorted = [...data.contract.milestones].sort((a, b) => a.sequence - b.sequence);
    const firstIncomplete = sorted.find((m) => m.status !== 'released');
    const target = firstIncomplete?.id ?? sorted[sorted.length - 1]?.id ?? null;
    if (target && target !== activeMilestoneId) {
      setActiveMilestoneId(target);
    }
  }, [data?.contract]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <>
        <TopBar title="Contract Detail" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </>
    );
  }

  const contract = data?.contract;
  const transactions = data?.transactions || [];
  const counterparty = data?.counterparty;
  const userRole = data?.userRole || 'creator';
  const contractMCCs: Record<string, MCCRecord> = (data?.mccs as Record<string, MCCRecord>) || {};

  if (!contract) {
    return (
      <>
        <TopBar title="Contract Detail" />
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-gray-500 text-center py-16">Contract not found.</p>
        </div>
      </>
    );
  }

  // escrowedAmount: only currently locked (funded/submitted, not yet released)
  // used by Escrow block "Total locked" line
  const escrowedAmount = contract.milestones
    .filter((m) => m.status === 'funded' || m.status === 'submitted')
    .reduce((sum, m) => sum + m.amount, 0);

  // Get the active milestone
  const activeMilestone = contract.milestones.find((m) => m.id === activeMilestoneId);

  // Get messages for timeline
  const messages = messagesData?.messages || [];

  return (
    <>
      <TopBar title={`Contract: ${contract.title}`} />
      <div className="flex-1 overflow-y-auto bg-bg">
        {/* Back button + header */}
        <div className="px-6 py-4 border-b border-border">
          <Link href="/dashboard/contracts" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
            <ArrowLeft size={16} /> Back to contracts
          </Link>
        </div>

        {/* Action Feedback (inline) */}
        {actionError && (
          <div className="mx-6 mt-4 flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            {actionError}
            <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-300">
              &times;
            </button>
          </div>
        )}
        {actionSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
            <CheckCircle size={16} className="shrink-0" />
            {actionSuccess}
          </div>
        )}

        {/* 2-column layout — left 65% contract flow, right 35% chat + payout */}
        <div className="flex px-6 py-6 gap-0 max-w-[1440px] mx-auto w-full">
          {/* LEFT COLUMN (65%) — 6 permanent blocks, always present */}
          <div className="pr-3" style={{ width: '65%' }}>
            <div className="space-y-6">

            {/* ═══ BLOCK 1: BRIEF — contract identity ═══ */}
            <div className="card">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{contract.title}</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {counterparty?.display_name || 'Counterparty'} · <span className="capitalize">{contract.template.replace(/_/g, ' ')}</span>
                    {contract.description && <span> · {contract.description.length > 80 ? contract.description.slice(0, 80) + '...' : contract.description}</span>}
                  </p>
                </div>
                {(contract.status === 'funded' || contract.status === 'active') ? (
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{
                      color: 'var(--status-active)',
                      filter: 'drop-shadow(0 0 4px var(--status-active)) drop-shadow(0 0 10px var(--status-active)) drop-shadow(0 0 20px var(--status-active))',
                    }}
                  >
                    Active
                  </span>
                ) : (
                  <StatusBadge status={contract.status} />
                )}
              </div>
              <div className="flex items-center gap-6 text-sm border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total </span>
                  <span className="font-semibold">{formatAmount(contract.total_amount.toString(), contract.currency)}</span>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Fee </span>
                  <span className="font-semibold">{PLATFORM.FEE_PERCENT}%</span>
                </div>
                {contract.milestones.length > 0 && contract.milestones[0].deadline && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Due </span>
                    <span className="font-semibold">{formatDate(contract.milestones[0].deadline)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ BLOCK 2: ESCROW — status rows + MilestoneRow buttons merged ═══ */}
            <div
              className="rounded-2xl p-3"
              style={{
                backgroundColor: 'var(--escrow-bg)',
                border: '1px solid var(--separator)',
                borderLeft: '4px solid var(--escrow)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield size={12} style={{ color: 'var(--escrow)' }} />
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--escrow)' }}>Escrow</h3>
              </div>
              <div className="space-y-1.5">
                {(() => {
                  // Sequential funding: only fund the next milestone when ALL previous ones are released.
                  // This prevents M2 FUND showing while M1 is still in submitted/approved state.
                  const sorted = [...contract.milestones].sort((a, b) => a.sequence - b.sequence);
                  const firstNonReleased = sorted.find(m => m.status !== 'released');
                  const nextFundableId = firstNonReleased?.status === 'pending' ? firstNonReleased.id : null;

                  return contract.milestones.map((milestone) => {
                  const isActive = ['funded', 'submitted', 'approved'].includes(milestone.status);
                  const isReleased = milestone.status === 'released';
                  const canFundThis = milestone.id === nextFundableId;
                  // Look up the minted MCC for this milestone from nft_registry (via contract API)
                  const mintedMCC = isReleased
                    ? (contractMCCs[milestone.id] as MCCRecord | undefined) ?? null
                    : null;
                  return (
                    <div
                      key={milestone.id}
                      className="rounded-xl border-l-2 overflow-hidden"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderLeftColor: isReleased ? 'var(--accent-green)' : isActive ? 'var(--escrow)' : 'var(--border)',
                      }}
                    >
                      <MilestoneRow
                        milestone={milestone}
                        currency={contract.currency}
                        userRole={userRole}
                        canFund={canFundThis}
                        onAction={(action, _milestoneId) => {
                          if (action === 'fund') { setFundMilestone(milestone); setFundModalOpen(true); }
                        }}
                      />
                      {/* MCC preview — shown below released milestones when an MCC has been minted */}
                      {mintedMCC && <MCCMiniPreview mcc={mintedMCC} />}
                    </div>
                  );
                });
                })()}
              </div>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--separator)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Total locked</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--escrow-light)' }}>
                    {formatAmount(escrowedAmount.toString(), contract.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* ═══ BLOCK 3: ACTIONS — all buttons always present, only applicable ones active ═══ */}
            {(() => {
              // Sequential: sort by sequence to find the next actionable milestone
              const sortedMs = [...contract.milestones].sort((a, b) => a.sequence - b.sequence);
              const pending = sortedMs.find(m => m.status === 'pending');
              const funded = sortedMs.find(m => m.status === 'funded');
              const submitted = sortedMs.find(m => m.status === 'submitted');
              const approved = sortedMs.find(m => m.status === 'approved');
              const allReleased = sortedMs.every(m => m.status === 'released');

              // Sequential funding: only fund the next milestone when ALL previous ones are released.
              // This prevents the FUND button appearing while an earlier milestone is still in progress.
              const firstNonReleasedMs = sortedMs.find(m => m.status !== 'released');
              const canFund = userRole === 'marketplace' && firstNonReleasedMs?.status === 'pending';
              const canSubmit = userRole === 'creator' && !!funded;
              const canApprove = userRole === 'marketplace' && !!submitted;
              const canRequestChanges = userRole === 'marketplace' && !!submitted;
              const canRelease = userRole === 'marketplace' && !!approved;

              // Context message
              let contextText = '';
              if (allReleased) contextText = 'All milestones completed and released. Contract fulfilled.';
              else if (canFund) contextText = `Fund milestone "${pending!.title}" to start work.`;
              else if (canSubmit) {
                contextText = funded!.changes_requested_at
                  ? `Changes requested on "${funded!.title}".`
                  : `Milestone "${funded!.title}" is funded. Submit your deliverable.`;
              }
              else if (canApprove) contextText = `Review deliverable for "${submitted!.title}". Approve or request changes.`;
              else if (canRelease) contextText = `Milestone "${approved!.title}" approved. Release funds to creator.`;
              else if (submitted && userRole === 'creator') contextText = `Deliverable submitted for "${submitted.title}". Waiting for review.`;
              else if (funded && userRole === 'marketplace') {
                contextText = funded.changes_requested_at
                  ? `Changes requested on "${funded.title}". Waiting for creator to resubmit.`
                  : `Waiting for creator to submit work on "${funded.title}".`;
              }
              else if (pending && userRole === 'creator') contextText = `Waiting for marketplace to fund "${pending.title}".`;
              else if (contract.status === 'draft') contextText = userRole === 'marketplace' ? 'Fund the first milestone to start the contract.' : 'Waiting for marketplace to fund the escrow.';

              // Pill style — used for inactive buttons and secondary active actions
              const btnPill = "px-4 py-1.5 rounded-full text-xs font-semibold transition-all";
              // Solid style — used for the primary CTA (Fund Escrow)
              const btnSolid = "px-5 py-1.5 rounded-full text-sm font-bold transition-all";
              const activeStyle = (color: string, bg: string) => ({
                color, border: `1px solid ${color}`, background: bg, opacity: 1, cursor: 'pointer' as const,
              });
              const inactiveStyle = {
                color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'transparent', opacity: 0.35, cursor: 'default' as const,
              };
              const fundActiveStyle = {
                background: 'var(--accent-fund)', color: '#0A0A0A', border: 'none', opacity: 1, cursor: 'pointer' as const,
                boxShadow: '0 0 12px var(--accent-fund-bg)',
              };
              const fundInactiveStyle = {
                background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', opacity: 0.35, cursor: 'default' as const,
              };

              // Latest revision request for the active milestone (shown inline when changes requested)
              const activeFunded = funded || submitted; // whichever is the current focus
              const latestRevision = activeFunded?.changes_requested_at
                ? [...messages].reverse().find(m => m.type === 'revision_request' && m.milestone_id === activeFunded.id)
                : null;
              const revMeta = latestRevision?.metadata as any;

              return (
                <div className="card">
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text)' }}>Actions</h3>

                  {/* Context text */}
                  {contextText && (
                    <p className="text-sm mb-3" style={{ color: allReleased ? 'var(--accent-green)' : 'var(--text)' }}>{contextText}</p>
                  )}

                  {/* Inline revision details — surfaced from chat so users see it immediately */}
                  {latestRevision && (canSubmit || (funded && userRole === 'marketplace' && funded.changes_requested_at)) && (
                    <div className="rounded-lg p-3 mb-4 border-l-4" style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.08)',
                      borderLeftColor: 'rgb(245, 158, 11)',
                    }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgb(245, 158, 11)' }}>
                        {revMeta?.severity?.toUpperCase() || 'REVISION'} — Changes Requested
                      </p>
                      {revMeta?.issues && revMeta.issues.length > 0 && (
                        <div className="mb-2">
                          {revMeta.issues.map((issue: string, i: number) => (
                            <p key={i} className="text-sm" style={{ color: 'var(--text)' }}>• {issue}</p>
                          ))}
                        </div>
                      )}
                      {revMeta?.requested_changes && (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{revMeta.requested_changes}</p>
                      )}
                      {!revMeta?.issues && !revMeta?.requested_changes && latestRevision.content && (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{latestRevision.content}</p>
                      )}
                    </div>
                  )}

                  {/* Active action only — no inactive ghosts */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {canFund && (
                      <button
                        onClick={() => { if (pending) { setFundMilestone(pending); setFundModalOpen(true); } }}
                        disabled={!!actionLoading}
                        className={btnSolid}
                        style={fundActiveStyle}
                      >
                        FUND
                      </button>
                    )}
                    {canSubmit && (
                      <button
                        onClick={() => { if (funded) { setSubmitMilestoneId(funded.id); setSubmitModalOpen(true); } }}
                        disabled={!!actionLoading}
                        className={btnSolid}
                        style={{ background: '#5b21b6', color: '#fff', border: 'none', opacity: 1, cursor: 'pointer' as const }}
                      >
                        Submit Deliverable
                      </button>
                    )}
                    {canApprove && (
                      <button
                        onClick={() => { if (submitted) handleMilestoneAction('approve', submitted.id); }}
                        disabled={!!actionLoading}
                        className={btnSolid}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', opacity: 1, cursor: 'pointer' as const }}
                      >
                        Approve
                      </button>
                    )}
                    {canRequestChanges && (
                      <button
                        onClick={() => { if (submitted) { setActiveMilestoneId(submitted.id); setShowRevisionForm(true); } }}
                        disabled={!!actionLoading}
                        className={btnPill}
                        style={{ color: '#fff', border: 'none', background: '#5b21b6', opacity: 1, cursor: 'pointer' as const }}
                      >
                        Request Changes
                      </button>
                    )}
                    {canRelease && (
                      <button
                        onClick={() => { if (approved) setReleaseModal({ open: true, milestone: approved }); }}
                        disabled={!!actionLoading}
                        className={btnSolid}
                        style={{ background: '#22c55e', color: '#0A0A0A', border: 'none', opacity: 1, cursor: 'pointer' as const }}
                      >
                        Release Funds
                      </button>
                    )}
                    {allReleased && (
                      <span className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>✓ All milestones released</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ═══ BLOCK 4: REVIEW DELIVERABLE — latest version media player, always present ═══ */}
            <div className="card">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text)' }}>Review Deliverable</h3>

              {(() => {
                const submissions = messages.filter(m => m.type === 'deliverable_submit');
                const latest = submissions[submissions.length - 1];
                const latestMeta = latest?.metadata as any;
                const mediaUrl = latestMeta?.media_url || activeMilestone?.deliverable_media_url;
                const docUrl = latestMeta?.doc_url || activeMilestone?.deliverable_doc_url;
                const hash = latestMeta?.doc_hash || latestMeta?.media_hash || activeMilestone?.deliverable_hash;
                const versionLabel = submissions.length > 0 ? `v${submissions.length}` : null;
                // A deliverable has been submitted if the milestone has a hash or is past "funded" status
                const hasSubmission = !!hash || !!mediaUrl || !!docUrl
                  || (activeMilestone && ['submitted', 'approved', 'released'].includes(activeMilestone.status));

                return (
                  <div className="space-y-4">
                    {/* Media player — shown when media URL exists */}
                    {mediaUrl ? (
                      <div>
                        {versionLabel && (
                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{versionLabel} · {latest ? formatDate(latest.created_at) : ''}</p>
                        )}
                        {/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(mediaUrl) ? (
                          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
                            <div className="rounded-lg overflow-hidden bg-black/20 cursor-pointer hover:opacity-90 transition-opacity">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={mediaUrl} alt="Deliverable" className="w-full max-h-72 object-contain" />
                            </div>
                          </a>
                        ) : /\.(mp3|m4a|wav|ogg)(\?|$)/i.test(mediaUrl) ? (
                          <audio src={mediaUrl} controls className="w-full rounded-lg" />
                        ) : /\.(mp4|webm)(\?|$)/i.test(mediaUrl) ? (
                          <video src={mediaUrl} controls className="w-full rounded-lg max-h-72" />
                        ) : (
                          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--accent-blue)' }}>
                            <ExternalLink size={14} /> View media
                          </a>
                        )}
                      </div>
                    ) : hasSubmission ? (
                      <div className="rounded-lg p-4 border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={16} style={{ color: 'var(--accent-purple)' }} />
                          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Deliverable submitted</p>
                        </div>
                        {activeMilestone?.deliverable_notes && (
                          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{activeMilestone.deliverable_notes}</p>
                        )}
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          File hashed locally (no preview — file storage coming soon)
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg flex items-center justify-center h-32 border border-dashed" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        <p className="text-sm">No deliverable submitted yet</p>
                      </div>
                    )}

                    {/* Doc link */}
                    {docUrl && (
                      <a href={docUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs hover:underline" style={{ color: 'var(--accent-blue)' }}>
                        <ExternalLink size={11} /> Doc: {String(docUrl).slice(0, 32)}...
                      </a>
                    )}

                    {/* SHA-256 */}
                    {hash && (
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        SHA-256: {String(hash).slice(0, 32)}...
                      </p>
                    )}

                    {/* Full review panel — shown when milestone has been submitted (or beyond) */}
                    {activeMilestone && (hasSubmission || submissions.length > 0) && (
                      showRevisionForm ? (
                        <RevisionRequestForm
                          milestoneTitle={activeMilestone.title}
                          milestoneId={activeMilestone.id}
                          onSubmit={handleRevisionSubmit}
                          onCancel={() => setShowRevisionForm(false)}
                          isSubmitting={revisionSubmitting}
                        />
                      ) : (
                        <DeliverableReviewPanel
                          milestone={activeMilestone}
                          contractCurrency={contract.currency}
                          onApprove={() => handleMilestoneAction('approve', activeMilestone.id)}
                          onRequestChanges={() => setShowRevisionForm(true)}
                          onRelease={() => setReleaseModal({ open: true, milestone: activeMilestone })}
                          isProcessing={actionLoading?.includes(activeMilestone.id) || false}
                          userRole={userRole}
                        />
                      )
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ═══ BLOCK 5: METADATA — contract DNA, license terms, on-chain ═══ */}
            <div className="card">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text)' }}>Contract Metadata</h3>

              {/* Contract type + template info */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Type</span>
                  <span className="capitalize text-white">{contract.template.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Currency</span>
                  <span className="text-white">{contract.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Milestones</span>
                  <span className="text-white">{contract.milestones.length}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Platform fee</span>
                  <span className="text-white">{PLATFORM.FEE_PERCENT}%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Created</span>
                  <span className="text-white">{formatDate(contract.created_at)}</span>
                </div>
              </div>

              {/* License terms — inline editor, always visible */}
              <div className="mt-4 pt-4 border-t border-border">
                <LicenseTermsEditor
                  contractId={contract.id}
                  licenseTerms={contract.license_terms}
                  canEdit={true}
                  onSaved={(updated) => {
                    // Optimistically patch the cached contract, then invalidate for a background refetch
                    queryClient.setQueryData(
                      ['contracts', contract.id],
                      (old: any) => old ? { ...old, contract: { ...old.contract, license_terms: updated } } : old
                    );
                    queryClient.invalidateQueries({ queryKey: ['contracts', contract.id] });
                  }}
                />
              </div>

              {/* License source document — full text capture, persisted at upload */}
              {contract.license_terms?.source_doc && (
                <SourceDocBlock text={contract.license_terms.source_doc} />
              )}

              {/* Submitted documents — links from all deliverable submissions */}
              {(() => {
                const docs = messages
                  .filter(m => m.type === 'deliverable_submit')
                  .map((m, idx) => {
                    const meta = m.metadata as any;
                    return {
                      version: `v${idx + 1}`,
                      url: meta?.doc_url || null,
                      hash: meta?.doc_hash || meta?.media_hash || null,
                      date: m.created_at,
                    };
                  })
                  .filter(d => d.url || d.hash);
                if (docs.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Submitted Documents</p>
                    <div className="space-y-3">
                      {docs.map(({ version, url, hash, date }) => (
                        <div key={version} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{version} · {formatDate(date)}</span>
                            {url && (
                              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--accent-blue)' }}>
                                <ExternalLink size={11} /> View doc
                              </a>
                            )}
                          </div>
                          {hash && (
                            <code className="text-[10px] font-mono block" style={{ color: 'var(--text-muted)' }}>
                              SHA-256: {String(hash).slice(0, 24)}…{String(hash).slice(-8)}
                            </code>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Retainer terms */}
              {(contract as any).metadata?.retainer && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Retainer Terms</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Monthly rate</span>
                      <span className="text-white">{(contract as any).metadata.retainer.monthly_amount} {contract.currency}</span>
                    </div>
                    {(contract as any).metadata.retainer.start_date && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Start date</span>
                        <span className="text-white">{(contract as any).metadata.retainer.start_date}</span>
                      </div>
                    )}
                    {(contract as any).metadata.retainer.duration_months > 0 && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Duration</span>
                        <span className="text-white">{(contract as any).metadata.retainer.duration_months} months</span>
                      </div>
                    )}
                    {(contract as any).metadata.retainer.hours_per_month && (
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>Hours/month</span>
                        <span className="text-white">{(contract as any).metadata.retainer.hours_per_month}h</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Integrity Proof — latest submission only, written on-chain at release ── */}
              {(() => {
                const submissions = messages.filter(m => m.type === 'deliverable_submit');
                if (submissions.length === 0) return null;
                const latest = submissions[submissions.length - 1];
                const meta = latest.metadata as any;
                const hashes: { label: string; hash: string }[] = [];
                if (meta?.media_hash) hashes.push({ label: 'media', hash: meta.media_hash });
                if (meta?.doc_hash)   hashes.push({ label: 'doc',   hash: meta.doc_hash });
                if (hashes.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Integrity Proof</p>
                    <div className="space-y-2">
                      {hashes.map(({ label, hash }) => (
                        <div key={label} className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--separator)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(hash)}
                              className="text-[10px] px-2 py-0.5 rounded"
                              style={{ color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', opacity: 0.7 }}
                              title="Copy hash"
                            >
                              copy
                            </button>
                          </div>
                          <code className="text-[10px] font-mono break-all" style={{ color: 'var(--text-secondary)' }}>
                            SHA-256: {hash.length > 32 ? `${hash.slice(0, 24)}…${hash.slice(-8)}` : hash}
                          </code>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                      Final version · written to MCC on-chain at release.
                    </p>
                  </div>
                );
              })()}

              {/* On-chain transactions */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>On-Chain Activity</p>
                {transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">{tx.tx_type.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <StatusBadge status={tx.status} />
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs text-gray-400 font-mono">{truncateAddress(tx.tx_hash)}</code>
                          <ExternalLink size={12} className="text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No on-chain transactions yet.</p>
                )}
              </div>

              {/* Contract hash */}
              {contract.contract_hash && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Contract hash</p>
                  <code className="text-xs font-mono text-gray-400">{contract.contract_hash}</code>
                </div>
              )}
            </div>

            </div>
          </div>

          {/* RIGHT COLUMN (35%) — chat + payout, border-separated, scrolls with page */}
          <div className="border-l border-border pl-3 mt-8 shrink-0" style={{ width: '35%', minWidth: '480px' }}>

            {/* Activity Timeline — framed */}
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Activity Timeline</h3>
              <ContractTimeline
                messages={messages}
                currentUserId={currentUser?.id || ''}
                isLoading={isMessagesLoading}
              />
            </div>

            {/* Message Composer — attached below timeline */}
            <div className="card -mt-px rounded-t-none" style={{ padding: 0, borderTop: '1px solid var(--border)' }}>
              <MessageComposer
                onSend={handleSendMessage}
                isSending={isSendingMessage}
                placeholder="Send a message..."
                milestoneId={activeMilestoneId}
              />
            </div>

            {/* Separator line between chat and financials */}
            <div className="border-t border-border my-10" />

            {/* ═══ BLOCK 7: PAYOUT SUMMARY — per-milestone financial breakdown ═══ */}
            <div
              className="rounded-xl p-4 overflow-x-auto"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text)' }}>Payout Summary</h3>

              {/* Table — min-width prevents card bg from compressing away from the text */}
              <table className="w-full text-xs border-collapse" style={{ minWidth: '420px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left pb-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', width: '1.5rem' }}>#</th>
                    <th className="text-left pb-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Milestone</th>
                    <th className="text-right pb-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Gross</th>
                    <th className="text-right pb-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Fee</th>
                    <th className="text-right pb-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Net</th>
                    <th className="text-right pb-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.milestones.map((m) => {
                    const isPending = m.status === 'pending';
                    const bd = isPending ? null : calcFeeBreakdown(m.amount.toString(), PLATFORM.FEE_PERCENT);
                    const statusColors: Record<string, string> = {
                      pending:   'var(--text-muted)',
                      funded:    'var(--accent-fund)',
                      submitted: '#8B45FF',
                      approved:  'var(--escrow)',
                      released:  'var(--accent-green)',
                      disputed:  '#ef4444',
                    };
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--separator)' }}>
                        <td className="py-2 pr-2 tabular-nums" style={{ color: 'var(--text-muted)' }}>{m.sequence}</td>
                        <td className="py-2 pr-2 max-w-0" style={{ color: 'var(--text)' }}>
                          <span className="block truncate">{m.title}</span>
                        </td>
                        <td className="py-2 pl-2 text-right tabular-nums text-white whitespace-nowrap">
                          {m.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 pl-2 text-right tabular-nums whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {isPending ? '—' : Number(bd!.platformFee).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 pl-2 text-right tabular-nums whitespace-nowrap" style={{ color: isPending ? 'var(--text-muted)' : 'var(--accent-green)' }}>
                          {isPending ? '—' : Number(bd!.net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 pl-2 text-right whitespace-nowrap">
                          <span className="font-bold uppercase tracking-wider" style={{ color: statusColors[m.status] ?? 'var(--text-muted)', fontSize: '10px' }}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(() => {
                    const released = contract.milestones.filter(m => m.status === 'released');
                    const totalGross = contract.milestones.reduce((s, m) => s + m.amount, 0);
                    const totalFee = released.reduce((s, m) => s + parseFloat(calcFeeBreakdown(m.amount.toString(), PLATFORM.FEE_PERCENT).platformFee), 0);
                    const totalNet = released.reduce((s, m) => s + parseFloat(calcFeeBreakdown(m.amount.toString(), PLATFORM.FEE_PERCENT).net), 0);
                    return (
                      <tr style={{ borderTop: '1px solid var(--border)' }}>
                        <td />
                        <td className="pt-3 pb-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>Total</td>
                        <td className="pt-3 pb-1 text-right tabular-nums font-semibold text-white whitespace-nowrap">
                          {totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ color: 'var(--text-muted)' }}>{contract.currency}</span>
                        </td>
                        <td className="pt-3 pb-1 text-right tabular-nums whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {totalFee > 0 ? totalFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="pt-3 pb-1 text-right tabular-nums font-bold whitespace-nowrap" style={{ color: totalNet > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                          {totalNet > 0 ? totalNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td />
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>

              {/* Caption */}
              <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
                Fee and Net totals reflect released milestones only · {PLATFORM.FEE_PERCENT}%
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Xaman Sign Modal — for fund/release actions */}
      <XamanSignModal
        isOpen={xamanOpen}
        onClose={resetXaman}
        status={xamanStatus}
        qrUrl={xamanQr}
        deeplink={xamanDeeplink}
        error={xamanError}
        expiresIn={xamanExpires}
        instruction={xamanInstruction}
        autoCloseDelay={0}
      />

      {/* Deliverable Upload Modal — for submit action */}
      <DeliverableUpload
        isOpen={submitModalOpen}
        onClose={() => { setSubmitModalOpen(false); setSubmitMilestoneId(null); }}
        onSubmit={handleDeliverableSubmit}
      />

      {/* Fund Escrow Modal — choose payment method */}
      {fundMilestone && (
        <FundEscrowModal
          open={fundModalOpen}
          onClose={() => setFundModalOpen(false)}
          amountLabel={formatAmount(fundMilestone.amount.toString(), contract.currency)}
          milestoneLabel={`M${fundMilestone.sequence}: ${fundMilestone.title}`}
          onConfirm={async (method) => {
            // For now:
            // - wallet → existing Xaman flow
            // - test   → test-only API that marks milestone funded
            // - card / bank → placeholder (not yet implemented)
            if (method === 'wallet') {
              await handleXamanAction('fund', fundMilestone.id, fundMilestone.sequence);
            } else if (method === 'test') {
              try {
                setActionLoading(`fund-${fundMilestone.id}`);
                setActionError(null);
                const res = await fetch('/api/test/milestones/fund', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contractId: contract.id,
                    milestoneId: fundMilestone.id,
                  }),
                });
                const data = await res.json();
                if (!res.ok) {
                  setActionError(data.error || 'Test funding failed.');
                } else {
                  setActionSuccess('Milestone funded with StudioLedger test balance.');
                  refreshData();
                  setTimeout(() => setActionSuccess(null), 2500);
                }
              } catch (err: any) {
                setActionError(err.message || 'Network error. Please try again.');
              } finally {
                setActionLoading(null);
              }
            } else {
              setActionError('Card and bank transfer funding are not available in this test build yet.');
            }
            setFundModalOpen(false);
          }}
        />
      )}

      <ReleaseConfirmModal
        isOpen={!!releaseModal?.open}
        milestoneTitle={releaseModal?.milestone?.title ?? ''}
        creatorName={counterparty?.display_name ?? 'Creator'}
        amount={releaseModal?.milestone?.amount ?? 0}
        currency={contract.currency}
        onConfirm={async () => {
          if (!releaseModal?.milestone) return;
          await handleMilestoneAction('release', releaseModal.milestone.id);
          setReleaseModal(null);
        }}
        onRequestChanges={() => {
          if (!releaseModal?.milestone) return;
          setActiveMilestoneId(releaseModal.milestone.id);
          setShowRevisionForm(true);
          setReleaseModal(null);
        }}
        onClose={() => setReleaseModal(null)}
      />
    </>
  );
}
