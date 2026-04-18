import type { Milestone } from '@/types';
import StatusBadge from './StatusBadge';
import { formatAmount, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, Upload, Clock, AlertTriangle } from 'lucide-react';

interface MilestoneRowProps {
  milestone: Milestone;
  currency: string;
  userRole?: 'creator' | 'marketplace';
  onAction?: (action: string, milestoneId: string) => void;
  loading?: boolean;
  /** When false, hides the FUND button even if milestone is pending. Used for sequential funding. */
  canFund?: boolean;
}

// Status-based colors using CSS variables where possible
const sequenceColors: Record<string, string> = {
  released: 'bg-green-500 text-white',
  approved: 'bg-blue-500 text-white',
  submitted: 'bg-purple-500 text-white',
  funded: 'bg-yellow-500 text-white',
  pending: 'bg-surface-alt text-gray-400',
  disputed: 'bg-red-500 text-white',
};

// Role-aware status hint messages
function getStatusHint(status: string, role?: string): { text: string; icon: React.ReactNode } | null {
  if (!role) return null;

  if (role === 'creator') {
    switch (status) {
      case 'funded': return { text: 'Ready to submit your work', icon: <Upload size={11} /> };
      case 'submitted': return { text: 'Awaiting review', icon: <Clock size={11} /> };
      case 'approved': return { text: 'Approved — awaiting release', icon: <CheckCircle size={11} /> };
      case 'released': return { text: 'Payment released', icon: <CheckCircle size={11} /> };
      case 'disputed': return { text: 'Under dispute', icon: <AlertTriangle size={11} /> };
      default: return null;
    }
  } else {
    switch (status) {
      case 'pending': return { text: 'Awaiting funding', icon: <Clock size={11} /> };
      case 'funded': return { text: 'Creator working', icon: <Clock size={11} /> };
      case 'submitted': return { text: 'Ready for your review', icon: <Upload size={11} /> };
      case 'approved': return { text: 'Ready to release funds', icon: <CheckCircle size={11} /> };
      case 'released': return { text: 'Funds released', icon: <CheckCircle size={11} /> };
      case 'disputed': return { text: 'Under dispute', icon: <AlertTriangle size={11} /> };
      default: return null;
    }
  }
}

// Determine which action button to show based on milestone status and user role
type ActionConfig = { label: string; action: string };

function getActions(status: string, role?: string, canFund = true): ActionConfig[] {
  if (!role) return [];

  // Marketplace buyer can fund pending milestones (only the next in sequence)
  if (role === 'marketplace' && status === 'pending' && canFund) {
    return [{ label: 'FUND', action: 'fund' }];
  }
  // Creator submits work via the Actions block — no inline button needed.
  // The MilestoneRow just shows a "Submit Work" label (non-interactive).
  // Submitted — no inline buttons, actions live in Review panel
  // Approved — no inline button, Release Funds lives in Actions block

  return [];
}

export default function MilestoneRow({ milestone, currency, userRole, onAction, loading, canFund = true }: MilestoneRowProps) {
  const actions = onAction ? getActions(milestone.status, userRole, canFund) : [];
  const hint = getStatusHint(milestone.status, userRole);

  // Progress bar: visual indicator of how far along this milestone is
  const progressMap: Record<string, number> = {
    pending: 0,
    funded: 25,
    submitted: 50,
    approved: 75,
    released: 100,
    disputed: 50,
  };
  const progress = progressMap[milestone.status] || 0;

  return (
    <div className="rounded-xl p-4 transition-all hover:scale-[1.005]"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-4">
        {/* Sequence circle */}
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
            sequenceColors[milestone.status] || sequenceColors.pending
          )}
        >
          {milestone.status === 'released' ? '✓' : milestone.sequence}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{milestone.title}</p>
          <div className="flex items-center gap-3 mt-1">
            {milestone.deadline && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Due {formatDate(milestone.deadline)}</p>
            )}
            {hint && (
              <span className="flex items-center gap-1 text-[11px]" style={{
                color: milestone.status === 'submitted' && userRole === 'marketplace' ? 'var(--accent-blue)' :
                       milestone.status === 'disputed' ? 'rgb(239,68,68)' :
                       milestone.status === 'released' ? 'rgb(34,197,94)' : 'var(--text-muted)',
              }}>
                {hint.icon} {hint.text}
              </span>
            )}
          </div>
        </div>

        {/* Status label for creator: non-interactive "Submit Work" pill when funded */}
        {userRole === 'creator' && milestone.status === 'funded' && (
          <span
            className="text-xs font-semibold py-1 px-3 rounded-full select-none"
            style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa', cursor: 'default' }}
          >
            Submit Work
          </span>
        )}

        {/* Amount */}
        <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--text)' }}>
          {formatAmount(milestone.amount.toString(), currency)}
        </span>

        {/* Status or FUND CTA */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {actions.some(a => a.action === 'fund') && onAction ? (
            <button
              onClick={() => onAction('fund', milestone.id)}
              disabled={loading}
              className="px-5 py-1.5 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                background: 'var(--accent-fund)',
                color: '#0A0A0A',
                border: 'none',
                boxShadow: '0 0 10px var(--accent-fund-bg)',
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : 'FUND'}
            </button>
          ) : (
            <>
              <StatusBadge status={milestone.status} />
              {milestone.status === 'funded' && milestone.changes_requested_at && (
                <p className="text-[11px] whitespace-nowrap" style={{ color: 'var(--accent-blue)' }}>Changes requested</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {milestone.status !== 'released' && milestone.status !== 'pending' && (
        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: milestone.status === 'disputed' ? 'rgb(239,68,68)' : 'var(--accent-blue)',
            }}
          />
        </div>
      )}
    </div>
  );
}
