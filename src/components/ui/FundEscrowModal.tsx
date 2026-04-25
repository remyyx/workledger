'use client';

import * as React from 'react';
import { X } from 'lucide-react';

type PaymentMethod = 'card' | 'bank' | 'wallet' | 'test';

interface FundEscrowModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => Promise<void> | void;
  amountLabel: string;
  milestoneLabel?: string;
}

const METHODS: { id: PaymentMethod; label: string; description: string }[] = [
  {
    id: 'card',
    label: 'Bank card',
    description: 'Pay with debit or credit card. Secure and instant once processed.',
  },
  {
    id: 'bank',
    label: 'Bank transfer',
    description: 'Send a wire / SEPA / SWIFT transfer. Escrow is funded once funds settle.',
  },
  {
    id: 'wallet',
    label: 'Crypto wallet',
    description: 'Use an XRPL-compatible wallet. StudioLedger handles the escrow transaction.',
  },
  {
    id: 'test',
    label: 'StudioLedger test balance',
    description: 'Use a virtual test balance to simulate funding. No real money moves.',
  },
];

export function FundEscrowModal({
  open,
  onClose,
  onConfirm,
  amountLabel,
  milestoneLabel,
}: FundEscrowModalProps) {
  const [selected, setSelected] = React.useState<PaymentMethod>('card');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSelected('card');
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(selected);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border shadow-xl p-6 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Fund this escrow
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Choose how you want to fund this milestone. XRPL runs in the background – no wallet is required to start.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--bg-elevated)] text-xs"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rounded-xl border px-4 py-3 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {milestoneLabel && (
              <div className="font-medium mb-0.5" style={{ color: 'var(--text)' }}>
                {milestoneLabel}
              </div>
            )}
            <div>Escrow amount</div>
          </div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {amountLabel}
          </div>
        </div>

        <div className="space-y-2">
          {METHODS.map((m) => {
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                className={`w-full flex items-start gap-3 rounded-xl px-3 py-2 text-left border transition ${
                  isSelected
                    ? 'border-[var(--escrow)] bg-[var(--escrow-bg)]'
                    : 'border-[var(--border)] hover:border-[var(--escrow)]/70 hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <div
                  className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-[var(--escrow)] bg-[var(--escrow)]' : 'border-[var(--text-muted)]'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--bg-surface)' }} />}
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                    {m.label}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {m.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 gap-3">
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            You can connect cards, bank accounts and wallets later from the Payments page.
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="h-9 px-4 text-xs font-semibold uppercase tracking-wider rounded-full border hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--escrow)',
              color: '#35281c',
              borderColor: '#35281c',
            }}
          >
            {submitting ? 'Working…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

