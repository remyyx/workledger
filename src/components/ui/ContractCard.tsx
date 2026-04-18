import Link from 'next/link';
import type { Contract } from '@/types';
import { RADIAN_BADGE } from '@/config/constants';
import { formatAmount, formatDate } from '@/lib/utils';

/** Radian badge filter — glow only, no pill. */
function radianGlow(color: string): string {
  const [a, b, c] = RADIAN_BADGE.GLOW_PX;
  return `drop-shadow(0 0 ${a}px ${color}) drop-shadow(0 0 ${b}px ${color}) drop-shadow(0 0 ${c}px ${color})`;
}

/** Color per contract status. */
const STATUS_COLORS: Record<string, string> = {
  draft:     'var(--accent-blue)',
  funded:    'var(--escrow)',
  active:    'var(--status-active)',
  completed: 'var(--status-completed)',
  disputed:  'var(--status-disputed)',
  cancelled: 'var(--text-muted)',
};

/** Display label per status — creator perspective. */
const CREATOR_LABELS: Record<string, string> = {
  draft:     'Draft',
  funded:    'Funded',
  active:    'Active',
  completed: 'Completed',
  disputed:  'Disputed',
  cancelled: 'Cancelled',
};

interface ContractCardProps {
  contract: Contract;
  clientName?: string;
  myRole?: 'creator' | 'marketplace';
}

export default function ContractCard({ contract, clientName, myRole }: ContractCardProps) {
  const milestones = contract.milestones || [];
  const completedMilestones = milestones.filter((m) => m.status === 'released').length;
  const totalMilestones = milestones.length;

  const isDraft = contract.status === 'draft';
  const showFundEscrow = isDraft && myRole === 'marketplace';

  // Radian badge — text + glow only, no pill, no background, no border. Always.
  const badgeLabel = CREATOR_LABELS[contract.status] ?? contract.status.toUpperCase();
  const badgeColor = STATUS_COLORS[contract.status] ?? 'var(--text-muted)';

  return (
    <Link href={`/dashboard/contracts/${contract.id}`} className="card block hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate" style={{ color: 'var(--text)' }}>{contract.title}</h3>
          {clientName && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{clientName}</p>
          )}
          {showFundEscrow && (
            <p className="mt-2">
              <span
                className="shrink-0 whitespace-nowrap inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                style={{
                  color: 'var(--escrow)',
                  backgroundColor: 'var(--escrow-bg)',
                  border: '1px solid var(--escrow)',
                }}
              >
                Fund this escrow
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          {/* Radian badge — glow text only, no pill */}
          <span
            className="text-xs font-bold uppercase tracking-wider shrink-0"
            style={{ color: badgeColor, filter: radianGlow(badgeColor) }}
          >
            {badgeLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium" style={{ color: 'var(--text)' }}>
          {formatAmount(contract.total_amount.toString(), contract.currency)}
        </span>
        {totalMilestones > 0 && (
          <span style={{ color: 'var(--text-muted)' }}>
            {completedMilestones}/{totalMilestones} milestones
          </span>
        )}
      </div>

      {milestones.length > 0 && (
        <div className="mt-3">
          <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: totalMilestones > 0 ? `${(completedMilestones / totalMilestones) * 100}%` : '0%', backgroundColor: 'var(--escrow)' }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="capitalize">{contract.template.replace('_', ' ')}</span>
        <span>Created {formatDate(contract.created_at)}</span>
      </div>
    </Link>
  );
}
