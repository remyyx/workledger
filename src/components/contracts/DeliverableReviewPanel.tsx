'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDate, truncateAddress, formatAmount } from '@/lib/utils';
import type { Milestone } from '@/types';
import { Eye, Copy, AlertCircle, CheckCircle, Lock, Loader2 } from 'lucide-react';

interface DeliverableReviewPanelProps {
  milestone: Milestone;
  contractCurrency: string;
  onApprove: () => void;
  onRequestChanges: () => void;
  onRelease: () => void;
  isProcessing: boolean;
  userRole: 'creator' | 'marketplace';
}

import { PLATFORM } from '@/config/constants';

const PLATFORM_FEE_PERCENT = PLATFORM.FEE_PERCENT;

/** Inline media preview — images render directly, audio/video with controls, others as link. Click opens full size in new tab. */
function MediaPreview({ url }: { url: string }) {
  const lower = url.toLowerCase();
  const isImage = /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(lower);
  const isAudio = /\.(mp3|m4a|wav|ogg|webm)(\?|$)/i.test(lower);
  const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(lower);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="rounded-lg overflow-hidden bg-black/20 max-w-full cursor-pointer hover:opacity-90 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Deliverable preview" className="max-h-72 w-auto object-contain" />
        </div>
        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <Eye size={12} /> Click to open full size
        </p>
      </a>
    );
  }

  if (isAudio) {
    return (
      <div>
        <audio src={url} controls className="w-full max-w-md h-10 rounded-lg" />
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 flex items-center gap-1 hover:underline" style={{ color: 'var(--accent-blue)' }}>
          <Eye size={12} /> Open in new tab
        </a>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div>
        <video src={url} controls className="rounded-lg max-w-full max-h-72" />
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 flex items-center gap-1 hover:underline" style={{ color: 'var(--accent-blue)' }}>
          <Eye size={12} /> Open in new tab
        </a>
      </div>
    );
  }

  // Fallback: just a link
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--accent-blue)' }}>
      <Eye size={14} /> View media file <span style={{ color: 'var(--text-muted)' }}>→</span>
    </a>
  );
}

