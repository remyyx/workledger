'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, Upload } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/LoadingSkeleton';
import { useDisputeDetail, useUser } from '@/hooks';
import { formatDate, formatAmount, cn } from '@/lib/utils';

interface DisputePageProps {
  params: { id: string };
}

export default function DisputePage({ params }: DisputePageProps) {
  const { id } = params;
  const { data: disputeData, isLoading } = useDisputeDetail(id);
  const { data: user } = useUser();
  const dispute = disputeData?.dispute;

  const [resolution, setResolution] = useState<'creator_wins' | 'marketplace_wins' | 'compromise'>('creator_wins');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);

  const isAdmin = user?.is_admin === true;
  const isResolved = dispute?.status === 'resolved';

  const handleResolveDispute = async () => {
    if (!notes.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/disputes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to resolve dispute'}`);
        return;
      }

      alert('Dispute resolved successfully');
      // Refresh dispute data
      window.location.reload();
    } catch (error) {
      alert('Error resolving dispute');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!evidenceDescription.trim()) return;

    setIsSubmittingEvidence(true);
    try {
      const response = await fetch(`/api/disputes/${id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: evidenceDescription,
          file_url: null,
          file_hash: null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to submit evidence'}`);
        return;
      }

      alert('Evidence submitted successfully');
      setEvidenceDescription('');
      // Refresh dispute data
      window.location.reload();
    } catch (error) {
      alert('Error submitting evidence');
      console.error(error);
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <TopBar title="Dispute Details" />
        <div className="flex-1 overflow-y-auto p-6">
          <SkeletonCard />
        </div>
      </>
    );
  }

  if (!dispute) {
    return (
      <>
        <TopBar title="Dispute Details" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Dispute not found.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Dispute Details" />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Back Button */}
        <Link
          href="/dashboard/disputes"
          className="flex items-center gap-2 mb-6 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} />
          Back to Disputes
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Dispute Info & Evidence */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dispute Header Card */}
            <div
              className="p-6 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                    {dispute.contracts?.title}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Milestone: {dispute.milestones?.title}
                  </p>
                </div>
                <StatusBadge status={dispute.status} />
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Raised By
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {dispute.raised_by_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Reason
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {dispute.reason}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Amount in Dispute
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {formatAmount(String(dispute.milestones?.amount || 0), dispute.contracts?.currency || 'RLUSD')}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Created
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(dispute.created_at)}
                  </p>
                </div>
                {dispute.resolved_at && (
                  <div>
                    <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Resolved
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(dispute.resolved_at)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Evidence Section */}
            <div
              className="p-6 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
                Evidence ({dispute.evidence?.length || 0})
              </h3>

              {dispute.evidence && dispute.evidence.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {dispute.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {ev.submitted_by_name} • {formatDate(ev.created_at)}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--text)' }}>
                        {ev.description}
                      </p>
                      {ev.file_url && (
                        <a
                          href={ev.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs mt-2 inline-flex items-center gap-1"
                          style={{ color: 'var(--accent-blue)' }}
                        >
                          View File
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  No evidence submitted yet.
                </p>
              )}

              {/* Submit Evidence Form (if not resolved) */}
              {!isResolved && (
                <div className="pt-4 border-t border-border">
                  <label className="text-xs uppercase tracking-wider font-medium block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Add Evidence
                  </label>
                  <textarea
                    value={evidenceDescription}
                    onChange={(e) => setEvidenceDescription(e.target.value)}
                    placeholder="Describe the evidence supporting your position..."
                    className="w-full p-3 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2"
                    rows={4}
                    style={{
                      backgroundColor: 'var(--bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                      '--tw-ring-color': 'var(--accent-blue)',
                    } as React.CSSProperties}
                  />
                  <button
                    onClick={handleSubmitEvidence}
                    disabled={!evidenceDescription.trim() || isSubmittingEvidence}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--accent-blue)',
                      color: 'white',
                    }}
                  >
                    {isSubmittingEvidence ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Submit Evidence
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Events Timeline */}
            <div
              className="p-6 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
                Timeline
              </h3>
              <div className="space-y-3">
                {dispute.events && dispute.events.length > 0 ? (
                  dispute.events.map((ev, idx) => (
                    <div key={ev.id} className="flex gap-3">
                      <div
                        className="w-2 h-2 mt-2 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--accent-blue)' }}
                      />
                      <div className="flex-1 min-w-0 pb-3 border-b border-border last:border-b-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                            {ev.action}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatDate(ev.created_at)}
                          </p>
                        </div>
                        {ev.actor_name && (
                          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                            {ev.actor_name}
                          </p>
                        )}
                        {ev.notes && (
                          <p className="text-xs" style={{ color: 'var(--text)' }}>
                            {ev.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No events yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Admin Review Panel */}
          {isAdmin && !isResolved && (
            <div
              className="p-6 rounded-xl border h-fit"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
                Resolve Dispute
              </h3>

              <div className="space-y-4">
                {/* Resolution Option */}
                <div>
                  <label className="text-xs uppercase tracking-wider font-medium block mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Resolution
                  </label>
                  <div className="space-y-2">
                    {(['creator_wins', 'marketplace_wins', 'compromise'] as const).map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="resolution"
                          value={option}
                          checked={resolution === option}
                          onChange={(e) => setResolution(e.target.value as typeof resolution)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm capitalize" style={{ color: 'var(--text)' }}>
                          {option.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="text-xs uppercase tracking-wider font-medium block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Review Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Document your review reasoning..."
                    className="w-full p-3 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2"
                    rows={5}
                    style={{
                      backgroundColor: 'var(--bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)',
                      '--tw-ring-color': 'var(--accent-blue)',
                    } as React.CSSProperties}
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleResolveDispute}
                  disabled={!notes.trim() || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-opacity disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--escrow)',
                    color: 'white',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Resolve Dispute
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Right Column: View Resolution (if resolved) */}
          {isResolved && (
            <div
              className="p-6 rounded-xl border h-fit"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border)',
              }}
            >
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>
                Resolution
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    Outcome
                  </p>
                  <p className="text-sm font-medium capitalize mt-1" style={{ color: 'var(--text)' }}>
                    {dispute.resolution?.replace('_', ' ')}
                  </p>
                </div>

                {/* Look for resolved event to show notes */}
                {dispute.events?.find((e) => e.action === 'resolved')?.notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Notes
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {dispute.events.find((e) => e.action === 'resolved')?.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
