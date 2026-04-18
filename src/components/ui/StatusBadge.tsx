import { cn } from '@/lib/utils';
import { RADIAN_BADGE } from '@/config/constants';

// ── Radian badge — glow text only, no pill, no background, no border ──────────
// Rule: radian badge alone = correct. Any card or pill behind = wrong.
// Used for: contract status, milestone status, transaction status — everywhere.

const STATUS_COLORS: Record<string, string> = {
  // Contract statuses
  draft:     'var(--accent-blue)',
  funded:    'var(--escrow)',
  active:    'var(--status-active)',
  completed: 'var(--status-completed)',
  disputed:  'var(--status-disputed)',
  cancelled: 'var(--text-muted)',
  // Milestone statuses
  pending:   'var(--text-muted)',
  submitted: '#8B45FF',
  approved:  'var(--escrow)',
  released:  'var(--status-completed)',
  // Transaction statuses
  confirmed: 'var(--status-completed)',
  failed:    'var(--status-disputed)',
};

function buildRadianFilter(color: string): string {
  const [a, b, c] = RADIAN_BADGE.GLOW_PX;
  return `drop-shadow(0 0 ${a}px ${color}) drop-shadow(0 0 ${b}px ${color}) drop-shadow(0 0 ${c}px ${color})`;
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? 'var(--text-muted)';
  const filter = buildRadianFilter(color);

  return (
    <span
      className={cn('text-xs font-bold uppercase tracking-wider', className)}
      style={{ color, filter }}
    >
      {status}
    </span>
  );
}