export default function DeliverableReviewPanel({
  milestone,
  contractCurrency,
  onApprove,
  onRequestChanges,
  onRelease,
  isProcessing,
  userRole,
}: DeliverableReviewPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = () => {
    if (milestone.deliverable_hash) {
      navigator.clipboard.writeText(milestone.deliverable_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate amount after fee
  const amountNum = parseFloat(milestone.amount.toString());
  const feeAmount = amountNum * (PLATFORM_FEE_PERCENT / 100);
  const releaseAmount = amountNum - feeAmount;

  // Determine action buttons based on status and role
  const canApprove = userRole === 'marketplace' && milestone.status === 'submitted';
  const canRequestChanges = userRole === 'marketplace' && milestone.status === 'submitted';
  const canRelease =
    (userRole === 'marketplace' && milestone.status === 'approved') ||
    (userRole === 'creator' && milestone.status === 'approved');
  const showAwaitingReview = userRole === 'creator' && milestone.status === 'submitted';
  const showSubmitButton = userRole === 'creator' && milestone.status === 'funded';

  return (
    <div className="card space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-medium text-text mb-1">Deliverable Review</h2>
        <p className="text-sm text-text-secondary">Milestone {milestone.sequence}: {milestone.title}</p>
      </div>

      {/* Revision history notice */}
      {milestone.changes_requested_at && (
        <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">Revisions Previously Requested</p>
            <p className="text-xs text-text-secondary">
              Changes were requested on {formatDate(milestone.changes_requested_at)}
            </p>
          </div>
        </div>
      )}

      {/* Submission info */}
      {milestone.submitted_at && (
        <div className="border-b border-border pb-6">
          <p className="text-xs font-medium text-text-muted uppercase mb-3">Submission Details</p>
          <p className="text-sm text-text-secondary">
            Submitted on {formatDate(milestone.submitted_at)}
          </p>
        </div>
      )}

      {/* Media preview — inline render + click to open full size */}
      {milestone.deliverable_media_url && (
        <div className="border-b border-border pb-6">
          <p className="text-xs font-medium text-text-muted uppercase mb-3">Media preview</p>
          <MediaPreview url={milestone.deliverable_media_url} />
        </div>
      )}

      {/* Document preview */}
      {milestone.deliverable_doc_url && (
        <div className="border-b border-border pb-6">
          <p className="text-xs font-medium text-text-muted uppercase mb-3">Document</p>
          <a
            href={milestone.deliverable_doc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-accent-blue hover:text-blue-400 transition-colors duration-200"
          >
            <Eye size={14} />
            View document
            <span className="text-text-muted">→</span>
          </a>
        </div>
      )}

      {/* Deliverable hash */}
      {milestone.deliverable_hash && (
        <div className="border-b border-border pb-6">
          <p className="text-xs font-medium text-text-muted uppercase mb-3">Hash Verification</p>
          <div className="bg-bg-elevated border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-muted mb-2">SHA-256 Deliverable Hash</p>
                <p className="font-mono text-xs text-text-secondary break-all selection:bg-accent-blue selection:text-white">
                  {milestone.deliverable_hash}
                </p>
              </div>
              <button
                onClick={handleCopyHash}
                className={cn(
                  'shrink-0 h-9 px-3 rounded-lg flex items-center gap-2 transition-all duration-200',
                  'border border-border hover:bg-bg-inset',
                  copied && 'bg-green-500/20 border-green-500/30'
                )}
              >
                <Copy size={14} />
                <span className="text-xs font-medium">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Cryptographic proof of the submitted work — verify integrity independently
            </p>
          </div>
        </div>
      )}

      {/* Deliverable notes */}
      {milestone.deliverable_notes && (
        <div className="border-b border-border pb-6">
          <p className="text-xs font-medium text-text-muted uppercase mb-3">Notes</p>
          <p className="text-sm text-text-secondary bg-bg-elevated p-4 rounded-lg">
            {milestone.deliverable_notes}
          </p>
        </div>
      )}

      {/* Payment info */}
      <div className="bg-escrow-bg border border-border rounded-lg p-4">
        <p className="text-xs font-medium text-text-muted uppercase mb-3">Payment on Release</p>
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-text-secondary">Amount:</span>
            <span className="font-medium text-text">
              {formatAmount(milestone.amount.toString(), contractCurrency)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-text-secondary">Platform Fee ({PLATFORM_FEE_PERCENT}%):</span>
            <span className="font-mono text-sm text-text-muted">
              -{formatAmount(feeAmount.toString(), contractCurrency)}
            </span>
          </div>
          <div className="border-t border-escrow/30 pt-2 flex justify-between items-baseline">
            <span className="text-sm font-medium text-text">Creator Receives:</span>
            <span className="font-medium text-escrow">
              {formatAmount(releaseAmount.toString(), contractCurrency)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-2 space-y-3">
        {/* Marketplace: Approve + Request Changes (when submitted) */}
        {canApprove && canRequestChanges && (
          <div className="flex gap-3">
            <button
              onClick={onApprove}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#16a34a',
                color: '#fff',
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Approve & Release Funds
                </>
              )}
            </button>
            <button
              onClick={onRequestChanges}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#7f3ac6',
                color: '#fff',
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processing...
                </>
              ) : (
                'Request Changes'
              )}
            </button>
          </div>
        )}

        {/* Marketplace: Release (when approved) */}
        {canRelease && milestone.status === 'approved' && userRole === 'marketplace' && (
          <button
            onClick={onRelease}
            disabled={isProcessing}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--escrow)',
              color: 'white',
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin inline mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Lock size={16} className="inline mr-2" />
                Release Funds (Escrow)
              </>
            )}
          </button>
        )}

        {/* Creator: Awaiting Review */}
        {showAwaitingReview && (
          <div className="flex items-center justify-center gap-2 p-4 bg-status-completed-bg border border-status-completed/30 rounded-lg">
            <Clock size={16} className="text-status-completed animate-pulse" />
            <span className="text-sm font-medium text-status-completed">Awaiting marketplace review...</span>
          </div>
        )}

        {/* Creator: Submit Deliverable button (not in this component, but included for completeness) */}
        {showSubmitButton && (
          <div className="flex items-center gap-2 p-4 bg-accent-blue-bg border border-accent-blue/30 rounded-lg">
            <AlertCircle size={16} className="text-accent-blue" />
            <span className="text-sm font-medium text-accent-blue">Ready to submit your deliverable? Use the deliverable upload form above.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for clock icon (since lucide-react might not have it)
function Clock({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
