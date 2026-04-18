'use client';

import { useState } from 'react';
import { calcFeeBreakdown, formatDisplay } from '@/lib/math';
import { PLATFORM } from '@/config/constants';

interface ReleaseConfirmModalProps {
  isOpen: boolean;
  milestoneTitle: string;
  creatorName: string;
  amount: string | number;
  currency: string;
  onConfirm: () => Promise<void>;
  onRequestChanges: () => void;
  onClose: () => void;
}

export function ReleaseConfirmModal({
  isOpen,
  milestoneTitle,
  creatorName,
  amount,
  currency,
  onConfirm,
  onRequestChanges,
  onClose,
}: ReleaseConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const { total, platformFee, net } = calcFeeBreakdown(amount, PLATFORM.FEE_PERCENT);

  const fmt = (v: string) => `${formatDisplay(v, 2)} ${currency}`;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div
        className="w-full max-w-md mx-4 rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--escrow)' }}>
            Release Funds
          </p>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            {milestoneTitle}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Funds will be released to <strong style={{ color: 'var(--text)' }}>{creatorName}</strong>
          </p>
        </div>

        {/* Grouped numbers */}
        <div className="px-6 py-5">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            {/* Amount row */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Escrow amount</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {fmt(total)}
              </span>
            </div>

            {/* Fee row */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Platform fee ({PLATFORM.FEE_PERCENT}%)
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                − {fmt(platformFee)}
              </span>
            </div>

            {/* Net row — highlighted */}
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Creator receives
              </span>
              <span className="text-base font-bold" style={{ color: 'var(--escrow)' }}>
                {fmt(net)}
              </span>
            </div>
          </div>

          {/* Warning */}
          <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
            This action is final and cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div
          className="px-6 pb-6 flex items-center gap-3"
          style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}
        >
          {/* Request Changes — leftmost, subdued */}
          <button
            onClick={onRequestChanges}
            disabled={loading}
            className="text-sm px-3 py-2 rounded-lg transition-colors"
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
              border: '1px solid var(--border)',
            }}
          >
            Request Changes
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cancel */}
          <button
            onClick={onClose}
            disabled={loading}
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{
              color: 'var(--text)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            Cancel
          </button>

          {/* Confirm Release — primary */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="text-sm font-semibold px-5 py-2 rounded-lg transition-opacity"
            style={{
              background: 'var(--escrow)',
              color: '#000',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Releasing…' : 'Confirm Release'}
          </button>
        </div>
      </div>
    </div>
  );
}
